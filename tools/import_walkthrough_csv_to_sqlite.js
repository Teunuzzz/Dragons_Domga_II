const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { parse } = require("csv-parse/sync");

const ROOT_DIR = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT_DIR, "database", "DD2_Master.db");
const TEMPLATE_DIR = path.join(ROOT_DIR, "database", "imports", "templates");

function readCsv(fileName) {
  const filePath = path.join(TEMPLATE_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`Overslaan, bestand bestaat niet: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, "utf8");
  if (!content.trim()) return [];

  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
}

function toInt(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

function toFloat(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number.parseFloat(value);
  return Number.isNaN(n) ? fallback : n;
}

function nullable(value) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function getId(db, table, keyColumn, keyValue, idColumn) {
  if (!keyValue) return null;
  const row = db.prepare(`SELECT ${idColumn} AS id FROM ${table} WHERE ${keyColumn} = ?`).get(keyValue);
  if (!row) throw new Error(`Niet gevonden: ${table}.${keyColumn} = ${keyValue}`);
  return row.id;
}

function getOptionalId(db, table, keyColumn, keyValue, idColumn) {
  if (!keyValue) return null;
  const row = db.prepare(`SELECT ${idColumn} AS id FROM ${table} WHERE ${keyColumn} = ?`).get(keyValue);
  return row ? row.id : null;
}

function getRouteId(db, routeKey) {
  return getId(db, "op_routes", "route_key", routeKey, "route_id");
}

function getStepId(db, routeKey, stepKey) {
  if (!routeKey || !stepKey) return null;
  const row = db.prepare(`
    SELECT s.step_id AS id
    FROM op_route_steps s
    JOIN op_routes r ON r.route_id = s.route_id
    WHERE r.route_key = ? AND s.step_key = ?
  `).get(routeKey, stepKey);
  if (!row) throw new Error(`Niet gevonden: op_route_steps route=${routeKey}, step=${stepKey}`);
  return row.id;
}

function getPhaseId(db, routeKey, phaseKey) {
  if (!routeKey || !phaseKey) return null;
  const row = db.prepare(`
    SELECT p.phase_id AS id
    FROM op_route_phases p
    JOIN op_routes r ON r.route_id = p.route_id
    WHERE r.route_key = ? AND p.phase_key = ?
  `).get(routeKey, phaseKey);
  if (!row) throw new Error(`Niet gevonden: op_route_phases route=${routeKey}, phase=${phaseKey}`);
  return row.id;
}

function sourceId(db, sourceKey) {
  return getOptionalId(db, "sources", "source_key", sourceKey, "source_id");
}

function importReferenceSources(db) {
  const rows = readCsv("reference_sources_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO sources (source_key, name, url, source_type, reliability_score, notes, updated_at)
    VALUES (@source_key, @name, @url, @source_type, @reliability_score, @notes, CURRENT_TIMESTAMP)
    ON CONFLICT(source_key) DO UPDATE SET
      name = excluded.name,
      url = excluded.url,
      source_type = excluded.source_type,
      reliability_score = excluded.reliability_score,
      notes = excluded.notes,
      updated_at = CURRENT_TIMESTAMP
  `);

  let count = 0;
  for (const row of rows) {
    stmt.run({
      source_key: row.source_key,
      name: row.name,
      url: nullable(row.url),
      source_type: row.source_type || "website",
      reliability_score: toInt(row.reliability_score, 3),
      notes: nullable(row.notes),
    });
    count++;
  }
  console.log(`Reference sources geïmporteerd: ${count}`);
}

function importSourceRefs(db) {
  const rows = readCsv("source_refs_import_template.csv");
  const deleteStmt = db.prepare(`DELETE FROM source_refs WHERE source_id = ? AND entity_type = ? AND entity_key = ? AND COALESCE(url, '') = COALESCE(?, '')`);
  const insertStmt = db.prepare(`
    INSERT INTO source_refs (source_id, entity_type, entity_key, url, title, notes)
    VALUES (@source_id, @entity_type, @entity_key, @url, @title, @notes)
  `);

  let count = 0;
  for (const row of rows) {
    const sid = getId(db, "sources", "source_key", row.source_key, "source_id");
    deleteStmt.run(sid, row.entity_type, row.entity_key, nullable(row.url));
    insertStmt.run({
      source_id: sid,
      entity_type: row.entity_type,
      entity_key: row.entity_key,
      url: nullable(row.url),
      title: nullable(row.title),
      notes: nullable(row.notes),
    });
    count++;
  }
  console.log(`Source refs geïmporteerd: ${count}`);
}

