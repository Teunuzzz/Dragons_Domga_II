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

  const row = db
    .prepare(`SELECT ${idColumn} AS id FROM ${table} WHERE ${keyColumn} = ?`)
    .get(keyValue);

  if (!row) {
    throw new Error(`Niet gevonden: ${table}.${keyColumn} = ${keyValue}`);
  }

  return row.id;
}

function importLocations(db) {
  const rows = readCsv("locations_import_template.csv");

const stmt = db.prepare(`
  INSERT INTO locations (
    location_key,
    name,
    category_id,
    region_id,
    world_x,
    world_y,
    location_type,
    discoverable,
    is_missable,
    spoiler_level,
    short_description,
    notes,
    source_id,
    updated_at
  )
  VALUES (
    @location_key,
    @name,
    @category_id,
    @region_id,
    @world_x,
    @world_y,
    @location_type,
    @discoverable,
    @is_missable,
    @spoiler_level,
    @short_description,
    @notes,
    @source_id,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT(location_key) DO UPDATE SET
    name = excluded.name,
    category_id = excluded.category_id,
    region_id = excluded.region_id,
    world_x = excluded.world_x,
    world_y = excluded.world_y,
    location_type = excluded.location_type,
    discoverable = excluded.discoverable,
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
      location_key: row.location_key,
      name: row.name,
      category_id: getId(db, "marker_categories", "category_key", row.category_key, "category_id"),
      region_id: getId(db, "regions", "region_key", row.region_key, "region_id"),
      world_x: toFloat(row.world_x, 0),
      world_y: toFloat(row.world_y, 0),
      location_type: row.location_type || "generic",
      discoverable: toInt(row.discoverable, 1),
      is_missable: toInt(row.is_missable, 0),
      spoiler_level: toInt(row.spoiler_level, 0),
      short_description: nullable(row.short_description),
      notes: nullable(row.notes),
      source_id: getId(db, "sources", "source_key", row.source_key, "source_id"),
    });

    count++;
  }

  console.log(`Locations geïmporteerd: ${count}`);
}

function importItems(db) {
  const rows = readCsv("items_import_template.csv");

const stmt = db.prepare(`
  INSERT INTO items (
    item_key,
    name,
    item_type,
    rarity,
    value_gold,
    weight,
    is_unique,
    is_missable,
    keep_warning,
    description,
    notes,
    source_id,
    updated_at
  )
  VALUES (
    @item_key,
    @name,
    @item_type,
    @rarity,
    @value_gold,
    @weight,
    @is_unique,
    @is_missable,
    @keep_warning,
    @description,
    @notes,
    @source_id,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT(item_key) DO UPDATE SET
    name = excluded.name,
    item_type = excluded.item_type,
    rarity = excluded.rarity,
    value_gold = excluded.value_gold,
    weight = excluded.weight,
    is_unique = excluded.is_unique,
    is_missable = excluded.is_missable,
    keep_warning = excluded.keep_warning,
    description = excluded.description,
    notes = excluded.notes,
    source_id = excluded.source_id,
    updated_at = CURRENT_TIMESTAMP
`);

  let count = 0;

  for (const row of rows) {
    stmt.run({
      item_key: row.item_key,
      name: row.name,
      item_type: row.item_type || "item",
      rarity: nullable(row.rarity),
      value_gold: toInt(row.value_gold, null),
      weight: toFloat(row.weight, null),
      is_unique: toInt(row.is_unique, 0),
      is_missable: toInt(row.is_missable, 0),
      keep_warning: toInt(row.keep_warning, 0),
      description: nullable(row.description),
      notes: nullable(row.notes),
      source_id: getId(db, "sources", "source_key", row.source_key, "source_id"),
    });

    count++;
  }

  console.log(`Items geïmporteerd: ${count}`);
}

function importQuests(db) {
  const rows = readCsv("quests_import_template.csv");

 const stmt = db.prepare(`
  INSERT INTO quests (
    quest_key,
    name,
    quest_type,
    start_location_id,
    start_npc,
    recommended_level,
    is_missable,
    spoiler_level,
    description,
    notes,
    source_id,
    updated_at
  )
  VALUES (
    @quest_key,
    @name,
    @quest_type,
    @start_location_id,
    @start_npc,
    @recommended_level,
    @is_missable,
    @spoiler_level,
    @description,
    @notes,
    @source_id,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT(quest_key) DO UPDATE SET
    name = excluded.name,
    quest_type = excluded.quest_type,
    start_location_id = excluded.start_location_id,
    start_npc = excluded.start_npc,
    recommended_level = excluded.recommended_level,
    is_missable = excluded.is_missable,
    spoiler_level = excluded.spoiler_level,
    description = excluded.description,
    notes = excluded.notes,
    source_id = excluded.source_id,
    updated_at = CURRENT_TIMESTAMP
`);

  let count = 0;

  for (const row of rows) {
    stmt.run({
      quest_key: row.quest_key,
      name: row.name,
      quest_type: row.quest_type || "side",
      start_location_id: getId(db, "locations", "location_key", row.start_location_key, "location_id"),
      start_npc: nullable(row.start_npc),
      recommended_level: toInt(row.recommended_level, null),
      is_missable: toInt(row.is_missable, 0),
      spoiler_level: toInt(row.spoiler_level, 0),
      description: nullable(row.description),
      notes: nullable(row.notes),
      source_id: getId(db, "sources", "source_key", row.source_key, "source_id"),
    });

    count++;
  }

  console.log(`Quests geïmporteerd: ${count}`);
}

function importLocationItems(db) {
  const rows = readCsv("location_items_import_template.csv");

  const deleteExisting = db.prepare(`
    DELETE FROM location_items
    WHERE location_id = ? AND item_id = ?
  `);

  const insertStmt = db.prepare(`
    INSERT INTO location_items (
      location_id,
      item_id,
      quantity,
      acquisition_method,
      container_type,
      is_hidden,
      respawns,
      requires_quest_id,
      requires_flag_key,
      recommended_level,
      spoiler_level,
      notes,
      source_id
    )
    VALUES (
      @location_id,
      @item_id,
      @quantity,
      @acquisition_method,
      @container_type,
      @is_hidden,
      @respawns,
      @requires_quest_id,
      @requires_flag_key,
      @recommended_level,
      @spoiler_level,
      @notes,
      @source_id
    )
  `);

  let count = 0;

  for (const row of rows) {
    const locationId = getId(db, "locations", "location_key", row.location_key, "location_id");
    const itemId = getId(db, "items", "item_key", row.item_key, "item_id");

    const requiresQuestId = row.requires_quest_key
      ? getId(db, "quests", "quest_key", row.requires_quest_key, "quest_id")
      : null;

    deleteExisting.run(locationId, itemId);

    insertStmt.run({
      location_id: locationId,
      item_id: itemId,
      quantity: toInt(row.quantity, 1),
      acquisition_method: row.acquisition_method || "pickup",
      container_type: nullable(row.container_type),
      is_hidden: toInt(row.is_hidden, 0),
      respawns: toInt(row.respawns, 0),
      requires_quest_id: requiresQuestId,
      requires_flag_key: nullable(row.requires_flag_key),
      recommended_level: toInt(row.recommended_level, null),
      spoiler_level: toInt(row.spoiler_level, 0),
      notes: nullable(row.notes),
      source_id: getId(db, "sources", "source_key", row.source_key, "source_id"),
    });

    count++;
  }

  console.log(`Location-items geïmporteerd: ${count}`);
}

function upsertRoute(db, row) {
  const vocationId = getId(db, "vocations", "vocation_key", row.vocation_key, "vocation_id");

  db.prepare(`
    INSERT OR IGNORE INTO op_routes (
      route_key,
      name,
      vocation_id,
      route_type,
      target_playstyle,
      spoiler_level,
      description,
      is_active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    row.route_key,
    row.route_name,
    vocationId,
    row.route_type || "manual_walkthrough",
    row.target_playstyle || "op_fast",
    toInt(row.spoiler_level, 2),
    `Imported route: ${row.route_name}`
  );

  return getId(db, "op_routes", "route_key", row.route_key, "route_id");
}

function importOpRouteSteps(db) {
  const rows = readCsv("op_route_steps_import_template.csv");

 const stmt = db.prepare(`
  INSERT INTO op_route_steps (
    route_id,
    step_key,
    step_order,
    title,
    instruction,
    location_id,
    step_type,
    objective_type,
    estimated_minutes,
    danger_level,
    priority_score,
    manual_only,
    engine_enabled,
    is_optional,
    is_repeatable,
    spoiler_level,
    notes,
    source_id,
    updated_at
  )
  VALUES (
    @route_id,
    @step_key,
    @step_order,
    @title,
    @instruction,
    @location_id,
    @step_type,
    @objective_type,
    @estimated_minutes,
    @danger_level,
    @priority_score,
    @manual_only,
    @engine_enabled,
    @is_optional,
    @is_repeatable,
    @spoiler_level,
    @notes,
    @source_id,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT(route_id, step_key) DO UPDATE SET
    step_order = excluded.step_order,
    title = excluded.title,
    instruction = excluded.instruction,
    location_id = excluded.location_id,
    step_type = excluded.step_type,
    objective_type = excluded.objective_type,
    estimated_minutes = excluded.estimated_minutes,
    danger_level = excluded.danger_level,
    priority_score = excluded.priority_score,
    manual_only = excluded.manual_only,
    engine_enabled = excluded.engine_enabled,
    is_optional = excluded.is_optional,
    is_repeatable = excluded.is_repeatable,
    spoiler_level = excluded.spoiler_level,
    notes = excluded.notes,
    source_id = excluded.source_id,
    updated_at = CURRENT_TIMESTAMP
`);

  let count = 0;

  for (const row of rows) {
    const routeId = upsertRoute(db, row);

    stmt.run({
      route_id: routeId,
      step_key: row.step_key,
      step_order: toInt(row.step_order, null),
      title: row.title,
      instruction: row.instruction,
      location_id: getId(db, "locations", "location_key", row.location_key, "location_id"),
      step_type: row.step_type || "general",
      objective_type: row.objective_type || "visit",
      estimated_minutes: toInt(row.estimated_minutes, null),
      danger_level: toInt(row.danger_level, 1),
      priority_score: toInt(row.priority_score, 50),
      manual_only: toInt(row.manual_only, 0),
      engine_enabled: toInt(row.engine_enabled, 1),
      is_optional: toInt(row.is_optional, 0),
      is_repeatable: toInt(row.is_repeatable, 0),
      spoiler_level: toInt(row.spoiler_level, 2),
      notes: nullable(row.notes),
      source_id: getId(db, "sources", "source_key", row.source_key, "source_id"),
    });

    count++;
  }

  console.log(`OP-route-stappen geïmporteerd: ${count}`);
}

function main() {
  console.log("CSV-import gestart...");
  console.log("Database:", DB_PATH);
  console.log("Templates:", TEMPLATE_DIR);

  if (!fs.existsSync(DB_PATH)) {
    console.error(`Database niet gevonden: ${DB_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(TEMPLATE_DIR)) {
    console.error(`Template-map niet gevonden: ${TEMPLATE_DIR}`);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  db.pragma("foreign_keys = ON");

  const runImport = db.transaction(() => {
    importLocations(db);
    importItems(db);
    importQuests(db);
    importLocationItems(db);
    importOpRouteSteps(db);
  });

  try {
    runImport();
    console.log("CSV-import klaar.");
  } catch (err) {
    console.error("CSV-import mislukt:");
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();