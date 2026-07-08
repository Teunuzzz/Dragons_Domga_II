const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const ROOT_DIR = path.resolve(__dirname, "..");
const TEMPLATE_DIR = path.join(ROOT_DIR, "database", "imports", "templates");
const GENERATED_DIR = path.join(ROOT_DIR, "database", "imports", "generated");

const SOURCE_CALIBRATION_FILE = path.join(TEMPLATE_DIR, "map_source_calibration_points_import_template.csv");
const LOCATION_SOURCE_FILE = path.join(TEMPLATE_DIR, "location_source_coords_import_template.csv");
const ENTITY_SOURCE_FILE = path.join(TEMPLATE_DIR, "entity_map_point_source_coords_import_template.csv");
const LOCATIONS_FILE = path.join(TEMPLATE_DIR, "locations_import_template.csv");
const ENTITY_POINTS_FILE = path.join(TEMPLATE_DIR, "entity_map_points_import_template.csv");

const LOCATION_PREVIEW_FILE = path.join(GENERATED_DIR, "locations_from_source_calibration_preview.csv");
const ENTITY_PREVIEW_FILE = path.join(GENERATED_DIR, "entity_points_from_source_calibration_preview.csv");

const writeEnabled = process.argv.includes("--write");
const methodArg = process.argv.find((arg) => arg.startsWith("--method="));
const methodSeparateIndex = process.argv.indexOf("--method");
const recalculationMethod = (
  methodArg ? methodArg.split("=")[1] :
  methodSeparateIndex >= 0 ? process.argv[methodSeparateIndex + 1] :
  "affine"
).toLowerCase();
const powerArg = process.argv.find((arg) => arg.startsWith("--power="));
const IDW_POWER = Number(powerArg?.split("=")[1] ?? 2);

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return parse(fs.readFileSync(filePath, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
}

function csvEscape(value) {
  const text = value === undefined || value === null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeCsv(filePath, rows, columns) {
  const content = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n") + "\n";
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function toNumber(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function solveLinearSystem(matrix, vector) {
  const n = vector.length;
  const a = matrix.map((row, i) => [...row, vector[i]]);
  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivotRow][col])) pivotRow = row;
    }
    if (Math.abs(a[pivotRow][col]) < 1e-9) {
      throw new Error("Bronkalibratie-matrix is niet oplosbaar. Gebruik minimaal 3 gespreide ankerpunten per source_key.");
    }
    [a[col], a[pivotRow]] = [a[pivotRow], a[col]];
    const pivot = a[col][col];
    for (let j = col; j <= n; j++) a[col][j] /= pivot;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let j = col; j <= n; j++) a[row][j] -= factor * a[col][j];
    }
  }
  return a.map((row) => row[n]);
}

function fitAffine(points) {
  const ata = Array.from({ length: 6 }, () => Array(6).fill(0));
  const atb = Array(6).fill(0);
  for (const point of points) {
    const sx = point.source_x;
    const sy = point.source_y;
    const tx = point.target_x;
    const ty = point.target_y;
    const rowX = [sx, sy, 1, 0, 0, 0];
    const rowY = [0, 0, 0, sx, sy, 1];
    for (let i = 0; i < 6; i++) {
      atb[i] += rowX[i] * tx + rowY[i] * ty;
      for (let j = 0; j < 6; j++) {
        ata[i][j] += rowX[i] * rowX[j] + rowY[i] * rowY[j];
      }
    }
  }
  const [a, b, c, d, e, f] = solveLinearSystem(ata, atb);
  return { a, b, c, d, e, f };
}

function transformAffine(source, affine) {
  return {
    x: Math.round(affine.a * source.source_x + affine.b * source.source_y + affine.c),
    y: Math.round(affine.d * source.source_x + affine.e * source.source_y + affine.f),
  };
}

function transformWeighted(source, points) {
  let sumWeight = 0;
  let sumDx = 0;
  let sumDy = 0;
  for (const point of points) {
    const dx = source.source_x - point.source_x;
    const dy = source.source_y - point.source_y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.0001) return { x: Math.round(point.target_x), y: Math.round(point.target_y) };
    const weight = 1 / Math.pow(dist, IDW_POWER);
    sumWeight += weight;
    sumDx += weight * (point.target_x - point.source_x);
    sumDy += weight * (point.target_y - point.source_y);
  }
  return {
    x: Math.round(source.source_x + sumDx / sumWeight),
    y: Math.round(source.source_y + sumDy / sumWeight),
  };
}

function transformExact(source, modelsBySource) {
  const sourceKey = source.source_key;
  // manual_screen_calibration means source_x/source_y are already our final app coordinates.
  if (sourceKey === "manual_screen_calibration" || sourceKey === "own_calibration") {
    return { x: Math.round(source.source_x), y: Math.round(source.source_y), source_key: sourceKey, mode: "manual" };
  }
  const model = modelsBySource.get(sourceKey);
  if (!model) return null;
  const result = model.method === "weighted"
    ? transformWeighted(source, model.points)
    : transformAffine(source, model.affine);
  return { ...result, source_key: sourceKey, mode: model.method };
}

function withSourceNote(notes, sourceKey, mode) {
  const clean = String(notes ?? "")
    .replace(/\s*Source-map gekalibreerd via [^.]+\./g, "")
    .trim();
  return `${clean}${clean ? " " : ""}Source-map gekalibreerd via ${sourceKey} (${mode}).`;
}