function importGameFlags(db) {
  const rows = readCsv("game_flags_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO game_flags (flag_key, flag_type, name, description, spoiler_level, sort_order, is_active, source_id, notes, updated_at)
    VALUES (@flag_key, @flag_type, @name, @description, @spoiler_level, @sort_order, @is_active, @source_id, @notes, CURRENT_TIMESTAMP)
    ON CONFLICT(flag_key) DO UPDATE SET
      flag_type = excluded.flag_type,
      name = excluded.name,
      description = excluded.description,
      spoiler_level = excluded.spoiler_level,
      sort_order = excluded.sort_order,
      is_active = excluded.is_active,
      source_id = excluded.source_id,
      notes = excluded.notes,
      updated_at = CURRENT_TIMESTAMP
  `);

  let count = 0;
  for (const row of rows) {
    stmt.run({
      flag_key: row.flag_key,
      flag_type: row.flag_type || "generic",
      name: row.name,
      description: nullable(row.description),
      spoiler_level: toInt(row.spoiler_level, 0),
      sort_order: toInt(row.sort_order, 0),
      is_active: toInt(row.is_active, 1),
      source_id: sourceId(db, row.source_key),
      notes: nullable(row.notes),
    });
    count++;
  }
  console.log(`Game flags geïmporteerd: ${count}`);
}

function importOpRoutePhases(db) {
  const rows = readCsv("op_route_phases_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO op_route_phases (route_id, phase_key, phase_order, name, short_name, description, goal_text, spoiler_level, is_optional, source_id, notes, updated_at)
    VALUES (@route_id, @phase_key, @phase_order, @name, @short_name, @description, @goal_text, @spoiler_level, @is_optional, @source_id, @notes, CURRENT_TIMESTAMP)
    ON CONFLICT(route_id, phase_key) DO UPDATE SET
      phase_order = excluded.phase_order,
      name = excluded.name,
      short_name = excluded.short_name,
      description = excluded.description,
      goal_text = excluded.goal_text,
      spoiler_level = excluded.spoiler_level,
      is_optional = excluded.is_optional,
      source_id = excluded.source_id,
      notes = excluded.notes,
      updated_at = CURRENT_TIMESTAMP
  `);

  let count = 0;
  for (const row of rows) {
    stmt.run({
      route_id: getRouteId(db, row.route_key),
      phase_key: row.phase_key,
      phase_order: toInt(row.phase_order, 0),
      name: row.name,
      short_name: nullable(row.short_name),
      description: nullable(row.description),
      goal_text: nullable(row.goal_text),
      spoiler_level: toInt(row.spoiler_level, 2),
      is_optional: toInt(row.is_optional, 0),
      source_id: sourceId(db, row.source_key),
      notes: nullable(row.notes),
    });
    count++;
  }
  console.log(`OP-routefases geïmporteerd: ${count}`);
}

function importOpRoutePhaseSteps(db) {
  const rows = readCsv("op_route_phase_steps_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO op_route_phase_steps (phase_id, step_id, sort_order, notes)
    VALUES (@phase_id, @step_id, @sort_order, @notes)
    ON CONFLICT(phase_id, step_id) DO UPDATE SET
      sort_order = excluded.sort_order,
      notes = excluded.notes
  `);

  let count = 0;
  for (const row of rows) {
    stmt.run({
      phase_id: getPhaseId(db, row.route_key, row.phase_key),
      step_id: getStepId(db, row.route_key, row.step_key),
      sort_order: toInt(row.sort_order, 0),
      notes: nullable(row.notes),
    });
    count++;
  }
  console.log(`OP-routefase-stappen geïmporteerd: ${count}`);
}

function importRouteStepChecklistItems(db) {
  const rows = readCsv("route_step_checklist_items_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO route_step_checklist_items (
      step_id, checklist_key, sort_order, label, checklist_type, entity_type, entity_key,
      is_required, default_checked, blocks_next_step, grants_flag_key, spoiler_level, notes, source_id, updated_at
    ) VALUES (
      @step_id, @checklist_key, @sort_order, @label, @checklist_type, @entity_type, @entity_key,
      @is_required, @default_checked, @blocks_next_step, @grants_flag_key, @spoiler_level, @notes, @source_id, CURRENT_TIMESTAMP
    )
    ON CONFLICT(step_id, checklist_key) DO UPDATE SET
      sort_order = excluded.sort_order,
      label = excluded.label,
      checklist_type = excluded.checklist_type,
      entity_type = excluded.entity_type,
      entity_key = excluded.entity_key,
      is_required = excluded.is_required,
      default_checked = excluded.default_checked,
      blocks_next_step = excluded.blocks_next_step,
      grants_flag_key = excluded.grants_flag_key,
      spoiler_level = excluded.spoiler_level,
      notes = excluded.notes,
      source_id = excluded.source_id,
      updated_at = CURRENT_TIMESTAMP
  `);

  let count = 0;
  for (const row of rows) {
    stmt.run({
      step_id: getStepId(db, row.route_key, row.step_key),
      checklist_key: row.checklist_key,
      sort_order: toInt(row.sort_order, 0),
      label: row.label,
      checklist_type: row.checklist_type || "action",
      entity_type: nullable(row.entity_type),
      entity_key: nullable(row.entity_key),
      is_required: toInt(row.is_required, 1),
      default_checked: toInt(row.default_checked, 0),
      blocks_next_step: toInt(row.blocks_next_step, 0),
      grants_flag_key: nullable(row.grants_flag_key),
      spoiler_level: toInt(row.spoiler_level, 2),
      notes: nullable(row.notes),
      source_id: sourceId(db, row.source_key),
    });
    count++;
  }
  console.log(`Route-step checklist-items geïmporteerd: ${count}`);
}

