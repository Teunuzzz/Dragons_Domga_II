const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const ROOT_DIR = path.resolve(__dirname, "..");
const TEMPLATE_DIR = path.join(ROOT_DIR, "database", "imports", "templates");
const GENERATED_DIR = path.join(ROOT_DIR, "database", "imports", "generated");

const LOCATIONS_FILE = path.join(TEMPLATE_DIR, "locations_import_template.csv");
const SEED_FILE = path.join(TEMPLATE_DIR, "location_seed_points_import_template.csv");
const CALIBRATION_FILE = path.join(
  TEMPLATE_DIR,
  "location_calibration_points_import_template.csv",
);
const ENTITY_POINTS_FILE = path.join(TEMPLATE_DIR, "entity_map_points_import_template.csv");
const PREVIEW_FILE = path.join(GENERATED_DIR, "locations_import_template_recalculated_preview.csv");
const ENTITY_PREVIEW_FILE = path.join(GENERATED_DIR, "entity_map_points_recalculated_preview.csv");

const writeEnabled = process.argv.includes("--write");
const methodArg = process.argv.find((arg) => arg.startsWith("--method="));
const methodSeparateIndex = process.argv.indexOf("--method");
const recalculationMethod = (
  methodArg ? methodArg.split("=")[1] :
  methodSeparateIndex >= 0 ? process.argv[methodSeparateIndex + 1] :
  "weighted"
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
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function isLocked(value) {
  if (value === undefined || value === null || value === "") return true;
  const text = String(value).trim().toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "ja";
}

function solveLinearSystem(matrix, vector) {
  const n = vector.length;
  const a = matrix.map((row, index) => [...row, vector[index]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivotRow][col])) pivotRow = row;
    }

    if (Math.abs(a[pivotRow][col]) < 1e-9) {
      throw new Error("Kalibratiematrix is niet oplosbaar. Gebruik minimaal 3 gespreide kalibratiepunten.");
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
    const rowX = [point.source_x, point.source_y, 1, 0, 0, 0];
    const rowY = [0, 0, 0, point.source_x, point.source_y, 1];
    for (let i = 0; i < 6; i++) {
      atb[i] += rowX[i] * point.corrected_x + rowY[i] * point.corrected_y;
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

function transformWeighted(source, calibrationPoints, power = IDW_POWER) {
  let sumWeight = 0;
  let sumDx = 0;
  let sumDy = 0;

  for (const point of calibrationPoints) {
    const dx = source.source_x - point.source_x;
    const dy = source.source_y - point.source_y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 0.0001) {
      return { x: Math.round(point.corrected_x), y: Math.round(point.corrected_y) };
    }
    const weight = 1 / Math.pow(distance, power);
    sumWeight += weight;
    sumDx += weight * (point.corrected_x - point.source_x);
    sumDy += weight * (point.corrected_y - point.source_y);
  }

  if (sumWeight <= 0) return { x: Math.round(source.source_x), y: Math.round(source.source_y) };
  return {
    x: Math.round(source.source_x + sumDx / sumWeight),
    y: Math.round(source.source_y + sumDy / sumWeight),
  };
}

function cleanNotes(notes) {
  return String(notes ?? "")
    .replace(/\s*Herkalibreerd via Sprint 3G met \d+ kalibratiepunten\./g, "")
    .replace(/\s*Herkalibreerd via Sprint 3K \([^)]*\) met \d+ kalibratiepunten\./g, "")
    .trim();
}

