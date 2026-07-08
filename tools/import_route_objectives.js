const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { parse } = require("csv-parse/sync");

const ROOT_DIR = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT_DIR, "database", "DD2_Master.db");
const TEMPLATE_DIR = path.join(ROOT_DIR, "database", "imports", "templates");
const SCHEMA_PATH = path.join(ROOT_DIR, "database", "schema", "009_walkthrough_objectives_schema.sql");

function readCsv(fileName) {
  const filePath = path.join(TEMPLATE_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`Overslaan, bestand bestaat niet: ${fileName}`);
    return [];
  }
  return parse(fs.readFileSync(filePath, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
}

function nullable(value) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function toInt(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

function getOptionalId(db, table, keyColumn, keyValue, idColumn) {
  if (!keyValue) return null;
  const row = db.prepare(`SELECT ${idColumn} AS id FROM ${table} WHERE ${keyColumn} = ?`).get(keyValue);
  return row ? row.id : null;
}

function getId(db, table, keyColumn, keyValue, idColumn) {
  const id = getOptionalId(db, table, keyColumn, keyValue, idColumn);
  if (id === null) throw new Error(`Niet gevonden: ${table}.${keyColumn} = ${keyValue}`);
  return id;
}

function sourceId(db, sourceKey) {
  return getOptionalId(db, "sources", "source_key", sourceKey, "source_id");
}

function routeId(db, routeKey) {
  return getId(db, "op_routes", "route_key", routeKey, "route_id");
}

function stepId(db, routeKey, stepKey) {
  if (!stepKey) return null;
  const row = db.prepare(`
    SELECT s.step_id AS id
    FROM op_route_steps s
    JOIN op_routes r ON r.route_id = s.route_id
    WHERE r.route_key = ? AND s.step_key = ?
  `).get(routeKey, stepKey);
  if (!row) throw new Error(`Niet gevonden: op_route_steps route=${routeKey} step=${stepKey}`);
  return row.id;
}

function objectiveId(db, routeKey, objectiveKey) {
  const row = db.prepare(`
    SELECT ro.objective_id AS id
    FROM route_objectives ro
    JOIN op_routes r ON r.route_id = ro.route_id
    WHERE r.route_key = ? AND ro.objective_key = ?
  `).get(routeKey, objectiveKey);
  if (!row) throw new Error(`Niet gevonden: route_objectives route=${routeKey} objective=${objectiveKey}`);
  return row.id;
}

function applySchema(db) {
  if (!fs.existsSync(SCHEMA_PATH)) throw new Error(`Schema niet gevonden: ${SCHEMA_PATH}`);
  db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));
}

function importRouteObjectives(db) {
  const rows = readCsv("route_objectives_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO route_objectives (
      route_id, step_id, objective_key, sort_order, title, summary, instruction,
      objective_type, route_stage, importance, is_required, is_op_critical,
      skip_for_fast_route, vocation_keys, spoiler_level, why_text, next_hint,
      source_id, notes, updated_at
    ) VALUES (
      @route_id, @step_id, @objective_key, @sort_order, @title, @summary, @instruction,
      @objective_type, @route_stage, @importance, @is_required, @is_op_critical,
      @skip_for_fast_route, @vocation_keys, @spoiler_level, @why_text, @next_hint,
      @source_id, @notes, CURRENT_TIMESTAMP
    )
    ON CONFLICT(route_id, objective_key) DO UPDATE SET
      step_id = excluded.step_id,
      sort_order = excluded.sort_order,
      title = excluded.title,
      summary = excluded.summary,
      instruction = excluded.instruction,
      objective_type = excluded.objective_type,
      route_stage = excluded.route_stage,
      importance = excluded.importance,
      is_required = excluded.is_required,
      is_op_critical = excluded.is_op_critical,
      skip_for_fast_route = excluded.skip_for_fast_route,
      vocation_keys = excluded.vocation_keys,
      spoiler_level = excluded.spoiler_level,
      why_text = excluded.why_text,
      next_hint = excluded.next_hint,
      source_id = excluded.source_id,
      notes = excluded.notes,
      updated_at = CURRENT_TIMESTAMP
  `);
  let count = 0;
  for (const row of rows) {
    stmt.run({
      route_id: routeId(db, row.route_key),
      step_id: row.step_key ? stepId(db, row.route_key, row.step_key) : null,
      objective_key: row.objective_key,
      sort_order: toInt(row.sort_order, 0),
      title: row.title,
      summary: nullable(row.summary),
      instruction: nullable(row.instruction),
      objective_type: row.objective_type || "action",
      route_stage: row.route_stage || "walkthrough",
      importance: row.importance || "recommended",
      is_required: toInt(row.is_required, 1),
      is_op_critical: toInt(row.is_op_critical, 0),
      skip_for_fast_route: toInt(row.skip_for_fast_route, 0),
      vocation_keys: nullable(row.vocation_keys),
      spoiler_level: toInt(row.spoiler_level, 1),
      why_text: nullable(row.why_text),
      next_hint: nullable(row.next_hint),
      source_id: sourceId(db, row.source_key),
      notes: nullable(row.notes),
    });
    count += 1;
  }
  console.log(`Route objectives geïmporteerd: ${count}`);
}

function importRouteObjectiveSteps(db) {
  const rows = readCsv("route_objective_steps_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO route_objective_steps (objective_id, step_id, relation_type, sort_order, is_primary, notes)
    VALUES (@objective_id, @step_id, @relation_type, @sort_order, @is_primary, @notes)
    ON CONFLICT(objective_id, step_id, relation_type) DO UPDATE SET
      sort_order = excluded.sort_order,
      is_primary = excluded.is_primary,
      notes = excluded.notes
  `);
  let count = 0;
  for (const row of rows) {
    stmt.run({
      objective_id: objectiveId(db, row.route_key, row.objective_key),
      step_id: stepId(db, row.route_key, row.step_key),
      relation_type: row.relation_type || "primary",
      sort_order: toInt(row.sort_order, 0),
      is_primary: toInt(row.is_primary, 0),
      notes: nullable(row.notes),
    });
    count += 1;
  }
  console.log(`Route objective-step links geïmporteerd: ${count}`);
}