function importRouteStepRequirements(db) {
  const rows = readCsv("route_step_requirements_import_template.csv");
  const deleteStmt = db.prepare(`
    DELETE FROM route_step_requirements
    WHERE step_id = ? AND requirement_type = ? AND requirement_key = ? AND logic_group = ?
  `);
  const insertStmt = db.prepare(`
    INSERT INTO route_step_requirements (step_id, requirement_type, requirement_key, operator, requirement_value, logic_group, is_hard_requirement, notes)
    VALUES (@step_id, @requirement_type, @requirement_key, @operator, @requirement_value, @logic_group, @is_hard_requirement, @notes)
  `);

  let count = 0;
  for (const row of rows) {
    const stepId = getStepId(db, row.route_key, row.step_key);
    const logicGroup = row.logic_group || "all";
    deleteStmt.run(stepId, row.requirement_type, row.requirement_key, logicGroup);
    insertStmt.run({
      step_id: stepId,
      requirement_type: row.requirement_type,
      requirement_key: row.requirement_key,
      operator: row.operator || "exists",
      requirement_value: nullable(row.requirement_value),
      logic_group: logicGroup,
      is_hard_requirement: toInt(row.is_hard_requirement, 1),
      notes: nullable(row.notes),
    });
    count++;
  }
  console.log(`Route-step requirements geïmporteerd: ${count}`);
}

function importRouteStepRewards(db) {
  const rows = readCsv("route_step_rewards_import_template.csv");
  const deleteStmt = db.prepare(`DELETE FROM route_step_rewards WHERE step_id = ? AND reward_type = ? AND reward_key = ?`);
  const insertStmt = db.prepare(`
    INSERT INTO route_step_rewards (step_id, reward_type, reward_key, reward_amount, notes)
    VALUES (@step_id, @reward_type, @reward_key, @reward_amount, @notes)
  `);

  let count = 0;
  for (const row of rows) {
    const stepId = getStepId(db, row.route_key, row.step_key);
    deleteStmt.run(stepId, row.reward_type, row.reward_key);
    insertStmt.run({
      step_id: stepId,
      reward_type: row.reward_type,
      reward_key: row.reward_key,
      reward_amount: toInt(row.reward_amount, 1),
      notes: nullable(row.notes),
    });
    count++;
  }
  console.log(`Route-step rewards geïmporteerd: ${count}`);
}

function importRouteStepItems(db) {
  const rows = readCsv("route_step_items_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO route_step_items (step_id, item_id, relation_type, quantity, notes)
    VALUES (@step_id, @item_id, @relation_type, @quantity, @notes)
    ON CONFLICT(step_id, item_id, relation_type) DO UPDATE SET
      quantity = excluded.quantity,
      notes = excluded.notes
  `);

  let count = 0;
  for (const row of rows) {
    stmt.run({
      step_id: getStepId(db, row.route_key, row.step_key),
      item_id: getId(db, "items", "item_key", row.item_key, "item_id"),
      relation_type: row.relation_type || "pickup",
      quantity: toInt(row.quantity, 1),
      notes: nullable(row.notes),
    });
    count++;
  }
  console.log(`Route-step items geïmporteerd: ${count}`);
}

function importRouteStepLocations(db) {
  const rows = readCsv("route_step_locations_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO route_step_locations (step_id, location_id, relation_type, sort_order, notes)
    VALUES (@step_id, @location_id, @relation_type, @sort_order, @notes)
    ON CONFLICT(step_id, location_id, relation_type) DO UPDATE SET
      sort_order = excluded.sort_order,
      notes = excluded.notes
  `);

  let count = 0;
  for (const row of rows) {
    stmt.run({
      step_id: getStepId(db, row.route_key, row.step_key),
      location_id: getId(db, "locations", "location_key", row.location_key, "location_id"),
      relation_type: row.relation_type || "related",
      sort_order: toInt(row.sort_order, 0),
      notes: nullable(row.notes),
    });
    count++;
  }
  console.log(`Route-step locations geïmporteerd: ${count}`);
}

function importNpcs(db) {
  const rows = readCsv("npcs_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO npcs (npc_key, name, npc_type, default_location_id, region_id, is_essential, is_missable, spoiler_level, short_description, notes, source_id, updated_at)
    VALUES (@npc_key, @name, @npc_type, @default_location_id, @region_id, @is_essential, @is_missable, @spoiler_level, @short_description, @notes, @source_id, CURRENT_TIMESTAMP)
    ON CONFLICT(npc_key) DO UPDATE SET
      name = excluded.name,
      npc_type = excluded.npc_type,
      default_location_id = excluded.default_location_id,
      region_id = excluded.region_id,
      is_essential = excluded.is_essential,
      is_missable = excluded.is_missable,
      spoiler_level = excluded.spoiler_level,
      short_description = excluded.short_description,
      notes = excluded.notes,
      source_id = excluded.source_id,
      updated_at = CURRENT_TIMESTAMP
  `);

  let count = 0;
  for (const row of rows) {
    stmt.run({
      npc_key: row.npc_key,
      name: row.name,
      npc_type: row.npc_type || "npc",
      default_location_id: getOptionalId(db, "locations", "location_key", row.default_location_key, "location_id"),
      region_id: getOptionalId(db, "regions", "region_key", row.region_key, "region_id"),
      is_essential: toInt(row.is_essential, 0),
      is_missable: toInt(row.is_missable, 0),
      spoiler_level: toInt(row.spoiler_level, 0),
      short_description: nullable(row.short_description),
      notes: nullable(row.notes),
      source_id: sourceId(db, row.source_key),
    });
    count++;
  }
  console.log(`NPCs geïmporteerd: ${count}`);
}

function importNpcLocations(db) {
  const rows = readCsv("npc_locations_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO npc_locations (npc_id, location_id, time_of_day, condition_flag_key, relation_type, notes)
    VALUES (@npc_id, @location_id, @time_of_day, @condition_flag_key, @relation_type, @notes)
    ON CONFLICT(npc_id, location_id, time_of_day, condition_flag_key, relation_type) DO UPDATE SET notes = excluded.notes
  `);
  let count = 0;
  for (const row of rows) {
    stmt.run({
      npc_id: getId(db, "npcs", "npc_key", row.npc_key, "npc_id"),
      location_id: getId(db, "locations", "location_key", row.location_key, "location_id"),
      time_of_day: nullable(row.time_of_day),
      condition_flag_key: nullable(row.condition_flag_key),
      relation_type: row.relation_type || "appears_at",
      notes: nullable(row.notes),
    });
    count++;
  }
  console.log(`NPC-locaties geïmporteerd: ${count}`);
}

