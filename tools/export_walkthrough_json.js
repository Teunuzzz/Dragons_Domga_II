const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const ROOT_DIR = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT_DIR, "database", "DD2_Master.db");
const EXPORT_DIR = path.join(ROOT_DIR, "database", "exports");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeJson(fileName, data) {
  const filePath = path.join(EXPORT_DIR, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  console.log(`Export geschreven: ${fileName}`);
}

function all(db, sql, params = []) {
  return db.prepare(sql).all(params);
}

function one(db, sql, params = []) {
  return db.prepare(sql).get(params);
}

function exportWalkthroughs(db) {
  const routes = all(db, `
    SELECT
      r.route_id,
      r.route_key,
      r.name,
      v.vocation_key,
      v.name AS vocation_name,
      r.route_type,
      r.target_playstyle,
      r.spoiler_level,
      r.description,
      r.sort_order
    FROM op_routes r
    LEFT JOIN vocations v ON v.vocation_id = r.vocation_id
    WHERE r.is_active = 1
    ORDER BY r.sort_order, r.route_key
  `);

  for (const route of routes) {
    route.phases = all(db, `
      SELECT phase_id, phase_key, phase_order, name, short_name, description, goal_text, spoiler_level, is_optional, notes
      FROM op_route_phases
      WHERE route_id = ?
      ORDER BY phase_order, phase_key
    `, [route.route_id]);

    route.steps = all(db, `
      SELECT
        s.step_id,
        p.phase_key,
        s.step_key,
        s.step_order,
        s.title,
        s.instruction,
        l.location_key,
        l.name AS location_name,
        l.world_x,
        l.world_y,
        s.step_type,
        s.objective_type,
        s.estimated_minutes,
        s.danger_level,
        s.priority_score,
        s.manual_only,
        s.engine_enabled,
        s.is_optional,
        s.is_repeatable,
        s.spoiler_level,
        s.notes
      FROM op_route_steps s
      LEFT JOIN op_route_phase_steps ps ON ps.step_id = s.step_id
      LEFT JOIN op_route_phases p ON p.phase_id = ps.phase_id
      LEFT JOIN locations l ON l.location_id = s.location_id
      WHERE s.route_id = ?
      ORDER BY COALESCE(p.phase_order, 999999), s.step_order, s.step_key
    `, [route.route_id]);

    for (const step of route.steps) {
      step.checklist = all(db, `
        SELECT checklist_key, sort_order, label, checklist_type, entity_type, entity_key,
               is_required, default_checked, blocks_next_step, grants_flag_key, spoiler_level, notes
        FROM route_step_checklist_items
        WHERE step_id = ?
        ORDER BY sort_order, checklist_key
      `, [step.step_id]);

      step.requirements = all(db, `
        SELECT requirement_type, requirement_key, operator, requirement_value, logic_group, is_hard_requirement, notes
        FROM route_step_requirements
        WHERE step_id = ?
        ORDER BY logic_group, requirement_type, requirement_key
      `, [step.step_id]);

      step.rewards = all(db, `
        SELECT reward_type, reward_key, reward_amount, notes
        FROM route_step_rewards
        WHERE step_id = ?
        ORDER BY reward_type, reward_key
      `, [step.step_id]);

      step.items = all(db, `
        SELECT i.item_key, i.name, rsi.relation_type, rsi.quantity, rsi.notes
        FROM route_step_items rsi
        JOIN items i ON i.item_id = rsi.item_id
        WHERE rsi.step_id = ?
        ORDER BY rsi.relation_type, i.item_key
      `, [step.step_id]);

      step.related_locations = all(db, `
        SELECT l.location_key, l.name, l.world_x, l.world_y, rsl.relation_type, rsl.sort_order, rsl.notes
        FROM route_step_locations rsl
        JOIN locations l ON l.location_id = rsl.location_id
        WHERE rsl.step_id = ?
        ORDER BY rsl.sort_order, rsl.relation_type, l.location_key
      `, [step.step_id]);

      delete step.step_id;
    }

    delete route.route_id;
    for (const phase of route.phases) delete phase.phase_id;
  }

  writeJson("walkthroughs.json", routes);
}

function exportVocations(db) {
  const vocations = all(db, `
    SELECT vocation_id, vocation_key, name, vocation_type, unlock_order, description, is_active
    FROM vocations
    WHERE is_active = 1
    ORDER BY unlock_order, vocation_key
  `);

  for (const vocation of vocations) {
    vocation.unlock = one(db, `
      SELECT
        vu.unlock_method,
        l.location_key AS unlock_location_key,
        q.quest_key AS unlock_quest_key,
        n.npc_key AS unlock_npc_key,
        vu.required_flag_key,
        vu.grants_flag_key,
        vu.is_arisen_only,
        vu.recommended_level,
        vu.priority_score,
        vu.spoiler_level,
        vu.notes
      FROM vocation_unlocks vu
      LEFT JOIN locations l ON l.location_id = vu.unlock_location_id
      LEFT JOIN quests q ON q.quest_id = vu.unlock_quest_id
      LEFT JOIN npcs n ON n.npc_id = vu.unlock_npc_id
      WHERE vu.vocation_id = ?
    `, [vocation.vocation_id]) || null;

    vocation.skills = all(db, `
      SELECT s.skill_key, s.name, s.skill_type, s.description, vsl.unlock_rank, vsl.discipline_cost,
             vsl.is_maister_skill, vsl.sort_order, vsl.notes
      FROM vocation_skill_links vsl
      JOIN skills s ON s.skill_id = vsl.skill_id
      WHERE vsl.vocation_id = ?
      ORDER BY vsl.sort_order, vsl.unlock_rank, s.skill_key
    `, [vocation.vocation_id]);

    vocation.maister_teachings = all(db, `
      SELECT mt.teaching_key, mt.name, s.skill_key, n.npc_key, l.location_key, q.quest_key,
             mt.unlock_summary, mt.item_key, mt.spoiler_level, mt.notes
      FROM maister_teachings mt
      LEFT JOIN skills s ON s.skill_id = mt.skill_id
      LEFT JOIN npcs n ON n.npc_id = mt.npc_id
      LEFT JOIN locations l ON l.location_id = mt.location_id
      LEFT JOIN quests q ON q.quest_id = mt.quest_id
      WHERE mt.vocation_id = ?
      ORDER BY mt.teaching_key
    `, [vocation.vocation_id]);

    delete vocation.vocation_id;
  }

  writeJson("vocations.json", vocations);
}

function exportQuestDetails(db) {
  const quests = all(db, `
    SELECT q.quest_id, q.quest_key, q.name, q.quest_type, l.location_key AS start_location_key,
           q.start_npc, q.recommended_level, q.is_missable, q.spoiler_level, q.description, q.notes
    FROM quests q
    LEFT JOIN locations l ON l.location_id = q.start_location_id
    ORDER BY q.quest_type, q.quest_key
  `);

  for (const quest of quests) {
    quest.requirements = all(db, `
      SELECT requirement_type, requirement_key, operator, requirement_value, logic_group, is_hard_requirement, notes
      FROM quest_requirements
      WHERE quest_id = ?
      ORDER BY logic_group, requirement_type, requirement_key
    `, [quest.quest_id]);

    quest.stages = all(db, `
      SELECT qs.quest_stage_id, qs.stage_key, qs.stage_order, qs.title, qs.description,
             l.location_key, n.npc_key, qs.grants_flag_key, qs.spoiler_level, qs.notes
      FROM quest_stages qs
      LEFT JOIN locations l ON l.location_id = qs.location_id
      LEFT JOIN npcs n ON n.npc_id = qs.npc_id
      WHERE qs.quest_id = ?
      ORDER BY qs.stage_order, qs.stage_key
    `, [quest.quest_id]);

    for (const stage of quest.stages) {
      stage.objectives = all(db, `
        SELECT qo.objective_key, qo.objective_order, qo.instruction, qo.objective_type,
               l.location_key, n.npc_key, i.item_key, qo.target_flag_key,
               qo.is_optional, qo.spoiler_level, qo.notes
        FROM quest_objectives qo
        LEFT JOIN locations l ON l.location_id = qo.location_id
        LEFT JOIN npcs n ON n.npc_id = qo.npc_id
        LEFT JOIN items i ON i.item_id = qo.item_id
        WHERE qo.quest_stage_id = ?
        ORDER BY qo.objective_order, qo.objective_key
      `, [stage.quest_stage_id]);
      delete stage.quest_stage_id;
    }

    quest.rewards = all(db, `
      SELECT qr.reward_type, qr.reward_key, i.item_key, qr.gold_amount, qr.xp_amount,
             qr.discipline_amount, qr.quantity, qr.notes
      FROM quest_rewards qr
      LEFT JOIN items i ON i.item_id = qr.item_id
      WHERE qr.quest_id = ?
      ORDER BY qr.reward_type, qr.reward_key
    `, [quest.quest_id]);

    quest.choices = all(db, `
      SELECT choice_key, choice_order, title, description, outcome_text, grants_flag_key, spoiler_level, notes
      FROM quest_choices
      WHERE quest_id = ?
      ORDER BY choice_order, choice_key
    `, [quest.quest_id]);

    delete quest.quest_id;
  }

  writeJson("quest_details.json", quests);
}

function exportItemDetails(db) {
  const items = all(db, `
    SELECT i.item_id, i.item_key, i.name, i.item_type, i.rarity, i.value_gold, i.weight,
           i.is_unique, i.is_missable, i.keep_warning, i.description, i.notes
    FROM items i
    ORDER BY i.item_type, i.item_key
  `);

  for (const item of items) {
    item.stats = one(db, `
      SELECT equipment_slot, weapon_type, armor_type, strength, magick, defense, magick_defense,
             knockdown_power, knockdown_resistance, slash_strength, strike_strength, element,
             debilitations, stamina_bonus, health_bonus, carry_weight_bonus, upgrade_notes
      FROM item_stats
      WHERE item_id = ?
    `, [item.item_id]) || null;

    item.sources = all(db, `
      SELECT src.source_type, l.location_key, q.quest_key, n.npc_key, v.vendor_key, b.boss_key,
             src.source_flag_key, src.acquisition_method, src.quantity, src.price_gold,
             src.is_repeatable, src.is_missable, src.spoiler_level, src.priority_score, src.notes
      FROM item_sources src
      LEFT JOIN locations l ON l.location_id = src.location_id
      LEFT JOIN quests q ON q.quest_id = src.quest_id
      LEFT JOIN npcs n ON n.npc_id = src.npc_id
      LEFT JOIN vendors v ON v.vendor_id = src.vendor_id
      LEFT JOIN bosses b ON b.boss_id = src.boss_id
      WHERE src.item_id = ?
      ORDER BY src.priority_score DESC, src.source_type
    `, [item.item_id]);

    delete item.item_id;
  }

  writeJson("item_details.json", items);
}

function exportNpcsAndVendors(db) {
  const npcs = all(db, `
    SELECT n.npc_id, n.npc_key, n.name, n.npc_type, l.location_key AS default_location_key,
           r.region_key, n.is_essential, n.is_missable, n.spoiler_level, n.short_description, n.notes
    FROM npcs n
    LEFT JOIN locations l ON l.location_id = n.default_location_id
    LEFT JOIN regions r ON r.region_id = n.region_id
    ORDER BY n.npc_key
  `);

  for (const npc of npcs) {
    npc.locations = all(db, `
      SELECT l.location_key, nl.time_of_day, nl.condition_flag_key, nl.relation_type, nl.notes
      FROM npc_locations nl
      JOIN locations l ON l.location_id = nl.location_id
      WHERE nl.npc_id = ?
      ORDER BY l.location_key, nl.time_of_day
    `, [npc.npc_id]);
    delete npc.npc_id;
  }

  const vendors = all(db, `
    SELECT v.vendor_id, v.vendor_key, v.name, n.npc_key, l.location_key, v.vendor_type,
           v.currency_type, v.spoiler_level, v.notes
    FROM vendors v
    LEFT JOIN npcs n ON n.npc_id = v.npc_id
    LEFT JOIN locations l ON l.location_id = v.location_id
    ORDER BY v.vendor_key
  `);

  for (const vendor of vendors) {
    vendor.inventory = all(db, `
      SELECT i.item_key, i.name, vi.price_gold, vi.stock_quantity, vi.restocks,
             vi.available_after_flag_key, vi.available_before_flag_key, vi.is_limited,
             vi.sort_order, vi.notes
      FROM vendor_inventory vi
      JOIN items i ON i.item_id = vi.item_id
      WHERE vi.vendor_id = ?
      ORDER BY vi.sort_order, i.item_key
    `, [vendor.vendor_id]);
    delete vendor.vendor_id;
  }

  writeJson("npcs.json", npcs);
  writeJson("vendors.json", vendors);
}

function exportGameFlags(db) {
  writeJson("game_flags.json", all(db, `
    SELECT flag_key, flag_type, name, description, spoiler_level, sort_order, is_active, notes
    FROM game_flags
    WHERE is_active = 1
    ORDER BY sort_order, flag_key
  `));
}

function main() {
  console.log("Sprint 3A JSON-export gestart...");
  console.log("Database:", DB_PATH);
  console.log("Exportmap:", EXPORT_DIR);

  if (!fs.existsSync(DB_PATH)) {
    console.error(`Database niet gevonden: ${DB_PATH}`);
    process.exit(1);
  }

  ensureDir(EXPORT_DIR);
  const db = new Database(DB_PATH, { readonly: true });

  try {
    exportWalkthroughs(db);
    exportVocations(db);
    exportQuestDetails(db);
    exportItemDetails(db);
    exportNpcsAndVendors(db);
    exportGameFlags(db);
    console.log("Sprint 3A JSON-export klaar.");
  } finally {
    db.close();
  }
}

main();