function importRouteObjectiveActions(db) {
  const rows = readCsv("route_objective_actions_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO route_objective_actions (
      objective_id, action_key, sort_order, action_type, label, details,
      entity_type, entity_key, location_id, item_id, quest_id, npc_id, vocation_id,
      is_required, blocks_completion, grants_flag_key, spoiler_level, source_id, notes, updated_at
    ) VALUES (
      @objective_id, @action_key, @sort_order, @action_type, @label, @details,
      @entity_type, @entity_key, @location_id, @item_id, @quest_id, @npc_id, @vocation_id,
      @is_required, @blocks_completion, @grants_flag_key, @spoiler_level, @source_id, @notes, CURRENT_TIMESTAMP
    )
    ON CONFLICT(objective_id, action_key) DO UPDATE SET
      sort_order = excluded.sort_order,
      action_type = excluded.action_type,
      label = excluded.label,
      details = excluded.details,
      entity_type = excluded.entity_type,
      entity_key = excluded.entity_key,
      location_id = excluded.location_id,
      item_id = excluded.item_id,
      quest_id = excluded.quest_id,
      npc_id = excluded.npc_id,
      vocation_id = excluded.vocation_id,
      is_required = excluded.is_required,
      blocks_completion = excluded.blocks_completion,
      grants_flag_key = excluded.grants_flag_key,
      spoiler_level = excluded.spoiler_level,
      source_id = excluded.source_id,
      notes = excluded.notes,
      updated_at = CURRENT_TIMESTAMP
  `);
  let count = 0;
  for (const row of rows) {
    stmt.run({
      objective_id: objectiveId(db, row.route_key, row.objective_key),
      action_key: row.action_key,
      sort_order: toInt(row.sort_order, 0),
      action_type: row.action_type || "action",
      label: row.label,
      details: nullable(row.details),
      entity_type: nullable(row.entity_type),
      entity_key: nullable(row.entity_key),
      location_id: getOptionalId(db, "locations", "location_key", row.location_key, "location_id"),
      item_id: getOptionalId(db, "items", "item_key", row.item_key, "item_id"),
      quest_id: getOptionalId(db, "quests", "quest_key", row.quest_key, "quest_id"),
      npc_id: getOptionalId(db, "npcs", "npc_key", row.npc_key, "npc_id"),
      vocation_id: getOptionalId(db, "vocations", "vocation_key", row.vocation_key, "vocation_id"),
      is_required: toInt(row.is_required, 1),
      blocks_completion: toInt(row.blocks_completion, 0),
      grants_flag_key: nullable(row.grants_flag_key),
      spoiler_level: toInt(row.spoiler_level, 1),
      source_id: sourceId(db, row.source_key),
      notes: nullable(row.notes),
    });
    count += 1;
  }
  console.log(`Route objective actions geïmporteerd: ${count}`);
}

function importRouteDecisions(db) {
  const rows = readCsv("route_decisions_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO route_decisions (
      objective_id, decision_key, sort_order, question, recommended_choice,
      fast_route_advice, completionist_advice, skip_advice, spoiler_level, source_id, notes, updated_at
    ) VALUES (
      @objective_id, @decision_key, @sort_order, @question, @recommended_choice,
      @fast_route_advice, @completionist_advice, @skip_advice, @spoiler_level, @source_id, @notes, CURRENT_TIMESTAMP
    )
    ON CONFLICT(objective_id, decision_key) DO UPDATE SET
      sort_order = excluded.sort_order,
      question = excluded.question,
      recommended_choice = excluded.recommended_choice,
      fast_route_advice = excluded.fast_route_advice,
      completionist_advice = excluded.completionist_advice,
      skip_advice = excluded.skip_advice,
      spoiler_level = excluded.spoiler_level,
      source_id = excluded.source_id,
      notes = excluded.notes,
      updated_at = CURRENT_TIMESTAMP
  `);
  let count = 0;
  for (const row of rows) {
    stmt.run({
      objective_id: objectiveId(db, row.route_key, row.objective_key),
      decision_key: row.decision_key,
      sort_order: toInt(row.sort_order, 0),
      question: row.question,
      recommended_choice: row.recommended_choice,
      fast_route_advice: nullable(row.fast_route_advice),
      completionist_advice: nullable(row.completionist_advice),
      skip_advice: nullable(row.skip_advice),
      spoiler_level: toInt(row.spoiler_level, 1),
      source_id: sourceId(db, row.source_key),
      notes: nullable(row.notes),
    });
    count += 1;
  }
  console.log(`Route decisions geïmporteerd: ${count}`);
}