function importVendors(db) {
  const rows = readCsv("vendors_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO vendors (vendor_key, name, npc_id, location_id, vendor_type, currency_type, spoiler_level, notes, source_id, updated_at)
    VALUES (@vendor_key, @name, @npc_id, @location_id, @vendor_type, @currency_type, @spoiler_level, @notes, @source_id, CURRENT_TIMESTAMP)
    ON CONFLICT(vendor_key) DO UPDATE SET
      name = excluded.name,
      npc_id = excluded.npc_id,
      location_id = excluded.location_id,
      vendor_type = excluded.vendor_type,
      currency_type = excluded.currency_type,
      spoiler_level = excluded.spoiler_level,
      notes = excluded.notes,
      source_id = excluded.source_id,
      updated_at = CURRENT_TIMESTAMP
  `);
  let count = 0;
  for (const row of rows) {
    stmt.run({
      vendor_key: row.vendor_key,
      name: row.name,
      npc_id: getOptionalId(db, "npcs", "npc_key", row.npc_key, "npc_id"),
      location_id: getOptionalId(db, "locations", "location_key", row.location_key, "location_id"),
      vendor_type: row.vendor_type || "shop",
      currency_type: row.currency_type || "gold",
      spoiler_level: toInt(row.spoiler_level, 0),
      notes: nullable(row.notes),
      source_id: sourceId(db, row.source_key),
    });
    count++;
  }
  console.log(`Vendors geïmporteerd: ${count}`);
}

function importVendorInventory(db) {
  const rows = readCsv("vendor_inventory_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO vendor_inventory (vendor_id, item_id, price_gold, stock_quantity, restocks, available_after_flag_key, available_before_flag_key, is_limited, sort_order, notes, source_id, updated_at)
    VALUES (@vendor_id, @item_id, @price_gold, @stock_quantity, @restocks, @available_after_flag_key, @available_before_flag_key, @is_limited, @sort_order, @notes, @source_id, CURRENT_TIMESTAMP)
    ON CONFLICT(vendor_id, item_id, available_after_flag_key) DO UPDATE SET
      price_gold = excluded.price_gold,
      stock_quantity = excluded.stock_quantity,
      restocks = excluded.restocks,
      available_before_flag_key = excluded.available_before_flag_key,
      is_limited = excluded.is_limited,
      sort_order = excluded.sort_order,
      notes = excluded.notes,
      source_id = excluded.source_id,
      updated_at = CURRENT_TIMESTAMP
  `);
  let count = 0;
  for (const row of rows) {
    stmt.run({
      vendor_id: getId(db, "vendors", "vendor_key", row.vendor_key, "vendor_id"),
      item_id: getId(db, "items", "item_key", row.item_key, "item_id"),
      price_gold: toInt(row.price_gold, null),
      stock_quantity: toInt(row.stock_quantity, null),
      restocks: toInt(row.restocks, 0),
      available_after_flag_key: nullable(row.available_after_flag_key),
      available_before_flag_key: nullable(row.available_before_flag_key),
      is_limited: toInt(row.is_limited, 0),
      sort_order: toInt(row.sort_order, 0),
      notes: nullable(row.notes),
      source_id: sourceId(db, row.source_key),
    });
    count++;
  }
  console.log(`Vendor inventory geïmporteerd: ${count}`);
}

