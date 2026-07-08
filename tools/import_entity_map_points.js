const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { parse } = require('csv-parse/sync');

const ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT, 'database', 'DD2_Master.db');
const TEMPLATE_PATH = path.join(ROOT, 'database', 'imports', 'templates', 'entity_map_points_import_template.csv');
const SCHEMA_PATH = path.join(ROOT, 'database', 'schema', '008_entity_map_points_schema.sql');

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.trim()) return [];
  return parse(raw, { columns: true, skip_empty_lines: true, bom: true, trim: true });
}

function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length === 0 ? null : text;
}

function toNumber(value, fallback = null) {
  const text = emptyToNull(value);
  if (text === null) return fallback;
  const number = Number(text);
  return Number.isFinite(number) ? number : fallback;
}

function toInt(value, fallback = 0) {
  const number = toNumber(value, fallback);
  return number === null ? fallback : Math.trunc(number);
}

function getId(db, table, keyColumn, keyValue, idColumn) {
  const key = emptyToNull(keyValue);
  if (key === null) return null;
  const row = db.prepare(`SELECT ${idColumn} AS id FROM ${table} WHERE ${keyColumn} = ?`).get(key);
  if (!row) throw new Error(`Niet gevonden: ${table}.${keyColumn} = ${key}`);
  return row.id;
}

function getStepId(db, routeKey, stepKey) {
  const route = emptyToNull(routeKey);
  const step = emptyToNull(stepKey);
  if (!route || !step) return null;
  const row = db.prepare(`
    SELECT s.step_id AS id
    FROM op_route_steps s
    JOIN op_routes r ON r.route_id = s.route_id
    WHERE r.route_key = ? AND s.step_key = ?
  `).get(route, step);
  if (!row) throw new Error(`Niet gevonden: op_route_steps route_key=${route} step_key=${step}`);
  return row.id;
}

function main() {
  console.log('Sprint 3J entity map points import gestart...');
  console.log('Database:', DB_PATH);
  console.log('Template:', TEMPLATE_PATH);

  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');

  if (fs.existsSync(SCHEMA_PATH)) {
    db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  }

  const rows = readCsv(TEMPLATE_PATH);

  const insert = db.prepare(`
    INSERT INTO entity_map_points (
      point_key, entity_type, entity_key, route_id, step_id, location_id, name,
      world_x, world_y, relation_type, accuracy_level, accuracy_score,
      route_priority, is_primary, is_verified, spoiler_level, notes, source_id,
      updated_at
    ) VALUES (
      @point_key, @entity_type, @entity_key, @route_id, @step_id, @location_id, @name,
      @world_x, @world_y, @relation_type, @accuracy_level, @accuracy_score,
      @route_priority, @is_primary, @is_verified, @spoiler_level, @notes, @source_id,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT(point_key) DO UPDATE SET
      entity_type = excluded.entity_type,
      entity_key = excluded.entity_key,
      route_id = excluded.route_id,
      step_id = excluded.step_id,
      location_id = excluded.location_id,
      name = excluded.name,
      world_x = excluded.world_x,
      world_y = excluded.world_y,
      relation_type = excluded.relation_type,
      accuracy_level = excluded.accuracy_level,
      accuracy_score = excluded.accuracy_score,
      route_priority = excluded.route_priority,
      is_primary = excluded.is_primary,
      is_verified = excluded.is_verified,
      spoiler_level = excluded.spoiler_level,
      notes = excluded.notes,
      source_id = excluded.source_id,
      updated_at = CURRENT_TIMESTAMP
  `);

  const trx = db.transaction(() => {
    db.prepare('DELETE FROM entity_map_points').run();
    for (const row of rows) {
      const routeId = getId(db, 'op_routes', 'route_key', row.route_key, 'route_id');
      const stepId = getStepId(db, row.route_key, row.step_key);
      const locationId = getId(db, 'locations', 'location_key', row.location_key, 'location_id');
      const sourceId = getId(db, 'sources', 'source_key', row.source_key || 'own_calibration', 'source_id');

      const payload = {
        point_key: emptyToNull(row.point_key),
        entity_type: emptyToNull(row.entity_type),
        entity_key: emptyToNull(row.entity_key),
        route_id: routeId,
        step_id: stepId,
        location_id: locationId,
        name: emptyToNull(row.name),
        world_x: toNumber(row.world_x),
        world_y: toNumber(row.world_y),
        relation_type: emptyToNull(row.relation_type) || 'primary',
        accuracy_level: emptyToNull(row.accuracy_level) || 'estimated_low',
        accuracy_score: toInt(row.accuracy_score, 50),
        route_priority: toInt(row.route_priority, 50),
        is_primary: toInt(row.is_primary, 1),
        is_verified: toInt(row.is_verified, 0),
        spoiler_level: toInt(row.spoiler_level, 0),
        notes: emptyToNull(row.notes),
        source_id: sourceId,
      };

      if (!payload.point_key) throw new Error('Lege point_key in entity_map_points_import_template.csv');
      if (!payload.entity_type) throw new Error(`Lege entity_type voor ${payload.point_key}`);
      if (!payload.entity_key) throw new Error(`Lege entity_key voor ${payload.point_key}`);
      if (!payload.name) throw new Error(`Lege name voor ${payload.point_key}`);
      if (payload.world_x === null || payload.world_y === null) throw new Error(`Lege/ongeldige coördinaten voor ${payload.point_key}`);

      insert.run(payload);
    }
  });

  try {
    trx();
    console.log(`Entity map points geïmporteerd: ${rows.length}`);
    console.log('Sprint 3J entity map points import klaar.');
  } finally {
    db.close();
  }
}

main();