function buildModels() {
  const rows = readCsv(SOURCE_CALIBRATION_FILE);
  const grouped = new Map();
  for (const row of rows) {
    const sourceKey = row.source_key;
    const point = {
      source_x: toNumber(row.source_x),
      source_y: toNumber(row.source_y),
      target_x: toNumber(row.target_x),
      target_y: toNumber(row.target_y),
    };
    if (!sourceKey || [point.source_x, point.source_y, point.target_x, point.target_y].some((v) => v === null)) continue;
    if (!grouped.has(sourceKey)) grouped.set(sourceKey, []);
    grouped.get(sourceKey).push(point);
  }

  const models = new Map();
  for (const [sourceKey, points] of grouped.entries()) {
    if (points.length < 3) continue;
    const method = recalculationMethod === "weighted" ? "weighted" : "affine";
    models.set(sourceKey, {
      sourceKey,
      method,
      points,
      affine: fitAffine(points),
    });
  }
  return models;
}

function main() {
  const modelsBySource = buildModels();
  const locationRows = readCsv(LOCATIONS_FILE);
  const entityRows = readCsv(ENTITY_POINTS_FILE);
  const locationSourceRows = readCsv(LOCATION_SOURCE_FILE);
  const entitySourceRows = readCsv(ENTITY_SOURCE_FILE);

  const locationColumns = locationRows.length ? Object.keys(locationRows[0]) : [];
  const entityColumns = entityRows.length ? Object.keys(entityRows[0]) : [];

  const locationSourceByKey = new Map(locationSourceRows.map((row) => [row.location_key, {
    ...row,
    source_x: toNumber(row.source_x),
    source_y: toNumber(row.source_y),
  }]));
  const entitySourceByKey = new Map(entitySourceRows.map((row) => [row.point_key, {
    ...row,
    source_x: toNumber(row.source_x),
    source_y: toNumber(row.source_y),
  }]));

  let updatedLocations = 0;
  const nextLocations = locationRows.map((row) => {
    const source = locationSourceByKey.get(row.location_key);
    if (!source || source.source_x === null || source.source_y === null) return row;
    const transformed = transformExact(source, modelsBySource);
    if (!transformed) return row;
    updatedLocations += 1;
    return {
      ...row,
      world_x: transformed.x,
      world_y: transformed.y,
      notes: withSourceNote(row.notes, transformed.source_key, transformed.mode),
      source_key: transformed.source_key === "manual_screen_calibration" ? "own_calibration" : transformed.source_key,
    };
  });

  let updatedEntities = 0;
  const nextEntities = entityRows.map((row) => {
    const source = entitySourceByKey.get(row.point_key);
    if (!source || source.source_x === null || source.source_y === null) return row;
    const transformed = transformExact(source, modelsBySource);
    if (!transformed) return row;
    updatedEntities += 1;
    return {
      ...row,
      world_x: transformed.x,
      world_y: transformed.y,
      notes: withSourceNote(row.notes, transformed.source_key, transformed.mode),
      source_key: transformed.source_key === "manual_screen_calibration" ? "own_calibration" : transformed.source_key,
    };
  });

  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  if (locationColumns.length) writeCsv(LOCATION_PREVIEW_FILE, nextLocations, locationColumns);
  if (entityColumns.length) writeCsv(ENTITY_PREVIEW_FILE, nextEntities, entityColumns);

  console.log("Source-map kalibratie");
  console.log(`Methode: ${recalculationMethod === "weighted" ? `weighted IDW power ${IDW_POWER}` : "affine per source_key"}`);
  console.log(`Bronmodellen met >=3 ankers: ${modelsBySource.size}`);
  for (const [sourceKey, model] of modelsBySource.entries()) {
    console.log(`- ${sourceKey}: ${model.points.length} ankers`);
  }
  console.log(`Locatie-source rows: ${locationSourceRows.length}; bijgewerkt: ${updatedLocations}`);
  console.log(`Entity-source rows: ${entitySourceRows.length}; bijgewerkt: ${updatedEntities}`);
  console.log(`Preview locaties: ${LOCATION_PREVIEW_FILE}`);
  console.log(`Preview entity-punten: ${ENTITY_PREVIEW_FILE}`);

  if (!writeEnabled) {
    console.log("Dry-run klaar. Voeg --write toe om CSV-templates te overschrijven.");
    return;
  }

  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  if (locationColumns.length) {
    fs.copyFileSync(LOCATIONS_FILE, `${LOCATIONS_FILE}.bak-source-map-${stamp}`);
    writeCsv(LOCATIONS_FILE, nextLocations, locationColumns);
    console.log(`Template bijgewerkt: ${LOCATIONS_FILE}`);
  }
  if (entityColumns.length) {
    fs.copyFileSync(ENTITY_POINTS_FILE, `${ENTITY_POINTS_FILE}.bak-source-map-${stamp}`);
    writeCsv(ENTITY_POINTS_FILE, nextEntities, entityColumns);
    console.log(`Template bijgewerkt: ${ENTITY_POINTS_FILE}`);
  }
}

try {
  main();
} catch (error) {
  console.error("Source-map kalibratie mislukt:");
  console.error(error);
  process.exit(1);
}