function importItemStats(db) {
  const rows = readCsv("item_stats_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO item_stats (
      item_id, equipment_slot, weapon_type, armor_type, strength, magick, defense, magick_defense,
      knockdown_power, knockdown_resistance, slash_strength, strike_strength, element, debilitations,
      stamina_bonus, health_bonus, carry_weight_bonus, upgrade_notes, source_id, updated_at
    ) VALUES (
      @item_id, @equipment_slot, @weapon_type, @armor_type, @strength, @magick, @defense, @magick_defense,
      @knockdown_power, @knockdown_resistance, @slash_strength, @strike_strength, @element, @debilitations,
      @stamina_bonus, @health_bonus, @carry_weight_bonus, @upgrade_notes, @source_id, CURRENT_TIMESTAMP
    )
    ON CONFLICT(item_id) DO UPDATE SET
      equipment_slot = excluded.equipment_slot,
      weapon_type = excluded.weapon_type,
      armor_type = excluded.armor_type,
      strength = excluded.strength,
      magick = excluded.magick,
      defense = excluded.defense,
      magick_defense = excluded.magick_defense,
      knockdown_power = excluded.knockdown_power,
      knockdown_resistance = excluded.knockdown_resistance,
      slash_strength = excluded.slash_strength,
      strike_strength = excluded.strike_strength,
      element = excluded.element,
      debilitations = excluded.debilitations,
      stamina_bonus = excluded.stamina_bonus,
      health_bonus = excluded.health_bonus,
      carry_weight_bonus = excluded.carry_weight_bonus,
      upgrade_notes = excluded.upgrade_notes,
      source_id = excluded.source_id,
      updated_at = CURRENT_TIMESTAMP
  `);
  let count = 0;
  for (const row of rows) {
    stmt.run({
      item_id: getId(db, "items", "item_key", row.item_key, "item_id"),
      equipment_slot: nullable(row.equipment_slot),
      weapon_type: nullable(row.weapon_type),
      armor_type: nullable(row.armor_type),
      strength: toInt(row.strength, null),
      magick: toInt(row.magick, null),
      defense: toInt(row.defense, null),
      magick_defense: toInt(row.magick_defense, null),
      knockdown_power: toInt(row.knockdown_power, null),
      knockdown_resistance: toInt(row.knockdown_resistance, null),
      slash_strength: toInt(row.slash_strength, null),
      strike_strength: toInt(row.strike_strength, null),
      element: nullable(row.element),
      debilitations: nullable(row.debilitations),
      stamina_bonus: toInt(row.stamina_bonus, null),
      health_bonus: toInt(row.health_bonus, null),
      carry_weight_bonus: toFloat(row.carry_weight_bonus, null),
      upgrade_notes: nullable(row.upgrade_notes),
      source_id: sourceId(db, row.source_key),
    });
    count++;
  }
  console.log(`Item stats geïmporteerd: ${count}`);
}

function importItemSources(db) {
  const rows = readCsv("item_sources_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO item_sources (
      item_id, source_type, location_id, quest_id, npc_id, vendor_id, boss_id, source_flag_key,
      acquisition_method, quantity, price_gold, is_repeatable, is_missable, spoiler_level, priority_score,
      notes, source_id, updated_at
    ) VALUES (
      @item_id, @source_type, @location_id, @quest_id, @npc_id, @vendor_id, @boss_id, @source_flag_key,
      @acquisition_method, @quantity, @price_gold, @is_repeatable, @is_missable, @spoiler_level, @priority_score,
      @notes, @source_id, CURRENT_TIMESTAMP
    )
    ON CONFLICT(item_id, source_type, location_id, quest_id, npc_id, vendor_id, boss_id, source_flag_key) DO UPDATE SET
      acquisition_method = excluded.acquisition_method,
      quantity = excluded.quantity,
      price_gold = excluded.price_gold,
      is_repeatable = excluded.is_repeatable,
      is_missable = excluded.is_missable,
      spoiler_level = excluded.spoiler_level,
      priority_score = excluded.priority_score,
      notes = excluded.notes,
      source_id = excluded.source_id,
      updated_at = CURRENT_TIMESTAMP
  `);
  let count = 0;
  for (const row of rows) {
    stmt.run({
      item_id: getId(db, "items", "item_key", row.item_key, "item_id"),
      source_type: row.source_type || "location",
      location_id: getOptionalId(db, "locations", "location_key", row.location_key, "location_id"),
      quest_id: getOptionalId(db, "quests", "quest_key", row.quest_key, "quest_id"),
      npc_id: getOptionalId(db, "npcs", "npc_key", row.npc_key, "npc_id"),
      vendor_id: getOptionalId(db, "vendors", "vendor_key", row.vendor_key, "vendor_id"),
      boss_id: getOptionalId(db, "bosses", "boss_key", row.boss_key, "boss_id"),
      source_flag_key: nullable(row.source_flag_key),
      acquisition_method: row.acquisition_method || "unknown",
      quantity: toInt(row.quantity, 1),
      price_gold: toInt(row.price_gold, null),
      is_repeatable: toInt(row.is_repeatable, 0),
      is_missable: toInt(row.is_missable, 0),
      spoiler_level: toInt(row.spoiler_level, 0),
      priority_score: toInt(row.priority_score, 50),
      notes: nullable(row.notes),
      source_id: sourceId(db, row.source_key),
    });
    count++;
  }
  console.log(`Item sources geïmporteerd: ${count}`);
}

