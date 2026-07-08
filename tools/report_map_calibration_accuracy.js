#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE_DIR = path.join(ROOT, 'database', 'imports', 'templates');
const CAL_FILE = path.join(TEMPLATE_DIR, 'map_global_calibration_points_import_template.csv');
const LOC_FILE = path.join(TEMPLATE_DIR, 'locations_import_template.csv');
const POINT_FILE = path.join(TEMPLATE_DIR, 'entity_map_points_import_template.csv');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { cell += '"'; i += 1; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); if (row.some((v) => v !== '')) rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, '')); if (row.some((v) => v !== '')) rows.push(row); }
  if (!rows.length) return { header: [], records: [] };
  const header = rows[0].map((v) => v.trim());
  const records = rows.slice(1).map((values) => Object.fromEntries(header.map((h, i) => [h, values[i] ?? ''])));
  return { header, records };
}

function readCsv(file) {
  if (!fs.existsSync(file)) throw new Error(`Bestand ontbreekt: ${file}`);
  return parseCsv(fs.readFileSync(file, 'utf8')).records;
}

function num(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function main() {
  const calRows = readCsv(CAL_FILE);
  const locRows = readCsv(LOC_FILE);
  const pointRows = readCsv(POINT_FILE);
  const locations = new Map(locRows.map((row) => [row.location_key, row]));
  const points = new Map(pointRows.map((row) => [row.point_key, row]));

  let usable = 0;
  let missingCoords = 0;
  let missingTarget = 0;
  let totalError = 0;
  let maxError = 0;
  const details = [];

  calRows.forEach((row) => {
    const correctX = num(row.correct_x);
    const correctY = num(row.correct_y);
    if (correctX === null || correctY === null) {
      missingCoords += 1;
      details.push({ key: row.calibration_key, status: 'mist correct_x/correct_y' });
      return;
    }

    const targetType = row.target_type;
    const targetKey = row.target_key;
    const target = targetType === 'location' ? locations.get(targetKey) : points.get(targetKey);
    if (!target) {
      missingTarget += 1;
      details.push({ key: row.calibration_key, status: `target ontbreekt: ${targetType}/${targetKey}` });
      return;
    }

    const currentX = num(target.world_x);
    const currentY = num(target.world_y);
    const err = currentX === null || currentY === null ? null : Math.round(Math.sqrt((currentX - correctX) ** 2 + (currentY - correctY) ** 2));
    usable += 1;
    if (err !== null) {
      totalError += err;
      maxError = Math.max(maxError, err);
    }
    details.push({ key: row.calibration_key, status: 'OK', target: `${targetType}/${targetKey}`, current: `${currentX},${currentY}`, correct: `${correctX},${correctY}`, error: err });
  });

  console.log('Sprint 4B.4 global map calibration report');
  console.log(`Kalibratierijen totaal: ${calRows.length}`);
  console.log(`Bruikbare ankers: ${usable}`);
  console.log(`Mist coördinaten: ${missingCoords}`);
  console.log(`Mist target: ${missingTarget}`);
  console.log(`Gemiddelde anker-afwijking huidig -> correct: ${usable ? Math.round(totalError / usable) : 0}px`);
  console.log(`Max anker-afwijking: ${maxError}px`);
  console.log('Details:');
  details.forEach((detail) => {
    if (detail.status === 'OK') console.log(`- ${detail.key}: ${detail.target}; huidig ${detail.current}; correct ${detail.correct}; afwijking ${detail.error}px`);
    else console.log(`- ${detail.key}: ${detail.status}`);
  });
}

try {
  main();
} catch (error) {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
}
