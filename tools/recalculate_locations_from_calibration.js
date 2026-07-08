#!/usr/bin/env node
/*
  Sprint 4B.5 stable map recalibration.

  This is the safe recalculation path for the DD2 map.

  Important rule:
  - Use location_seed_points_import_template.csv as the source coordinate system.
  - Use location_calibration_points_import_template.csv as the user's exact target system.
  - Do NOT treat already-rendered current world_x/world_y as source coordinates for
    every row, because that double-calibrates points and can push markers into sea.

  The tool updates:
    database/imports/templates/locations_import_template.csv
    database/imports/templates/entity_map_points_import_template.csv

  Run:
    npm.cmd run recalculate:locations -- --write
*/

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEMPLATE_DIR = path.join(ROOT_DIR, 'database', 'imports', 'templates');
const GENERATED_DIR = path.join(ROOT_DIR, 'database', 'imports', 'generated');

const LOCATIONS_FILE = path.join(TEMPLATE_DIR, 'locations_import_template.csv');
const SEED_FILE = path.join(TEMPLATE_DIR, 'location_seed_points_import_template.csv');
const CALIBRATION_FILE = path.join(TEMPLATE_DIR, 'location_calibration_points_import_template.csv');
const ENTITY_POINTS_FILE = path.join(TEMPLATE_DIR, 'entity_map_points_import_template.csv');

const PREVIEW_FILE = path.join(GENERATED_DIR, 'locations_import_template_recalculated_preview.csv');
const ENTITY_PREVIEW_FILE = path.join(GENERATED_DIR, 'entity_map_points_recalculated_preview.csv');
const REPORT_FILE = path.join(GENERATED_DIR, 'stable_map_recalculation_report.csv');

const writeEnabled = process.argv.includes('--write');
const backupEnabled = process.argv.includes('--backup');
const methodArg = process.argv.find((arg) => arg.startsWith('--method='));
const methodSeparateIndex = process.argv.indexOf('--method');
const recalculationMethod = (
  methodArg ? methodArg.split('=')[1] :
  methodSeparateIndex >= 0 ? process.argv[methodSeparateIndex + 1] :
  'weighted'
).toLowerCase();
const powerArg = process.argv.find((arg) => arg.startsWith('--power='));
const IDW_POWER = Number(powerArg?.split('=')[1] ?? 2);
const PULL_ENTITY_TO_PARENT_DISTANCE = Number(
  (process.argv.find((arg) => arg.startsWith('--pull-entity-distance=')) || '').split('=')[1] ?? 140,
);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.replace(/\r$/, ''));
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ''));
    if (row.some((value) => value !== '')) rows.push(row);
  }

  if (!rows.length) return { header: [], records: [] };
  const header = rows[0].map((value) => value.trim());
  const records = rows.slice(1).map((values) => {
    const record = {};
    header.forEach((name, index) => {
      record[name] = values[index] ?? '';
    });
    return record;
  });
  return { header, records };
}

function stringifyCsv(header, records) {
  const escapeCell = (value) => {
    const raw = value === undefined || value === null ? '' : String(value);
    if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
    return raw;
  };
  return [header.join(','), ...records.map((record) => header.map((name) => escapeCell(record[name])).join(','))].join('\n') + '\n';
}

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) return { header: [], records: [] };
  return parseCsv(fs.readFileSync(filePath, 'utf8'));
}

function writeCsv(filePath, header, records) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, stringifyCsv(header, records), 'utf8');
}

function toNumber(value, fallback = null) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  const numberValue = Number(String(value).trim());
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function isLocked(value) {
  if (value === undefined || value === null || value === '') return true;
  const text = String(value).trim().toLowerCase();
  return text === '1' || text === 'true' || text === 'yes' || text === 'ja';
}

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function cleanNotes(notes) {
  return String(notes ?? '')
    .replace(/\s*Herkalibreerd via Sprint 3G met \d+ kalibratiepunten\./g, '')
    .replace(/\s*Herkalibreerd via Sprint 3K \([^)]*\) met \d+ kalibratiepunten\./g, '')
    .replace(/\s*Globaal herberekend via Sprint 4B\.4 \([^)]*\)\./g, '')
    .replace(/\s*Stabiel herberekend via Sprint 4B\.5 \([^)]*\) met \d+ kalibratiepunten\./g, '')
    .trim();
}