function importQuestRequirements(db) {
  const rows = readCsv("quest_requirements_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO quest_requirements (quest_id, requirement_type, requirement_key, operator, requirement_value, logic_group, is_hard_requirement, notes)
    VALUES (@quest_id, @requirement_type, @requirement_key, @operator, @requirement_value, @logic_group, @is_hard_requirement, @notes)
    ON CONFLICT(quest_id, requirement_type, requirement_key, logic_group) DO UPDATE SET
      operator = excluded.operator,
      requirement_value = excluded.requirement_value,
      is_hard_requirement = excluded.is_hard_requirement,
      notes = excluded.notes
  `);
  let count = 0;
  for (const row of rows) {
    stmt.run({
      quest_id: getId(db, "quests", "quest_key", row.quest_key, "quest_id"),
      requirement_type: row.requirement_type,
      requirement_key: row.requirement_key,
      operator: row.operator || "exists",
      requirement_value: nullable(row.requirement_value),
      logic_group: row.logic_group || "all",
      is_hard_requirement: toInt(row.is_hard_requirement, 1),
      notes: nullable(row.notes),
    });
    count++;
  }
  console.log(`Quest requirements geïmporteerd: ${count}`);
}

function importQuestStages(db) {
  const rows = readCsv("quest_stages_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO quest_stages (quest_id, stage_key, stage_order, title, description, location_id, npc_id, grants_flag_key, spoiler_level, notes, source_id, updated_at)
    VALUES (@quest_id, @stage_key, @stage_order, @title, @description, @location_id, @npc_id, @grants_flag_key, @spoiler_level, @notes, @source_id, CURRENT_TIMESTAMP)
    ON CONFLICT(quest_id, stage_key) DO UPDATE SET
      stage_order = excluded.stage_order,
      title = excluded.title,
      description = excluded.description,
      location_id = excluded.location_id,
      npc_id = excluded.npc_id,
      grants_flag_key = excluded.grants_flag_key,
      spoiler_level = excluded.spoiler_level,
      notes = excluded.notes,
      source_id = excluded.source_id,
      updated_at = CURRENT_TIMESTAMP
  `);
  let count = 0;
  for (const row of rows) {
    stmt.run({
      quest_id: getId(db, "quests", "quest_key", row.quest_key, "quest_id"),
      stage_key: row.stage_key,
      stage_order: toInt(row.stage_order, 0),
      title: row.title,
      description: nullable(row.description),
      location_id: getOptionalId(db, "locations", "location_key", row.location_key, "location_id"),
      npc_id: getOptionalId(db, "npcs", "npc_key", row.npc_key, "npc_id"),
      grants_flag_key: nullable(row.grants_flag_key),
      spoiler_level: toInt(row.spoiler_level, 1),
      notes: nullable(row.notes),
      source_id: sourceId(db, row.source_key),
    });
    count++;
  }
  console.log(`Quest stages geïmporteerd: ${count}`);
}

function getQuestStageId(db, questKey, stageKey) {
  const row = db.prepare(`
    SELECT qs.quest_stage_id AS id
    FROM quest_stages qs
    JOIN quests q ON q.quest_id = qs.quest_id
    WHERE q.quest_key = ? AND qs.stage_key = ?
  `).get(questKey, stageKey);
  if (!row) throw new Error(`Niet gevonden: quest_stage quest=${questKey}, stage=${stageKey}`);
  return row.id;
}

function importQuestObjectives(db) {
  const rows = readCsv("quest_objectives_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO quest_objectives (quest_stage_id, objective_key, objective_order, instruction, objective_type, location_id, npc_id, item_id, target_flag_key, is_optional, spoiler_level, notes, source_id, updated_at)
    VALUES (@quest_stage_id, @objective_key, @objective_order, @instruction, @objective_type, @location_id, @npc_id, @item_id, @target_flag_key, @is_optional, @spoiler_level, @notes, @source_id, CURRENT_TIMESTAMP)
    ON CONFLICT(quest_stage_id, objective_key) DO UPDATE SET
      objective_order = excluded.objective_order,
      instruction = excluded.instruction,
      objective_type = excluded.objective_type,
      location_id = excluded.location_id,
      npc_id = excluded.npc_id,
      item_id = excluded.item_id,
      target_flag_key = excluded.target_flag_key,
      is_optional = excluded.is_optional,
      spoiler_level = excluded.spoiler_level,
      notes = excluded.notes,
      source_id = excluded.source_id,
      updated_at = CURRENT_TIMESTAMP
  `);
  let count = 0;
  for (const row of rows) {
    stmt.run({
      quest_stage_id: getQuestStageId(db, row.quest_key, row.stage_key),
      objective_key: row.objective_key,
      objective_order: toInt(row.objective_order, 0),
      instruction: row.instruction,
      objective_type: row.objective_type || "action",
      location_id: getOptionalId(db, "locations", "location_key", row.location_key, "location_id"),
      npc_id: getOptionalId(db, "npcs", "npc_key", row.npc_key, "npc_id"),
      item_id: getOptionalId(db, "items", "item_key", row.item_key, "item_id"),
      target_flag_key: nullable(row.target_flag_key),
      is_optional: toInt(row.is_optional, 0),
      spoiler_level: toInt(row.spoiler_level, 1),
      notes: nullable(row.notes),
      source_id: sourceId(db, row.source_key),
    });
    count++;
  }
  console.log(`Quest objectives geïmporteerd: ${count}`);
}

function importQuestRewards(db) {
  const rows = readCsv("quest_rewards_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO quest_rewards (quest_id, reward_type, reward_key, item_id, gold_amount, xp_amount, discipline_amount, quantity, notes, source_id)
    VALUES (@quest_id, @reward_type, @reward_key, @item_id, @gold_amount, @xp_amount, @discipline_amount, @quantity, @notes, @source_id)
    ON CONFLICT(quest_id, reward_type, reward_key) DO UPDATE SET
      item_id = excluded.item_id,
      gold_amount = excluded.gold_amount,
      xp_amount = excluded.xp_amount,
      discipline_amount = excluded.discipline_amount,
      quantity = excluded.quantity,
      notes = excluded.notes,
      source_id = excluded.source_id
  `);
  let count = 0;
  for (const row of rows) {
    stmt.run({
      quest_id: getId(db, "quests", "quest_key", row.quest_key, "quest_id"),
      reward_type: row.reward_type || "item",
      reward_key: row.reward_key,
      item_id: getOptionalId(db, "items", "item_key", row.item_key, "item_id"),
      gold_amount: toInt(row.gold_amount, null),
      xp_amount: toInt(row.xp_amount, null),
      discipline_amount: toInt(row.discipline_amount, null),
      quantity: toInt(row.quantity, 1),
      notes: nullable(row.notes),
      source_id: sourceId(db, row.source_key),
    });
    count++;
  }
  console.log(`Quest rewards geïmporteerd: ${count}`);
}

