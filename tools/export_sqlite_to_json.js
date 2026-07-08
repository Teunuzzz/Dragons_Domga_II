const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const ROOT_DIR = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT_DIR, "database", "DD2_Master.db");
const EXPORT_DIR = path.join(ROOT_DIR, "database", "exports");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeJson(fileName, data) {
  const filePath = path.join(EXPORT_DIR, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  console.log(`Export geschreven: ${fileName}`);
}

function exportLocations(db) {
  return db.prepare(`
    SELECT
      l.location_key,
      l.name,
      mc.category_key,
      mc.name AS category_name,
      r.region_key,
      r.name AS region_name,
      l.world_x,
      l.world_y,
      l.location_type,
      l.discoverable,
      l.is_missable,
      l.spoiler_level,
      l.short_description,
      l.notes,
      s.source_key
    FROM locations l
    LEFT JOIN marker_categories mc ON mc.category_id = l.category_id
    LEFT JOIN regions r ON r.region_id = l.region_id
    LEFT JOIN sources s ON s.source_id = l.source_id
    ORDER BY l.location_key
  `).all();
}

function exportItems(db) {
  return db.prepare(`
    SELECT
      i.item_key,
      i.name,
      i.item_type,
      i.rarity,
      i.value_gold,
      i.weight,
      i.is_unique,
      i.is_missable,
      i.keep_warning,
      i.description,
      i.notes,
      s.source_key
    FROM items i
    LEFT JOIN sources s ON s.source_id = i.source_id
    ORDER BY i.item_key
  `).all();
}

function exportLocationItems(db) {
  return db.prepare(`
    SELECT
      l.location_key,
      l.name AS location_name,
      i.item_key,
      i.name AS item_name,
      li.quantity,
      li.acquisition_method,
      li.container_type,
      li.is_hidden,
      li.respawns,
      q.quest_key AS requires_quest_key,
      li.requires_flag_key,
      li.recommended_level,
      li.spoiler_level,
      li.notes,
      s.source_key
    FROM location_items li
    JOIN locations l ON l.location_id = li.location_id
    JOIN items i ON i.item_id = li.item_id
    LEFT JOIN quests q ON q.quest_id = li.requires_quest_id
    LEFT JOIN sources s ON s.source_id = li.source_id
    ORDER BY l.location_key, i.item_key
  `).all();
}

function exportQuests(db) {
  return db.prepare(`
    SELECT
      q.quest_key,
      q.name,
      q.quest_type,
      l.location_key AS start_location_key,
      l.name AS start_location_name,
      q.start_npc,
      q.recommended_level,
      q.is_missable,
      q.spoiler_level,
      q.description,
      q.notes,
      s.source_key
    FROM quests q
    LEFT JOIN locations l ON l.location_id = q.start_location_id
    LEFT JOIN sources s ON s.source_id = q.source_id
    ORDER BY q.quest_key
  `).all();
}

function exportOpRoutes(db) {
  const routes = db.prepare(`
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
      r.is_active,
      r.sort_order
    FROM op_routes r
    LEFT JOIN vocations v ON v.vocation_id = r.vocation_id
    ORDER BY r.sort_order, r.route_key
  `).all();

  const stepsStmt = db.prepare(`
    SELECT
      s.step_key,
      s.step_order,
      s.title,
      s.instruction,
      l.location_key,
      l.name AS location_name,
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
      s.notes,
      src.source_key
    FROM op_route_steps s
    LEFT JOIN locations l ON l.location_id = s.location_id
    LEFT JOIN sources src ON src.source_id = s.source_id
    WHERE s.route_id = ?
    ORDER BY s.step_order, s.step_key
  `);

  return routes.map((route) => {
    const { route_id, ...routeData } = route;
    return {
      ...routeData,
      steps: stepsStmt.all(route_id),
    };
  });
}

function exportMapAnchors(db) {
  return db.prepare(`
    SELECT
      ap.anchor_key,
      ap.name,
      ap.world_x,
      ap.world_y,
      ap.anchor_order,
      ap.is_core_anchor
    FROM map_anchor_points ap
    ORDER BY ap.anchor_order
  `).all();
}

function exportMapProfiles(db) {
  const profiles = db.prepare(`
    SELECT
      map_profile_id,
      profile_key,
      name,
      image_file,
      width_px,
      height_px,
      projection_type,
      is_default,
      notes
    FROM map_profiles
    ORDER BY profile_key
  `).all();

  const anchorsStmt = db.prepare(`
    SELECT
      ap.anchor_key,
      ap.name,
      map.pixel_x,
      map.pixel_y,
      map.confidence
    FROM map_anchor_positions map
    JOIN map_anchor_points ap ON ap.anchor_id = map.anchor_id
    WHERE map.map_profile_id = ?
    ORDER BY ap.anchor_order
  `);

  return profiles.map((profile) => {
    const { map_profile_id, ...profileData } = profile;
    return {
      ...profileData,
      anchors: anchorsStmt.all(map_profile_id),
    };
  });
}

function exportRouteEngine(db) {
  const profiles = db.prepare(`
    SELECT
      engine_profile_key,
      name,
      description,
      loot_weight,
      quest_weight,
      boss_weight,
      distance_weight,
      danger_weight,
      vocation_weight,
      prerequisite_weight,
      backtracking_penalty,
      spoilers_allowed,
      is_default,
      is_active
    FROM route_engine_profiles
    ORDER BY engine_profile_key
  `).all();

  const rules = db.prepare(`
    SELECT
      rep.engine_profile_key,
      rer.rule_key,
      rer.rule_type,
      rer.target_type,
      rer.target_key,
      rer.operator,
      rer.score_value,
      rer.condition_type,
      rer.condition_key,
      rer.condition_operator,
      rer.condition_value,
      rer.is_active,
      rer.notes
    FROM route_engine_rules rer
    JOIN route_engine_profiles rep ON rep.engine_profile_id = rer.engine_profile_id
    ORDER BY rep.engine_profile_key, rer.rule_key
  `).all();

  const tags = db.prepare(`
    SELECT
      tag_key,
      name,
      tag_type,
      description,
      sort_order,
      is_active
    FROM route_step_tags
    ORDER BY sort_order, tag_key
  `).all();

  return {
    profiles,
    rules,
    tags,
  };
}

function exportManifest() {
  return {
    app: "Dragons Dogma II Companion App",
    export_version: 1,
    generated_at: new Date().toISOString(),
    files: [
      "locations.json",
      "items.json",
      "location_items.json",
      "quests.json",
      "op_routes.json",
      "map_anchors.json",
      "map_profiles.json",
      "route_engine.json",
      "route_objectives.json",
    ],
  };
}

function main() {
  console.log("JSON-export gestart...");
  console.log("Database:", DB_PATH);
  console.log("Exportmap:", EXPORT_DIR);

  if (!fs.existsSync(DB_PATH)) {
    console.error(`Database niet gevonden: ${DB_PATH}`);
    process.exit(1);
  }

  ensureDir(EXPORT_DIR);

  const db = new Database(DB_PATH);
  db.pragma("foreign_keys = ON");

  try {
    writeJson("locations.json", exportLocations(db));
    writeJson("items.json", exportItems(db));
    writeJson("location_items.json", exportLocationItems(db));
    writeJson("quests.json", exportQuests(db));
    writeJson("op_routes.json", exportOpRoutes(db));
    writeJson("map_anchors.json", exportMapAnchors(db));
    writeJson("map_profiles.json", exportMapProfiles(db));
    writeJson("route_engine.json", exportRouteEngine(db));
    writeJson("manifest.json", exportManifest());

    console.log("JSON-export klaar.");
  } catch (err) {
    console.error("JSON-export mislukt:");
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();