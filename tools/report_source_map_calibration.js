const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const ROOT_DIR = path.resolve(__dirname, "..");
const TEMPLATE_DIR = path.join(ROOT_DIR, "database", "imports", "templates");
const SOURCE_CALIBRATION_FILE = path.join(TEMPLATE_DIR, "map_source_calibration_points_import_template.csv");
const LOCATION_SOURCE_FILE = path.join(TEMPLATE_DIR, "location_source_coords_import_template.csv");
const ENTITY_SOURCE_FILE = path.join(TEMPLATE_DIR, "entity_map_point_source_coords_import_template.csv");

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return parse(fs.readFileSync(filePath, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const calibrationRows = readCsv(SOURCE_CALIBRATION_FILE);
const locationRows = readCsv(LOCATION_SOURCE_FILE);
const entityRows = readCsv(ENTITY_SOURCE_FILE);
const counts = new Map();
for (const row of calibrationRows) {
  if (!row.source_key) continue;
  if ([row.source_x, row.source_y, row.target_x, row.target_y].some((value) => toNumber(value) === null)) continue;
  counts.set(row.source_key, (counts.get(row.source_key) ?? 0) + 1);
}

console.log("Source-map calibration report");
console.log(`Bronkalibratiepunten totaal: ${calibrationRows.length}`);
console.log(`Locatie-source coords: ${locationRows.length}`);
console.log(`Entity-source coords: ${entityRows.length}`);
console.log("Bronnen:");
if (counts.size === 0) console.log("- geen bruikbare bronnen");
for (const [sourceKey, count] of [...counts.entries()].sort()) {
  console.log(`- ${sourceKey}: ${count} ankers ${count >= 3 ? "OK" : "TE WEINIG"}`);
}

const usableLocationRows = locationRows.filter((row) => row.location_key && row.source_key && toNumber(row.source_x) !== null && toNumber(row.source_y) !== null).length;
const usableEntityRows = entityRows.filter((row) => row.point_key && row.source_key && toNumber(row.source_x) !== null && toNumber(row.source_y) !== null).length;
console.log(`Bruikbare locatie-source rows: ${usableLocationRows}/${locationRows.length}`);
console.log(`Bruikbare entity-source rows: ${usableEntityRows}/${entityRows.length}`);