function main() {
  const locationRows = readCsv(LOCATIONS_FILE);
  const seedRows = readCsv(SEED_FILE);
  const calibrationRows = readCsv(CALIBRATION_FILE);
  const entityPointRows = readCsv(ENTITY_POINTS_FILE);

  if (locationRows.length === 0) throw new Error(`Geen locaties gevonden: ${LOCATIONS_FILE}`);
  if (seedRows.length === 0) throw new Error(`Geen seed points gevonden: ${SEED_FILE}`);
  if (calibrationRows.length < 3) {
    throw new Error("Minimaal 3 kalibratiepunten nodig. Laat de originele regels in location_calibration_points_import_template.csv staan.");
  }

  const columns = Object.keys(locationRows[0]);
  const seedsByKey = new Map(
    seedRows.map((row) => [
      row.location_key,
      {
        ...row,
        source_x: toNumber(row.source_x),
        source_y: toNumber(row.source_y),
        offset_x: toNumber(row.offset_x, 0),
        offset_y: toNumber(row.offset_y, 0),
      },
    ]),
  );

  // Sprint 3K fix: iedere bestaande locatie moet als kalibratiepunt kunnen dienen.
  // Sommige sublocaties (zoals ancestral_chamber) stonden wel in locations_import_template.csv,
  // maar nog niet in location_seed_points_import_template.csv. Daardoor werden correcties
  // genegeerd en sprong de marker na herberekenen terug naar de berekende positie.
  // Als er geen expliciete seed is, gebruiken we de huidige CSV-positie als bronpunt.
  for (const row of locationRows) {
    if (!row.location_key || seedsByKey.has(row.location_key)) continue;
    const worldX = toNumber(row.world_x);
    const worldY = toNumber(row.world_y);
    if (worldX === null || worldY === null) continue;
    seedsByKey.set(row.location_key, {
      location_key: row.location_key,
      source_type: "computed_anchor",
      parent_location_key: "",
      source_x: worldX,
      source_y: worldY,
      offset_x: 0,
      offset_y: 0,
      notes: "Fallback seed from current locations_import_template.csv.",
    });
  }

  const calibrationByKey = new Map();
  for (const row of calibrationRows) {
    if (!row.location_key) continue;
    const seed = seedsByKey.get(row.location_key);
    if (!seed || seed.source_x === null || seed.source_y === null) {
      console.warn(`Waarschuwing: kalibratiepunt zonder seed overgeslagen: ${row.location_key}`);
      continue;
    }
    calibrationByKey.set(row.location_key, {
      location_key: row.location_key,
      source_x: seed.source_x,
      source_y: seed.source_y,
      corrected_x: toNumber(row.corrected_x),
      corrected_y: toNumber(row.corrected_y),
      locked: isLocked(row.locked),
    });
  }

  const calibrationPoints = Array.from(calibrationByKey.values()).filter(
    (point) => point.corrected_x !== null && point.corrected_y !== null,
  );

  if (calibrationPoints.length < 3) {
    throw new Error("Minder dan 3 bruikbare kalibratiepunten gevonden na validatie.");
  }

  const affine = fitAffine(calibrationPoints);
  const useWeighted = recalculationMethod !== "affine";
  const nextByKey = new Map();
  const oldByKey = new Map();
  const rowsByKey = new Map(locationRows.map((row) => [row.location_key, row]));
  let movedCount = 0;

  function transformSeed(seed) {
    return useWeighted
      ? transformWeighted(seed, calibrationPoints)
      : transformAffine(seed, affine);
  }

  function computeLocation(row) {
    if (nextByKey.has(row.location_key)) return nextByKey.get(row.location_key);

    const seed = seedsByKey.get(row.location_key);
    const oldX = toNumber(row.world_x, 0);
    const oldY = toNumber(row.world_y, 0);
    oldByKey.set(row.location_key, { x: oldX, y: oldY });
    const calibration = calibrationByKey.get(row.location_key);
    let nextX = oldX;
    let nextY = oldY;

    if (calibration && calibration.locked) {
      nextX = calibration.corrected_x;
      nextY = calibration.corrected_y;
    } else if (seed && seed.source_type === "computed_offset" && seed.parent_location_key) {
      const parentRow = rowsByKey.get(seed.parent_location_key);
      if (parentRow) {
        const parent = computeLocation(parentRow);
        nextX = parent.x + (seed.offset_x ?? 0);
        nextY = parent.y + (seed.offset_y ?? 0);
      } else if (seed.source_x !== null && seed.source_y !== null) {
        const transformed = transformSeed(seed);
        nextX = transformed.x;
        nextY = transformed.y;
      }
    } else if (seed && seed.source_type !== "manual_exact" && seed.source_x !== null && seed.source_y !== null) {
      const transformed = transformSeed(seed);
      nextX = transformed.x;
      nextY = transformed.y;
    } else if (calibration) {
      nextX = calibration.corrected_x;
      nextY = calibration.corrected_y;
    }

    nextX = Math.round(nextX);
    nextY = Math.round(nextY);
    if (nextX !== Math.round(oldX) || nextY !== Math.round(oldY)) movedCount++;
    const result = { x: nextX, y: nextY };
    nextByKey.set(row.location_key, result);
    return result;
  }

  const nextRows = locationRows.map((row) => {
    const next = computeLocation(row);
    const notes = cleanNotes(row.notes);
    return {
      ...row,
      world_x: next.x,
      world_y: next.y,
      notes: `${notes}${notes ? " " : ""}Herkalibreerd via Sprint 3K (${useWeighted ? "weighted-ratio" : "affine"}) met ${calibrationPoints.length} kalibratiepunten.`,
      source_key: row.source_key || "own_calibration",
    };
  });

  writeCsv(PREVIEW_FILE, nextRows, columns);

  let movedEntityCount = 0;
  let nextEntityRows = [];
  if (entityPointRows.length > 0) {
    const entityColumns = Object.keys(entityPointRows[0]);
    nextEntityRows = entityPointRows.map((row) => {
      const oldX = toNumber(row.world_x);
      const oldY = toNumber(row.world_y);
      if (oldX === null || oldY === null) return row;
      let nextX = oldX;
      let nextY = oldY;
      const locationKey = row.location_key;
      const oldLocation = locationKey ? oldByKey.get(locationKey) : null;
      const nextLocation = locationKey ? nextByKey.get(locationKey) : null;
      if (oldLocation && nextLocation) {
        nextX = oldX + (nextLocation.x - oldLocation.x);
        nextY = oldY + (nextLocation.y - oldLocation.y);
      } else if (useWeighted) {
        const transformed = transformWeighted({ source_x: oldX, source_y: oldY }, calibrationPoints);
        nextX = transformed.x;
        nextY = transformed.y;
      } else {
        const transformed = transformAffine({ source_x: oldX, source_y: oldY }, affine);
        nextX = transformed.x;
        nextY = transformed.y;
      }
      nextX = Math.round(nextX);
      nextY = Math.round(nextY);
      if (nextX !== Math.round(oldX) || nextY !== Math.round(oldY)) movedEntityCount++;
      return { ...row, world_x: nextX, world_y: nextY };
    });
    writeCsv(ENTITY_PREVIEW_FILE, nextEntityRows, entityColumns);
  }

  console.log("Sprint 3K gewogen locatie-herberekening");
  console.log(`Methode: ${useWeighted ? `weighted-ratio IDW power ${IDW_POWER}` : "affine"}`);
  console.log(`Kalibratiepunten gebruikt: ${calibrationPoints.length}`);
  console.log(`Verplaatste locaties: ${movedCount}/${nextRows.length}`);
  if (entityPointRows.length > 0) console.log(`Verplaatste exacte entity-punten: ${movedEntityCount}/${entityPointRows.length}`);
  console.log(`Preview geschreven: ${PREVIEW_FILE}`);
  if (entityPointRows.length > 0) console.log(`Entity-preview geschreven: ${ENTITY_PREVIEW_FILE}`);
  console.log(
    `Affine referentie: x = ${affine.a.toFixed(8)}*sx + ${affine.b.toFixed(8)}*sy + ${affine.c.toFixed(8)}`,
  );
  console.log(
    `Affine referentie: y = ${affine.d.toFixed(8)}*sx + ${affine.e.toFixed(8)}*sy + ${affine.f.toFixed(8)}`,
  );

  if (!writeEnabled) {
    console.log("Dry-run klaar. Voeg --write toe om CSV-templates te overschrijven.");
    return;
  }

  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const backupFile = `${LOCATIONS_FILE}.bak-sprint3k-${stamp}`;
  fs.copyFileSync(LOCATIONS_FILE, backupFile);
  writeCsv(LOCATIONS_FILE, nextRows, columns);
  console.log(`Backup geschreven: ${backupFile}`);
  console.log(`Template bijgewerkt: ${LOCATIONS_FILE}`);

  if (entityPointRows.length > 0) {
    const entityColumns = Object.keys(entityPointRows[0]);
    const entityBackupFile = `${ENTITY_POINTS_FILE}.bak-sprint3k-${stamp}`;
    fs.copyFileSync(ENTITY_POINTS_FILE, entityBackupFile);
    writeCsv(ENTITY_POINTS_FILE, nextEntityRows, entityColumns);
    console.log(`Entity-backup geschreven: ${entityBackupFile}`);
    console.log(`Entity-template bijgewerkt: ${ENTITY_POINTS_FILE}`);
  }
}

try {
  main();
} catch (error) {
  console.error("Sprint 3K herberekening mislukt:");
  console.error(error);
  process.exit(1);
}