function solveLinearSystem(matrix, vector) {
  const n = vector.length;
  const a = matrix.map((row, index) => [...row, vector[index]]);

  for (let col = 0; col < n; col += 1) {
    let pivotRow = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivotRow][col])) pivotRow = row;
    }

    if (Math.abs(a[pivotRow][col]) < 1e-9) {
      throw new Error('Kalibratiematrix is niet oplosbaar. Gebruik minimaal 3 gespreide kalibratiepunten.');
    }

    [a[col], a[pivotRow]] = [a[pivotRow], a[col]];
    const pivot = a[col][col];
    for (let j = col; j <= n; j += 1) a[col][j] /= pivot;

    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let j = col; j <= n; j += 1) a[row][j] -= factor * a[col][j];
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
    for (let i = 0; i < 6; i += 1) {
      atb[i] += rowX[i] * point.corrected_x + rowY[i] * point.corrected_y;
      for (let j = 0; j < 6; j += 1) {
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
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.0001) {
      return { x: Math.round(point.corrected_x), y: Math.round(point.corrected_y) };
    }
    const weight = 1 / Math.pow(Math.max(dist, 1), power);
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

function hasExplicitSeed(seedRowsByKey, locationKey) {
  return seedRowsByKey.has(locationKey);
}

function deterministicOffset(key, radius = 12) {
  const text = String(key || 'point');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  const angle = (Math.abs(hash) % 360) * Math.PI / 180;
  const step = 5 + (Math.abs(hash >> 8) % Math.max(1, radius - 4));
  return { dx: Math.round(Math.cos(angle) * step), dy: Math.round(Math.sin(angle) * step) };
}

function main() {
  const locationCsv = readCsv(LOCATIONS_FILE);
  const seedCsv = readCsv(SEED_FILE);
  const calibrationCsv = readCsv(CALIBRATION_FILE);
  const entityCsv = readCsv(ENTITY_POINTS_FILE);

  const locationRows = locationCsv.records;
  const seedRows = seedCsv.records;
  const calibrationRows = calibrationCsv.records;
  const entityPointRows = entityCsv.records;

  if (locationRows.length === 0) throw new Error(`Geen locaties gevonden: ${LOCATIONS_FILE}`);
  if (seedRows.length === 0) throw new Error(`Geen seed points gevonden: ${SEED_FILE}`);
  if (calibrationRows.length < 3) throw new Error('Minimaal 3 kalibratiepunten nodig.');

  const rowsByKey = new Map(locationRows.map((row) => [row.location_key, row]));
  const explicitSeedsByKey = new Map(seedRows.map((row) => [row.location_key, {
    ...row,
    source_x: toNumber(row.source_x),
    source_y: toNumber(row.source_y),
    offset_x: toNumber(row.offset_x, 0),
    offset_y: toNumber(row.offset_y, 0),
  }]));

  const seedsByKey = new Map(explicitSeedsByKey);
  const fallbackSeedKeys = new Set();
  // Fallback seeds are only for resolving a locked calibration row that lacks a seed.
  // They must never be globally transformed again, otherwise already-rendered world_x/y
  // coordinates become a fake source system and points can drift into sea.
  for (const row of locationRows) {
    if (!row.location_key || seedsByKey.has(row.location_key)) continue;
    const worldX = toNumber(row.world_x);
    const worldY = toNumber(row.world_y);
    if (worldX === null || worldY === null) continue;
    seedsByKey.set(row.location_key, {
      location_key: row.location_key,
      source_type: 'fallback_current_position',
      parent_location_key: '',
      source_x: worldX,
      source_y: worldY,
      offset_x: 0,
      offset_y: 0,
      notes: 'Fallback seed from current locations_import_template.csv; only for locked calibration rows.',
    });
    fallbackSeedKeys.add(row.location_key);
  }

  const calibrationByKey = new Map();
  const skippedCalibration = [];
  for (const row of calibrationRows) {
    if (!row.location_key) continue;
    const seed = seedsByKey.get(row.location_key);
    const correctedX = toNumber(row.corrected_x);
    const correctedY = toNumber(row.corrected_y);
    if (correctedX === null || correctedY === null) {
      skippedCalibration.push({ location_key: row.location_key, reason: 'geen corrected_x/corrected_y' });
      continue;
    }
    if (!seed || seed.source_x === null || seed.source_y === null) {
      skippedCalibration.push({ location_key: row.location_key, reason: 'geen seed/source-coord' });
      continue;
    }
    calibrationByKey.set(row.location_key, {
      location_key: row.location_key,
      source_x: seed.source_x,
      source_y: seed.source_y,
      corrected_x: correctedX,
      corrected_y: correctedY,
      locked: isLocked(row.locked),
      fallbackSeed: fallbackSeedKeys.has(row.location_key),
    });
  }

  const calibrationPoints = Array.from(calibrationByKey.values()).filter(
    (point) => point.corrected_x !== null && point.corrected_y !== null,
  );
  if (calibrationPoints.length < 3) throw new Error('Minder dan 3 bruikbare kalibratiepunten gevonden na validatie.');

  const affine = fitAffine(calibrationPoints);
  const useWeighted = recalculationMethod !== 'affine';
  const nextByKey = new Map();
  const oldByKey = new Map();
  const locationChanges = [];

  function transformSeed(seed) {
    return useWeighted
      ? transformWeighted(seed, calibrationPoints)
      : transformAffine(seed, affine);
  }

  function computeLocation(row) {
    if (nextByKey.has(row.location_key)) return nextByKey.get(row.location_key);

    const explicitSeed = explicitSeedsByKey.get(row.location_key);
    const seed = seedsByKey.get(row.location_key);
    const oldX = toNumber(row.world_x, 0);
    const oldY = toNumber(row.world_y, 0);
    oldByKey.set(row.location_key, { x: oldX, y: oldY });
    const calibration = calibrationByKey.get(row.location_key);
    let nextX = oldX;
    let nextY = oldY;
    let method = 'kept-current';

    if (calibration && calibration.locked) {
      nextX = calibration.corrected_x;
      nextY = calibration.corrected_y;
      method = 'locked-calibration';
    } else if (explicitSeed && explicitSeed.source_type === 'computed_offset' && explicitSeed.parent_location_key) {
      const parentRow = rowsByKey.get(explicitSeed.parent_location_key);
      if (parentRow) {
        const parent = computeLocation(parentRow);
        nextX = parent.x + (explicitSeed.offset_x ?? 0);
        nextY = parent.y + (explicitSeed.offset_y ?? 0);
        method = 'parent-offset';
      } else if (explicitSeed.source_x !== null && explicitSeed.source_y !== null) {
        const transformed = transformSeed(explicitSeed);
        nextX = transformed.x;
        nextY = transformed.y;
        method = useWeighted ? 'weighted-seed' : 'affine-seed';
      }
    } else if (
      explicitSeed &&
      explicitSeed.source_type !== 'manual_exact' &&
      explicitSeed.source_x !== null &&
      explicitSeed.source_y !== null
    ) {
      const transformed = transformSeed(explicitSeed);
      nextX = transformed.x;
      nextY = transformed.y;
      method = useWeighted ? 'weighted-seed' : 'affine-seed';
    } else if (calibration) {
      nextX = calibration.corrected_x;
      nextY = calibration.corrected_y;
      method = 'unlocked-calibration';
    }

    nextX = Math.round(nextX);
    nextY = Math.round(nextY);
    const result = { x: nextX, y: nextY, method };
    nextByKey.set(row.location_key, result);
    locationChanges.push({
      location_key: row.location_key,
      name: row.name,
      old_x: Math.round(oldX),
      old_y: Math.round(oldY),
      new_x: nextX,
      new_y: nextY,
      move_px: Math.round(Math.sqrt((nextX - oldX) ** 2 + (nextY - oldY) ** 2)),
      method,
    });
    return result;
  }

  const nextRows = locationRows.map((row) => {
    const next = computeLocation(row);
    const notes = cleanNotes(row.notes);
    const stamp = `Stabiel herberekend via Sprint 4B.5 (${next.method}) met ${calibrationPoints.length} kalibratiepunten.`;
    return {
      ...row,
      world_x: next.x,
      world_y: next.y,
      notes: `${notes}${notes ? ' ' : ''}${stamp}`,
      source_key: row.source_key || 'own_calibration',
    };
  });

  writeCsv(PREVIEW_FILE, locationCsv.header, nextRows);

  let nextEntityRows = [];
  const entityChanges = [];
  if (entityPointRows.length > 0) {
    nextEntityRows = entityPointRows.map((row) => {
      const oldX = toNumber(row.world_x);
      const oldY = toNumber(row.world_y);
      if (oldX === null || oldY === null) return row;

      let nextX = oldX;
      let nextY = oldY;
      let method = 'kept-current';
      const locationKey = row.location_key;
      const oldLocation = locationKey ? oldByKey.get(locationKey) : null;
      const nextLocation = locationKey ? nextByKey.get(locationKey) : null;
      const sourceKey = String(row.source_key || '').toLowerCase();
      const accuracy = String(row.accuracy_level || '').toLowerCase();
      const isVerified = String(row.is_verified || '').trim() === '1';
      const looksEstimated = !isVerified && (accuracy.includes('estimated') || accuracy.includes('low') || sourceKey === 'game8' || sourceKey === 'community_crosscheck');

      if (oldLocation && nextLocation) {
        nextX = oldX + (nextLocation.x - oldLocation.x);
        nextY = oldY + (nextLocation.y - oldLocation.y);
        method = 'shift-with-linked-location';

        const distanceToLinkedLocation = Math.sqrt((nextX - nextLocation.x) ** 2 + (nextY - nextLocation.y) ** 2);
        if (looksEstimated && distanceToLinkedLocation > PULL_ENTITY_TO_PARENT_DISTANCE) {
          const offset = deterministicOffset(row.point_key || row.entity_key, 14);
          nextX = nextLocation.x + offset.dx;
          nextY = nextLocation.y + offset.dy;
          method = 'pulled-to-linked-location';
        }
      } else if (looksEstimated) {
        // No trustworthy parent: do not reproject an already-rendered screen coordinate.
        // Keep it where it is until a source-map or manual calibration row exists.
        method = 'kept-estimated-no-parent';
      }

      nextX = Math.round(nextX);
      nextY = Math.round(nextY);
      entityChanges.push({
        point_key: row.point_key,
        entity_type: row.entity_type,
        entity_key: row.entity_key,
        location_key: row.location_key,
        old_x: Math.round(oldX),
        old_y: Math.round(oldY),
        new_x: nextX,
        new_y: nextY,
        move_px: Math.round(Math.sqrt((nextX - oldX) ** 2 + (nextY - oldY) ** 2)),
        method,
      });

      const notes = cleanNotes(row.notes);
      const stamp = `Stabiel herberekend via Sprint 4B.5 (${method}) met ${calibrationPoints.length} kalibratiepunten.`;
      return {
        ...row,
        world_x: nextX,
        world_y: nextY,
        notes: `${notes}${notes ? ' ' : ''}${stamp}`,
        source_key: row.source_key || 'own_calibration',
      };
    });
    writeCsv(ENTITY_PREVIEW_FILE, entityCsv.header, nextEntityRows);
  }

  writeCsv(
    REPORT_FILE,
    ['record_type', 'key', 'name', 'old_x', 'old_y', 'new_x', 'new_y', 'move_px', 'method'],
    [
      ...locationChanges.map((row) => ({
        record_type: 'location',
        key: row.location_key,
        name: row.name,
        old_x: row.old_x,
        old_y: row.old_y,
        new_x: row.new_x,
        new_y: row.new_y,
        move_px: row.move_px,
        method: row.method,
      })),
      ...entityChanges.map((row) => ({
        record_type: 'entity_point',
        key: row.point_key,
        name: row.entity_key,
        old_x: row.old_x,
        old_y: row.old_y,
        new_x: row.new_x,
        new_y: row.new_y,
        move_px: row.move_px,
        method: row.method,
      })),
    ],
  );

  const movedLocations = locationChanges.filter((row) => row.move_px > 0);
  const movedEntities = entityChanges.filter((row) => row.move_px > 0);
  const pulledEntities = entityChanges.filter((row) => row.method === 'pulled-to-linked-location');

  console.log('Sprint 4B.5 stabiele kaart-herberekening');
  console.log(`Methode: ${useWeighted ? `weighted seed-space IDW power ${IDW_POWER}` : 'affine seed-space'}`);
  console.log(`Kalibratiepunten gebruikt: ${calibrationPoints.length}`);
  console.log(`Overgeslagen kalibratiepunten: ${skippedCalibration.length}`);
  skippedCalibration.forEach((row) => console.log(`- overgeslagen: ${row.location_key}: ${row.reason}`));
  console.log(`Verplaatste locaties: ${movedLocations.length}/${nextRows.length}`);
  console.log(`Verplaatste exacte entity-punten: ${movedEntities.length}/${nextEntityRows.length}`);
  console.log(`Entity-punten terug naar gekoppelde locatie getrokken: ${pulledEntities.length}`);
  console.log(`Rapport geschreven: ${REPORT_FILE}`);
  console.log(`Preview locaties: ${PREVIEW_FILE}`);
  if (entityPointRows.length > 0) console.log(`Preview entity-punten: ${ENTITY_PREVIEW_FILE}`);

  const topLocationMoves = [...locationChanges].sort((a, b) => b.move_px - a.move_px).slice(0, 10);
  if (topLocationMoves.length > 0) {
    console.log('Grootste locatieverplaatsingen:');
    topLocationMoves.forEach((row) => console.log(`- ${row.location_key}: ${row.old_x},${row.old_y} -> ${row.new_x},${row.new_y} (${row.move_px}px, ${row.method})`));
  }

  if (!writeEnabled) {
    console.log('Dry-run klaar. Voeg --write toe om CSV-templates te overschrijven. Gebruik --backup voor lokale .bak-bestanden.');
    return;
  }

  if (backupEnabled) {
    const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    fs.copyFileSync(LOCATIONS_FILE, `${LOCATIONS_FILE}.bak-sprint4b5-${stamp}`);
    if (entityPointRows.length > 0) fs.copyFileSync(ENTITY_POINTS_FILE, `${ENTITY_POINTS_FILE}.bak-sprint4b5-${stamp}`);
    console.log('Backupbestanden geschreven omdat --backup is meegegeven.');
  }

  writeCsv(LOCATIONS_FILE, locationCsv.header, nextRows);
  console.log(`Template bijgewerkt: ${LOCATIONS_FILE}`);

  if (entityPointRows.length > 0) {
    writeCsv(ENTITY_POINTS_FILE, entityCsv.header, nextEntityRows);
    console.log(`Entity-template bijgewerkt: ${ENTITY_POINTS_FILE}`);
  }
}

try {
  main();
} catch (error) {
  console.error('Sprint 4B.5 herberekening mislukt:');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
}
