const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'database', 'DD2_Master.db');
const EXPORT_DIR = path.join(ROOT, 'database', 'exports');
const OUT_PATH = path.join(EXPORT_DIR, 'entity_map_points.json');
const SCHEMA_PATH = path.join(ROOT, 'database', 'schema', '008_entity_map_points_schema.sql');

function tableExists(db, tableName) {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);
  return Boolean(row);
}

function main() {
  console.log('Sprint 3J entity map points JSON-export gestart...');
  console.log('Database:', DB_PATH);
  console.log('Exportmap:', EXPORT_DIR);

  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  const db = new Database(DB_PATH, { readonly: false });
  db.pragma('foreign_keys = ON');

  if (!tableExists(db, 'entity_map_points') && fs.existsSync(SCHEMA_PATH)) {
    db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  }

  const rows = tableExists(db, 'entity_map_points')
    ? db.prepare(`
      SELECT
        p.point_id,
        p.point_key,
        p.entity_type,
        p.entity_key,
        r.route_key,
        s.step_key,
        l.location_key,
        l.name AS location_name,
        p.name,
        p.world_x,
        p.world_y,
        p.relation_type,
        p.accuracy_level,
        p.accuracy_score,
        p.route_priority,
        p.is_primary,
        p.is_verified,
        p.spoiler_level,
        p.notes,
        src.source_key
      FROM entity_map_points p
      LEFT JOIN locations l ON l.location_id = p.location_id
      LEFT JOIN op_routes r ON r.route_id = p.route_id
      LEFT JOIN op_route_steps s ON s.step_id = p.step_id
      LEFT JOIN sources src ON src.source_id = p.source_id
      ORDER BY p.route_priority DESC, p.entity_type, p.entity_key, p.point_key
    `).all()
    : [];

  const payload = {
    generated_at: new Date().toISOString(),
    count: rows.length,
    entity_map_points: rows,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  db.close();

  console.log(`Export geschreven: entity_map_points.json (${rows.length} punten)`);
  console.log('Sprint 3J entity map points JSON-export klaar.');
}

main();
