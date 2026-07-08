const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const ROOT_DIR = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT_DIR, "database", "DD2_Master.db");
const EXPORT_DIR = path.join(ROOT_DIR, "database", "exports");
const APP_DATA_DIR = path.join(ROOT_DIR, "app", "public", "data");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(dirPath, fileName, data) {
  ensureDir(dirPath);
  const filePath = path.join(dirPath, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  console.log(`Export geschreven: ${path.relative(ROOT_DIR, filePath)}`);
}

function tableExists(db, tableName) {
  const row = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`).get(tableName);
  return Boolean(row);
}

function all(db, sql, params = []) {
  return db.prepare(sql).all(params);
}

function exportRouteObjectives(db) {
  if (!tableExists(db, "route_objectives")) {
    return {
      objective_engine_version: 1,
      generated_at: new Date().toISOString(),
      route_profiles: [],
      objectives: [],
      step_rules: [],
      warnings: ["route_objectives table bestaat nog niet; run tools/import_route_objectives.js eerst."],
    };
  }

  const objectives = all(db, `
    SELECT
      ro.objective_id,
      r.route_key,
      r.name AS route_name,
      s.step_key,
      COALESCE(s.step_order, ro.sort_order) AS step_order,
      ro.objective_key,
      ro.sort_order,
      ro.title,
      ro.summary,
      COALESCE(ro.instruction, s.instruction) AS instruction,
      ro.objective_type,
      ro.route_stage,
      ro.importance,
      ro.is_required,
      ro.is_op_critical,
      ro.skip_for_fast_route,
      ro.vocation_keys,
      ro.spoiler_level,
      ro.why_text,
      ro.next_hint,
      l.location_key,
      l.name AS location_name,
      l.world_x,
      l.world_y,
      src.source_key,
      ro.notes
    FROM route_objectives ro
    JOIN op_routes r ON r.route_id = ro.route_id
    LEFT JOIN op_route_steps s ON s.step_id = ro.step_id
    LEFT JOIN locations l ON l.location_id = s.location_id
    LEFT JOIN sources src ON src.source_id = ro.source_id
    ORDER BY r.sort_order, r.route_key, COALESCE(s.step_order, ro.sort_order), ro.objective_key
  `);

  for (const objective of objectives) {
    objective.actions = all(db, `
      SELECT
        roa.action_key,
        roa.sort_order,
        roa.action_type,
        roa.label,
        roa.details,
        roa.entity_type,
        roa.entity_key,
        l.location_key,
        l.name AS location_name,
        i.item_key,
        i.name AS item_name,
        q.quest_key,
        q.name AS quest_name,
        n.npc_key,
        n.name AS npc_name,
        v.vocation_key,
        v.name AS vocation_name,
        roa.is_required,
        roa.blocks_completion,
        roa.grants_flag_key,
        roa.spoiler_level,
        src.source_key,
        roa.notes
      FROM route_objective_actions roa
      LEFT JOIN locations l ON l.location_id = roa.location_id
      LEFT JOIN items i ON i.item_id = roa.item_id
      LEFT JOIN quests q ON q.quest_id = roa.quest_id
      LEFT JOIN npcs n ON n.npc_id = roa.npc_id
      LEFT JOIN vocations v ON v.vocation_id = roa.vocation_id
      LEFT JOIN sources src ON src.source_id = roa.source_id
      WHERE roa.objective_id = ?
      ORDER BY roa.sort_order, roa.action_key
    `, [objective.objective_id]);

    objective.decisions = all(db, `
      SELECT
        rd.decision_key,
        rd.sort_order,
        rd.question,
        rd.recommended_choice,
        rd.fast_route_advice,
        rd.completionist_advice,
        rd.skip_advice,
        rd.spoiler_level,
        src.source_key,
        rd.notes
      FROM route_decisions rd
      LEFT JOIN sources src ON src.source_id = rd.source_id
      WHERE rd.objective_id = ?
      ORDER BY rd.sort_order, rd.decision_key
    `, [objective.objective_id]);

    objective.step_links = all(db, `
      SELECT
        s.step_key,
        ros.relation_type,
        ros.sort_order,
        ros.is_primary,
        ros.notes
      FROM route_objective_steps ros
      JOIN op_route_steps s ON s.step_id = ros.step_id
      WHERE ros.objective_id = ?
      ORDER BY ros.sort_order, s.step_key
    `, [objective.objective_id]);

    objective.requirements = objective.step_key ? all(db, `
      SELECT
        rsr.requirement_type,
        rsr.requirement_key,
        rsr.operator,
        rsr.requirement_value,
        rsr.logic_group,
        rsr.is_hard_requirement,
        rsr.notes
      FROM route_step_requirements rsr
      JOIN op_route_steps s ON s.step_id = rsr.step_id
      JOIN op_routes r ON r.route_id = s.route_id
      WHERE r.route_key = ? AND s.step_key = ?
      ORDER BY logic_group, requirement_type, requirement_key
    `, [objective.route_key, objective.step_key]) : [];

    objective.rewards = objective.step_key ? all(db, `
      SELECT
        rsr.reward_type,
        rsr.reward_key,
        rsr.reward_amount,
        rsr.notes
      FROM route_step_rewards rsr
      JOIN op_route_steps s ON s.step_id = rsr.step_id
      JOIN op_routes r ON r.route_id = s.route_id
      WHERE r.route_key = ? AND s.step_key = ?
      ORDER BY reward_type, reward_key
    `, [objective.route_key, objective.step_key]) : [];

    objective.items = objective.step_key ? all(db, `
      SELECT i.item_key, i.name, rsi.relation_type, rsi.quantity, rsi.notes
      FROM route_step_items rsi
      JOIN op_route_steps s ON s.step_id = rsi.step_id
      JOIN op_routes r ON r.route_id = s.route_id
      JOIN items i ON i.item_id = rsi.item_id
      WHERE r.route_key = ? AND s.step_key = ?
      ORDER BY rsi.relation_type, i.item_key
    `, [objective.route_key, objective.step_key]) : [];

    if (tableExists(db, "entity_map_points")) {
      objective.exact_points = all(db, `
        SELECT
          emp.point_key,
          emp.entity_type,
          emp.entity_key,
          r.route_key,
          s.step_key,
          l.location_key,
          l.name AS location_name,
          emp.name,
          emp.world_x,
          emp.world_y,
          emp.relation_type,
          emp.accuracy_level,
          emp.accuracy_score,
          emp.route_priority,
          emp.is_primary,
          emp.is_verified,
          emp.spoiler_level,
          emp.notes,
          src.source_key
        FROM entity_map_points emp
        LEFT JOIN op_routes r ON r.route_id = emp.route_id
        LEFT JOIN op_route_steps s ON s.step_id = emp.step_id
        LEFT JOIN locations l ON l.location_id = emp.location_id
        LEFT JOIN sources src ON src.source_id = emp.source_id
        WHERE s.step_key = ? AND r.route_key = ?
        ORDER BY emp.is_primary DESC, emp.route_priority DESC, emp.point_key
      `, [objective.step_key, objective.route_key]);
    } else {
      objective.exact_points = [];
    }

    delete objective.objective_id;
  }

  const routeProfiles = tableExists(db, "vocation_route_profiles") ? all(db, `
    SELECT
      vrp.profile_key,
      vrp.name,
      r.route_key,
      v.vocation_key,
      v.name AS vocation_name,
      vrp.playstyle_key,
      vrp.is_default,
      vrp.coverage_status,
      vrp.priority_bias,
      vrp.description,
      vrp.sort_order,
      vrp.notes
    FROM vocation_route_profiles vrp
    LEFT JOIN op_routes r ON r.route_id = vrp.route_id
    LEFT JOIN vocations v ON v.vocation_id = vrp.vocation_id
    ORDER BY vrp.sort_order, vrp.profile_key
  `) : [];

  const stepRules = tableExists(db, "vocation_route_step_rules") ? all(db, `
    SELECT
      vrp.profile_key,
      r.route_key,
      s.step_key,
      vrsr.rule_key,
      vrsr.include_mode,
      vrsr.priority_delta,
      vrsr.required_override,
      vrsr.objective_tag,
      vrsr.notes
    FROM vocation_route_step_rules vrsr
    JOIN vocation_route_profiles vrp ON vrp.vocation_route_profile_id = vrsr.vocation_route_profile_id
    LEFT JOIN op_route_steps s ON s.step_id = vrsr.step_id
    LEFT JOIN op_routes r ON r.route_id = s.route_id
    ORDER BY vrp.profile_key, vrsr.rule_key
  `) : [];

  return {
    objective_engine_version: 1,
    generated_at: new Date().toISOString(),
    route_profiles: routeProfiles,
    objectives,
    step_rules: stepRules,
  };
}

function main() {
  console.log("Sprint 4A route-objective JSON-export gestart...");
  console.log("Database:", DB_PATH);
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Database niet gevonden: ${DB_PATH}`);
    process.exit(1);
  }
  const db = new Database(DB_PATH);
  db.pragma("foreign_keys = ON");
  try {
    const data = exportRouteObjectives(db);
    writeJson(EXPORT_DIR, "route_objectives.json", data);
    writeJson(APP_DATA_DIR, "route_objectives.json", data);
    console.log(`Objectives: ${data.objectives.length}; profiles: ${data.route_profiles.length}; rules: ${data.step_rules.length}`);
    console.log("Sprint 4A route-objective JSON-export klaar.");
  } catch (err) {
    console.error("Sprint 4A route-objective JSON-export mislukt:");
    console.error(err.stack || err.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();