function importQuestChoices(db) {
  const rows = readCsv("quest_choices_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO quest_choices (quest_id, choice_key, choice_order, title, description, outcome_text, grants_flag_key, spoiler_level, notes, source_id)
    VALUES (@quest_id, @choice_key, @choice_order, @title, @description, @outcome_text, @grants_flag_key, @spoiler_level, @notes, @source_id)
    ON CONFLICT(quest_id, choice_key) DO UPDATE SET
      choice_order = excluded.choice_order,
      title = excluded.title,
      description = excluded.description,
      outcome_text = excluded.outcome_text,
      grants_flag_key = excluded.grants_flag_key,
      spoiler_level = excluded.spoiler_level,
      notes = excluded.notes,
      source_id = excluded.source_id
  `);
  let count = 0;
  for (const row of rows) {
    stmt.run({
      quest_id: getId(db, "quests", "quest_key", row.quest_key, "quest_id"),
      choice_key: row.choice_key,
      choice_order: toInt(row.choice_order, 0),
      title: row.title,
      description: nullable(row.description),
      outcome_text: nullable(row.outcome_text),
      grants_flag_key: nullable(row.grants_flag_key),
      spoiler_level: toInt(row.spoiler_level, 2),
      notes: nullable(row.notes),
      source_id: sourceId(db, row.source_key),
    });
    count++;
  }
  console.log(`Quest choices geïmporteerd: ${count}`);
}

function importVocationUnlocks(db) {
  const rows = readCsv("vocation_unlocks_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO vocation_unlocks (vocation_id, unlock_method, unlock_location_id, unlock_quest_id, unlock_npc_id, required_flag_key, grants_flag_key, is_arisen_only, recommended_level, priority_score, spoiler_level, notes, source_id, updated_at)
    VALUES (@vocation_id, @unlock_method, @unlock_location_id, @unlock_quest_id, @unlock_npc_id, @required_flag_key, @grants_flag_key, @is_arisen_only, @recommended_level, @priority_score, @spoiler_level, @notes, @source_id, CURRENT_TIMESTAMP)
    ON CONFLICT(vocation_id) DO UPDATE SET
      unlock_method = excluded.unlock_method,
      unlock_location_id = excluded.unlock_location_id,
      unlock_quest_id = excluded.unlock_quest_id,
      unlock_npc_id = excluded.unlock_npc_id,
      required_flag_key = excluded.required_flag_key,
      grants_flag_key = excluded.grants_flag_key,
      is_arisen_only = excluded.is_arisen_only,
      recommended_level = excluded.recommended_level,
      priority_score = excluded.priority_score,
      spoiler_level = excluded.spoiler_level,
      notes = excluded.notes,
      source_id = excluded.source_id,
      updated_at = CURRENT_TIMESTAMP
  `);
  let count = 0;
  for (const row of rows) {
    stmt.run({
      vocation_id: getId(db, "vocations", "vocation_key", row.vocation_key, "vocation_id"),
      unlock_method: row.unlock_method || "quest",
      unlock_location_id: getOptionalId(db, "locations", "location_key", row.unlock_location_key, "location_id"),
      unlock_quest_id: getOptionalId(db, "quests", "quest_key", row.unlock_quest_key, "quest_id"),
      unlock_npc_id: getOptionalId(db, "npcs", "npc_key", row.unlock_npc_key, "npc_id"),
      required_flag_key: nullable(row.required_flag_key),
      grants_flag_key: nullable(row.grants_flag_key),
      is_arisen_only: toInt(row.is_arisen_only, 0),
      recommended_level: toInt(row.recommended_level, null),
      priority_score: toInt(row.priority_score, 50),
      spoiler_level: toInt(row.spoiler_level, 1),
      notes: nullable(row.notes),
      source_id: sourceId(db, row.source_key),
    });
    count++;
  }
  console.log(`Vocation unlocks geïmporteerd: ${count}`);
}