function importVocationRouteProfiles(db) {
  const rows = readCsv("vocation_route_profiles_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO vocation_route_profiles (
      profile_key, name, route_id, vocation_id, playstyle_key, is_default,
      coverage_status, priority_bias, description, sort_order, notes, updated_at
    ) VALUES (
      @profile_key, @name, @route_id, @vocation_id, @playstyle_key, @is_default,
      @coverage_status, @priority_bias, @description, @sort_order, @notes, CURRENT_TIMESTAMP
    )
    ON CONFLICT(profile_key) DO UPDATE SET
      name = excluded.name,
      route_id = excluded.route_id,
      vocation_id = excluded.vocation_id,
      playstyle_key = excluded.playstyle_key,
      is_default = excluded.is_default,
      coverage_status = excluded.coverage_status,
      priority_bias = excluded.priority_bias,
      description = excluded.description,
      sort_order = excluded.sort_order,
      notes = excluded.notes,
      updated_at = CURRENT_TIMESTAMP
  `);
  let count = 0;
  for (const row of rows) {
    stmt.run({
      profile_key: row.profile_key,
      name: row.name,
      route_id: getOptionalId(db, "op_routes", "route_key", row.route_key, "route_id"),
      vocation_id: getOptionalId(db, "vocations", "vocation_key", row.vocation_key, "vocation_id"),
      playstyle_key: row.playstyle_key || "op_fast",
      is_default: toInt(row.is_default, 0),
      coverage_status: row.coverage_status || "skeleton",
      priority_bias: toInt(row.priority_bias, 0),
      description: nullable(row.description),
      sort_order: toInt(row.sort_order, 0),
      notes: nullable(row.notes),
    });
    count += 1;
  }
  console.log(`Vocation route profiles geïmporteerd: ${count}`);
}

function importVocationRouteStepRules(db) {
  const rows = readCsv("vocation_route_step_rules_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO vocation_route_step_rules (
      vocation_route_profile_id, step_id, rule_key, include_mode, priority_delta,
      required_override, objective_tag, notes, updated_at
    ) VALUES (
      @vocation_route_profile_id, @step_id, @rule_key, @include_mode, @priority_delta,
      @required_override, @objective_tag, @notes, CURRENT_TIMESTAMP
    )
    ON CONFLICT(vocation_route_profile_id, rule_key) DO UPDATE SET
      step_id = excluded.step_id,
      include_mode = excluded.include_mode,
      priority_delta = excluded.priority_delta,
      required_override = excluded.required_override,
      objective_tag = excluded.objective_tag,
      notes = excluded.notes,
      updated_at = CURRENT_TIMESTAMP
  `);
  const profileStmt = db.prepare("SELECT vocation_route_profile_id AS id FROM vocation_route_profiles WHERE profile_key = ?");
  let count = 0;
  for (const row of rows) {
    const profile = profileStmt.get(row.profile_key);
    if (!profile) throw new Error(`Niet gevonden: vocation_route_profiles.profile_key = ${row.profile_key}`);
    stmt.run({
      vocation_route_profile_id: profile.id,
      step_id: row.step_key ? stepId(db, row.route_key, row.step_key) : null,
      rule_key: row.rule_key,
      include_mode: row.include_mode || "include",
      priority_delta: toInt(row.priority_delta, 0),
      required_override: row.required_override === "" ? null : toInt(row.required_override, null),
      objective_tag: nullable(row.objective_tag),
      notes: nullable(row.notes),
    });
    count += 1;
  }
  console.log(`Vocation route step rules geïmporteerd: ${count}`);
}

function main() {
  console.log("Sprint 4A route-objective import gestart...");
  console.log("Database:", DB_PATH);
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Database niet gevonden: ${DB_PATH}`);
    process.exit(1);
  }
  const db = new Database(DB_PATH);
  db.pragma("foreign_keys = ON");
  try {
    const run = db.transaction(() => {
      applySchema(db);
      importRouteObjectives(db);
      importRouteObjectiveSteps(db);
      importRouteObjectiveActions(db);
      importRouteDecisions(db);
      importVocationRouteProfiles(db);
      importVocationRouteStepRules(db);
    });
    run();
    console.log("Sprint 4A route-objective import klaar.");
  } catch (err) {
    console.error("Sprint 4A route-objective import mislukt:");
    console.error(err.stack || err.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();
