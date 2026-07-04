const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const ROOT_DIR = path.resolve(__dirname, "..");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function write(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Bijgewerkt: ${path.relative(ROOT_DIR, filePath)}`);
}

function patchCoreSchema() {
  const filePath = path.join(ROOT_DIR, "database", "schema", "001_core_schema.sql");
  let s = read(filePath);

  if (!s.includes("map_anchor_id INTEGER")) {
    s = s.replace(
      "location_id INTEGER, step_type",
      "location_id INTEGER, map_anchor_id INTEGER, step_type"
    );

    s = s.replace(
      "FOREIGN KEY (location_id) REFERENCES locations(location_id), FOREIGN KEY (source_id)",
      "FOREIGN KEY (location_id) REFERENCES locations(location_id), FOREIGN KEY (map_anchor_id) REFERENCES map_anchor_points(anchor_id), FOREIGN KEY (source_id)"
    );

    s = s.replace(
      "CREATE INDEX IF NOT EXISTS idx_route_steps_location ON op_route_steps(location_id);",
      "CREATE INDEX IF NOT EXISTS idx_route_steps_location ON op_route_steps(location_id); CREATE INDEX IF NOT EXISTS idx_route_steps_map_anchor ON op_route_steps(map_anchor_id);"
    );

    s = s.replace("PRAGMA user_version = 1;", "PRAGMA user_version = 5;");
    write(filePath, s);
  } else {
    console.log("Overslaan: 001_core_schema.sql bevat map_anchor_id al.");
  }
}

function writeMigrationFile() {
  const filePath = path.join(ROOT_DIR, "database", "schema", "005_route_step_map_anchor.sql");

  const content = `PRAGMA foreign_keys = ON;

-- =========================================================
-- DRAGON'S DOGMA II COMPANION APP
-- Sprint 2A - Route steps koppelen aan map anchors
-- =========================================================

ALTER TABLE op_route_steps
ADD COLUMN map_anchor_id INTEGER REFERENCES map_anchor_points(anchor_id);

CREATE INDEX IF NOT EXISTS idx_route_steps_map_anchor
ON op_route_steps(map_anchor_id);

PRAGMA user_version = 5;
`;

  if (!fs.existsSync(filePath)) {
    write(filePath, content);
  } else {
    console.log("Overslaan: 005_route_step_map_anchor.sql bestaat al.");
  }
}

function patchImporter() {
  const filePath = path.join(ROOT_DIR, "tools", "import_csv_to_sqlite.js");
  let s = read(filePath);

  if (!s.includes("@map_anchor_id")) {
    s = s.replace(
      "location_id, step_type,",
      "location_id, map_anchor_id, step_type,"
    );

    s = s.replace(
      "@location_id, @step_type,",
      "@location_id, @map_anchor_id, @step_type,"
    );

    s = s.replace(
      "location_id = excluded.location_id, step_type = excluded.step_type,",
      "location_id = excluded.location_id, map_anchor_id = excluded.map_anchor_id, step_type = excluded.step_type,"
    );

    s = s.replace(
      'location_id: getId(db, "locations", "location_key", row.location_key, "location_id"), step_type: row.step_type || "general",',
      'location_id: row.location_key ? getId(db, "locations", "location_key", row.location_key, "location_id") : null, map_anchor_id: row.map_anchor_key ? getId(db, "map_anchor_points", "anchor_key", row.map_anchor_key, "anchor_id") : null, step_type: row.step_type || "general",'
    );

    write(filePath, s);
  } else {
    console.log("Overslaan: importer bevat map_anchor_id al.");
  }
}

function patchExporter() {
  const filePath = path.join(ROOT_DIR, "tools", "export_sqlite_to_json.js");
  let s = read(filePath);

  if (!s.includes("map_anchor_key")) {
    s = s.replace(
      "l.location_key, l.name AS location_name, s.step_type,",
      "l.location_key, l.name AS location_name, ap.anchor_key AS map_anchor_key, ap.name AS map_anchor_name, COALESCE(l.world_x, ap.world_x) AS world_x, COALESCE(l.world_y, ap.world_y) AS world_y, s.step_type,"
    );

    s = s.replace(
      "LEFT JOIN locations l ON l.location_id = s.location_id LEFT JOIN sources src",
      "LEFT JOIN locations l ON l.location_id = s.location_id LEFT JOIN map_anchor_points ap ON ap.anchor_id = s.map_anchor_id LEFT JOIN sources src"
    );

    write(filePath, s);
  } else {
    console.log("Overslaan: exporter bevat map_anchor_key al.");
  }
}

function applyMigrationToDatabase() {
  const dbPath = path.join(ROOT_DIR, "database", "DD2_Master.db");

  if (!fs.existsSync(dbPath)) {
    console.log("Overslaan: database/DD2_Master.db bestaat niet.");
    return;
  }

  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");

  const columns = db.prepare("PRAGMA table_info(op_route_steps)").all();
  const hasMapAnchorId = columns.some((column) => column.name === "map_anchor_id");

  if (!hasMapAnchorId) {
    db.exec(`
      ALTER TABLE op_route_steps
      ADD COLUMN map_anchor_id INTEGER REFERENCES map_anchor_points(anchor_id);

      CREATE INDEX IF NOT EXISTS idx_route_steps_map_anchor
      ON op_route_steps(map_anchor_id);

      PRAGMA user_version = 5;
    `);

    console.log("Database bijgewerkt: op_route_steps.map_anchor_id toegevoegd.");
  } else {
    console.log("Overslaan: database bevat map_anchor_id al.");
  }

  db.close();
}

function writeLocationsTemplate() {
  const filePath = path.join(
    ROOT_DIR,
    "database",
    "imports",
    "templates",
    "locations_import_template.csv"
  );

  const content = `location_key,name,category_key,region_key,world_x,world_y,location_type,discoverable,is_missable,spoiler_level,short_description,notes,source_key
borderwatch_outpost,Borderwatch Outpost,settlement,vermund,532,89,settlement,1,0,0,Startgebied bij de grens.,Eigen ankerpunt als eerste locatie.,own_calibration
melve,Melve,settlement,vermund,502,146,settlement,1,0,0,Vroeg dorp in Vermund.,Eigen ankerpunt als locatie.,own_calibration
vernworth,Vernworth,settlement,vermund,549,348,city,1,0,0,Hoofdstad van Vermund.,Belangrijk routeknooppunt.,own_calibration
trevo_mine,Trevo Mine,dungeon,vermund,442,243,dungeon,1,0,1,Goblinmijn ten noordwesten van Vernworth.,Belangrijke vroege routeplek voor vocation unlock.,own_calibration
`;

  write(filePath, content);
}

function writeOpRouteTemplate() {
  const filePath = path.join(
    ROOT_DIR,
    "database",
    "imports",
    "templates",
    "op_route_steps_import_template.csv"
  );

  const content = `route_key,route_name,vocation_key,route_type,target_playstyle,step_key,step_order,title,instruction,location_key,map_anchor_key,step_type,objective_type,estimated_minutes,danger_level,priority_score,manual_only,engine_enabled,is_optional,is_repeatable,spoiler_level,notes,source_key
fighter_op_fast_manual,Fighter OP Fast Manual,fighter,manual_walkthrough,op_fast,start_borderwatch,10,Start bij Borderwatch,Controleer je startuitrusting en markeer Borderwatch als beginpunt.,borderwatch_outpost,borderwatch,start,visit,2,1,50,0,1,0,0,0,Eerste vaste startstap.,own_playthrough
fighter_op_fast_manual,Fighter OP Fast Manual,fighter,manual_walkthrough,op_fast,borderwatch_supplies,20,Check basisvoorraad,Controleer healing items en rust voordat je richting Melve gaat.,borderwatch_outpost,borderwatch,prepare,checklist,3,1,55,0,1,0,0,0,Voorbereiding voor veilige start.,own_playthrough
fighter_op_fast_manual,Fighter OP Fast Manual,fighter,manual_walkthrough,op_fast,travel_to_melve,30,Ga naar Melve,Volg de route naar Melve en pak alleen veilige loot onderweg.,melve,melve,travel,visit,8,1,60,0,1,0,0,0,Eerste routeverplaatsing.,own_playthrough
fighter_op_fast_manual,Fighter OP Fast Manual,fighter,manual_walkthrough,op_fast,visit_melve,40,Bezoek Melve,Activeer Melve als vroeg routeknooppunt en controleer winkels of rustplek.,melve,melve,settlement,visit,5,1,60,0,1,0,0,0,Melve is vroeg belangrijk routepunt.,own_playthrough
fighter_op_fast_manual,Fighter OP Fast Manual,fighter,manual_walkthrough,op_fast,secure_melve_checkpoint,50,Zet Melve op de route vast,Zorg dat Melve als veilige tussenstop in je hoofdroute staat.,melve,melve,checkpoint,checklist,2,1,65,0,1,0,0,0,Voor minder backtracking.,own_playthrough
fighter_op_fast_manual,Fighter OP Fast Manual,fighter,manual_walkthrough,op_fast,travel_melve_to_vernworth,60,Reis richting Vernworth,Ga vanuit Melve zuidwaarts richting Vernworth via de hoofdroute.,vernworth,vernworth,travel,visit,12,2,70,0,1,0,0,0,Vernworth is de eerste grote hub.,own_playthrough
fighter_op_fast_manual,Fighter OP Fast Manual,fighter,manual_walkthrough,op_fast,reach_vernworth,70,Bereik Vernworth,Maak Vernworth je hoofd-hub voor quests winkels en vocation management.,vernworth,vernworth,hub,visit,5,1,80,0,1,0,0,0,Vernworth wordt de centrale routehub.,own_playthrough
fighter_op_fast_manual,Fighter OP Fast Manual,fighter,manual_walkthrough,op_fast,check_vernworth_shops,80,Check Vernworth winkels,Controleer wapens armor en voorraden voordat je de mijnroute doet.,vernworth,vernworth,prepare,shop,6,1,75,0,1,0,0,0,Voorbereiding op Trevo Mine.,own_playthrough
fighter_op_fast_manual,Fighter OP Fast Manual,fighter,manual_walkthrough,op_fast,speak_roderick,90,Spreek met Roderick,Spreek met Roderick over de gestolen wapens voor Vocation Frustration.,vernworth,vernworth,quest,talk,4,1,85,0,1,0,0,1,Startinformatie voor Vocation Frustration.,game8
fighter_op_fast_manual,Fighter OP Fast Manual,fighter,manual_walkthrough,op_fast,accept_vocation_frustration,100,Start Vocation Frustration,Zet Vocation Frustration actief zodat Warrior en Sorcerer unlock logisch in de route past.,vernworth,vernworth,quest,accept,3,1,90,0,1,0,0,1,Unlock-route voor Warrior en Sorcerer.,game8
fighter_op_fast_manual,Fighter OP Fast Manual,fighter,manual_walkthrough,op_fast,prepare_for_trevo_mine,110,Bereid Trevo Mine voor,Rust uit vul healing aan en neem een volle party mee.,vernworth,vernworth,prepare,checklist,6,2,85,0,1,0,0,1,Trevo Mine is gevaarlijker dan de startgebieden.,own_playthrough
fighter_op_fast_manual,Fighter OP Fast Manual,fighter,manual_walkthrough,op_fast,travel_to_trevo_mine,120,Reis naar Trevo Mine,Ga vanuit Vernworth richting Trevo Mine voor de gestolen wapens.,trevo_mine,trevo_mine,travel,visit,10,2,90,0,1,0,0,1,Trevo Mine is de kern van deze power spike.,game8
fighter_op_fast_manual,Fighter OP Fast Manual,fighter,manual_walkthrough,op_fast,enter_trevo_mine,130,Betreed Trevo Mine,Ga de mijn binnen en speel voorzichtig door de smalle paden.,trevo_mine,trevo_mine,dungeon,enter,3,3,90,0,1,0,0,1,Smalle mijnroute met goblins.,game8
fighter_op_fast_manual,Fighter OP Fast Manual,fighter,manual_walkthrough,op_fast,clear_trevo_mine,140,Maak Trevo Mine veilig,Schakel vijanden in Trevo Mine uit voordat je de chests volledig loot.,trevo_mine,trevo_mine,combat,clear,12,3,95,0,1,0,0,1,Nodig voor veilige lootroute.,own_playthrough
fighter_op_fast_manual,Fighter OP Fast Manual,fighter,manual_walkthrough,op_fast,collect_greatsword,150,Pak de Greatsword,Vind de Greatsword in Trevo Mine voor de Warrior unlock.,trevo_mine,trevo_mine,loot,pickup,5,3,100,0,1,0,0,1,Belangrijke vocation unlock loot.,game8
fighter_op_fast_manual,Fighter OP Fast Manual,fighter,manual_walkthrough,op_fast,collect_archistaff,160,Pak de Archistaff,Vind de Archistaff in Trevo Mine voor de Sorcerer unlock.,trevo_mine,trevo_mine,loot,pickup,5,3,100,0,1,0,0,1,Belangrijke vocation unlock loot.,game8
fighter_op_fast_manual,Fighter OP Fast Manual,fighter,manual_walkthrough,op_fast,exit_trevo_mine,170,Verlaat Trevo Mine,Verlaat de mijn nadat beide wapens veilig zijn verzameld.,trevo_mine,trevo_mine,dungeon,exit,4,2,85,0,1,0,0,1,Controlepunt na dungeonloot.,own_playthrough
fighter_op_fast_manual,Fighter OP Fast Manual,fighter,manual_walkthrough,op_fast,return_to_vernworth,180,Keer terug naar Vernworth,Ga terug naar Vernworth om de Vocation Frustration stap af te ronden.,vernworth,vernworth,travel,return,12,2,90,0,1,0,0,1,Terug naar hub voor unlock.,game8
fighter_op_fast_manual,Fighter OP Fast Manual,fighter,manual_walkthrough,op_fast,unlock_warrior_sorcerer,190,Unlock Warrior en Sorcerer,Lever de wapens in en ontgrendel Warrior en Sorcerer als vroege power spike.,vernworth,vernworth,unlock,vocation,5,1,100,0,1,0,0,1,Grote vroege OP-mijlpaal.,game8
fighter_op_fast_manual,Fighter OP Fast Manual,fighter,manual_walkthrough,op_fast,first_op_milestone,200,Eerste OP-mijlpaal bereikt,Markeer deze routefase als voltooid en kies daarna je volgende power spike.,vernworth,vernworth,milestone,complete,2,1,100,0,1,0,0,1,Einde van eerste OP-routefase.,own_playthrough
`;

  write(filePath, content);
}

function main() {
  console.log("Route-step link patch gestart...");

  patchCoreSchema();
  writeMigrationFile();
  patchImporter();
  patchExporter();
  applyMigrationToDatabase();
  writeLocationsTemplate();
  writeOpRouteTemplate();

  console.log("Route-step link patch klaar.");
}

main();