function importSkills(db) {
  const rows = readCsv("skills_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO skills (skill_key, name, skill_type, description, source_id, updated_at)
    VALUES (@skill_key, @name, @skill_type, @description, @source_id, CURRENT_TIMESTAMP)
    ON CONFLICT(skill_key) DO UPDATE SET
      name = excluded.name,
      skill_type = excluded.skill_type,
      description = excluded.description,
      source_id = excluded.source_id,
      updated_at = CURRENT_TIMESTAMP
  `);
  let count = 0;
  for (const row of rows) {
    stmt.run({
      skill_key: row.skill_key,
      name: row.name,
      skill_type: row.skill_type || "weapon_skill",
      description: nullable(row.description),
      source_id: sourceId(db, row.source_key),
    });
    count++;
  }
  console.log(`Skills geïmporteerd: ${count}`);
}

function importVocationSkillLinks(db) {
  const rows = readCsv("vocation_skill_links_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO vocation_skill_links (vocation_id, skill_id, unlock_rank, discipline_cost, is_maister_skill, sort_order, notes)
    VALUES (@vocation_id, @skill_id, @unlock_rank, @discipline_cost, @is_maister_skill, @sort_order, @notes)
    ON CONFLICT(vocation_id, skill_id) DO UPDATE SET
      unlock_rank = excluded.unlock_rank,
      discipline_cost = excluded.discipline_cost,
      is_maister_skill = excluded.is_maister_skill,
      sort_order = excluded.sort_order,
      notes = excluded.notes
  `);
  let count = 0;
  for (const row of rows) {
    stmt.run({
      vocation_id: getId(db, "vocations", "vocation_key", row.vocation_key, "vocation_id"),
      skill_id: getId(db, "skills", "skill_key", row.skill_key, "skill_id"),
      unlock_rank: toInt(row.unlock_rank, null),
      discipline_cost: toInt(row.discipline_cost, null),
      is_maister_skill: toInt(row.is_maister_skill, 0),
      sort_order: toInt(row.sort_order, 0),
      notes: nullable(row.notes),
    });
    count++;
  }
  console.log(`Vocation skill links geïmporteerd: ${count}`);
}

function importMaisterTeachings(db) {
  const rows = readCsv("maister_teachings_import_template.csv");
  const stmt = db.prepare(`
    INSERT INTO maister_teachings (teaching_key, name, vocation_id, skill_id, npc_id, location_id, quest_id, unlock_summary, item_key, spoiler_level, notes, source_id, updated_at)
    VALUES (@teaching_key, @name, @vocation_id, @skill_id, @npc_id, @location_id, @quest_id, @unlock_summary, @item_key, @spoiler_level, @notes, @source_id, CURRENT_TIMESTAMP)
    ON CONFLICT(teaching_key) DO UPDATE SET
      name = excluded.name,
      vocation_id = excluded.vocation_id,
      skill_id = excluded.skill_id,
      npc_id = excluded.npc_id,
      location_id = excluded.location_id,
      quest_id = excluded.quest_id,
      unlock_summary = excluded.unlock_summary,
      item_key = excluded.item_key,
      spoiler_level = excluded.spoiler_level,
      notes = excluded.notes,
      source_id = excluded.source_id,
      updated_at = CURRENT_TIMESTAMP
  `);
  let count = 0;
  for (const row of rows) {
    stmt.run({
      teaching_key: row.teaching_key,
      name: row.name,
      vocation_id: getId(db, "vocations", "vocation_key", row.vocation_key, "vocation_id"),
      skill_id: getOptionalId(db, "skills", "skill_key", row.skill_key, "skill_id"),
      npc_id: getOptionalId(db, "npcs", "npc_key", row.npc_key, "npc_id"),
      location_id: getOptionalId(db, "locations", "location_key", row.location_key, "location_id"),
      quest_id: getOptionalId(db, "quests", "quest_key", row.quest_key, "quest_id"),
      unlock_summary: nullable(row.unlock_summary),
      item_key: nullable(row.item_key),
      spoiler_level: toInt(row.spoiler_level, 2),
      notes: nullable(row.notes),
      source_id: sourceId(db, row.source_key),
    });
    count++;
  }
  console.log(`Maister teachings geïmporteerd: ${count}`);
}

function main() {
  console.log("Sprint 3A walkthrough CSV-import gestart...");
  console.log("Database:", DB_PATH);
  console.log("Templates:", TEMPLATE_DIR);

  if (!fs.existsSync(DB_PATH)) {
    console.error(`Database niet gevonden: ${DB_PATH}`);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  db.pragma("foreign_keys = ON");

  const runImport = db.transaction(() => {
    importReferenceSources(db);
    importSourceRefs(db);
    importGameFlags(db);

    importOpRoutePhases(db);
    importOpRoutePhaseSteps(db);
    importRouteStepChecklistItems(db);
    importRouteStepRequirements(db);
    importRouteStepRewards(db);
    importRouteStepItems(db);
    importRouteStepLocations(db);

    importNpcs(db);
    importNpcLocations(db);
    importVendors(db);
    importVendorInventory(db);

    importItemStats(db);
    importItemSources(db);

    importQuestRequirements(db);
    importQuestStages(db);
    importQuestObjectives(db);
    importQuestRewards(db);
    importQuestChoices(db);

    importVocationUnlocks(db);
    importSkills(db);
    importVocationSkillLinks(db);
    importMaisterTeachings(db);
  });

  try {
    runImport();
    console.log("Sprint 3A walkthrough CSV-import klaar.");
  } catch (err) {
    console.error("Sprint 3A walkthrough CSV-import mislukt:");
    console.error(err.stack || err.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();
