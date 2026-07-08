#!/usr/bin/env node
/*
  Sprint 4B.4 global map recalibration.

  Reads exact user-supplied calibration points from:
    database/imports/templates/map_global_calibration_points_import_template.csv

  Then recalculates:
    database/imports/templates/locations_import_template.csv
    database/imports/templates/entity_map_points_import_template.csv

  Method:
    Local weighted affine interpolation. For every map point, the tool fits a
    small affine transform from the nearest calibration anchors and evaluates
    that transform at the point. Exact calibration targets are snapped to the
    user-provided coordinate.
*/

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE_DIR = path.join(ROOT, 'database', 'imports', 'templates');
const GENERATED_DIR = path.join(ROOT, 'database', 'imports', 'generated');

const CAL_FILE = path.join(TEMPLATE_DIR, 'map_global_calibration_points_import_template.csv');
const LOC_FILE = path.join(TEMPLATE_DIR, 'locations_import_template.csv');
const POINT_FILE = path.join(TEMPLATE_DIR, 'entity_map_points_import_template.csv');

const WRITE = process.argv.includes('--write');
const BACKUP = process.argv.includes('--backup');
const METHOD = getArg('--method') || 'local-affine';
const NEIGHBORS = Number(getArg('--neighbors') || 8);
const POWER = Number(getArg('--power') || 2);
const MAX_MOVE_WARN = Number(getArg('--max-move-warn') || 180);
const SNAP_EPS = 0.001;

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  const prefix = `${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

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

function readCsv(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Bestand ontbreekt: ${file}`);
  }
  return parseCsv(fs.readFileSync(file, 'utf8'));
}

function writeCsv(file, header, records) {
  fs.writeFileSync(file, stringifyCsv(header, records), 'utf8');
}

function numberOrNull(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const num = Number(String(value).trim());
  return Number.isFinite(num) ? num : null;
}

function roundCoord(value) {
  return String(Math.round(value));
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function loadRows() {
  const locations = readCsv(LOC_FILE);
  const points = readCsv(POINT_FILE);
  const calibration = readCsv(CAL_FILE);
  return { locations, points, calibration };
}

function buildIndexes(locRecords, pointRecords) {
  const locationsByKey = new Map();
  const pointsByKey = new Map();
  locRecords.forEach((row) => locationsByKey.set(row.location_key, row));
  pointRecords.forEach((row) => pointsByKey.set(row.point_key, row));
  return { locationsByKey, pointsByKey };
}

function resolveAnchor(row, indexes) {
  const targetType = String(row.target_type || '').trim();
  const targetKey = String(row.target_key || '').trim();
  if (!targetType || !targetKey) return null;

  if (targetType === 'location') {
    const target = indexes.locationsByKey.get(targetKey);
    if (!target) return null;
    const x = numberOrNull(target.world_x);
    const y = numberOrNull(target.world_y);
    if (x === null || y === null) return null;
    return { targetType, targetKey, oldX: x, oldY: y, sourceRow: target };
  }

  if (targetType === 'entity_point' || targetType === 'point') {
    const target = indexes.pointsByKey.get(targetKey);
    if (!target) return null;
    const x = numberOrNull(target.world_x);
    const y = numberOrNull(target.world_y);
    if (x === null || y === null) return null;
    return { targetType: 'entity_point', targetKey, oldX: x, oldY: y, sourceRow: target };
  }

  return null;
}

function buildAnchors(calRecords, indexes) {
  const anchors = [];
  const skipped = [];

  calRecords.forEach((row) => {
    const correctX = numberOrNull(row.correct_x);
    const correctY = numberOrNull(row.correct_y);
    if (correctX === null || correctY === null) {
      skipped.push({ key: row.calibration_key, reason: 'geen correct_x/correct_y' });
      return;
    }

    const resolved = resolveAnchor(row, indexes);
    if (!resolved) {
      skipped.push({ key: row.calibration_key, reason: `target niet gevonden: ${row.target_type}/${row.target_key}` });
      return;
    }

    const weight = numberOrNull(row.weight) ?? 1;
    anchors.push({
      key: row.calibration_key,
      targetType: resolved.targetType,
      targetKey: resolved.targetKey,
      oldX: resolved.oldX,
      oldY: resolved.oldY,
      x: resolved.oldX,
      y: resolved.oldY,
      correctX,
      correctY,
      dx: correctX - resolved.oldX,
      dy: correctY - resolved.oldY,
      weight: Math.max(weight, 0.001),
      locked: String(row.locked || '1') === '1',
      notes: row.notes || '',
    });
  });

  return { anchors, skipped };
}

function solveLinear3(matrix, vector) {
  const a = matrix.map((row, i) => [...row, vector[i]]);
  for (let col = 0; col < 3; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < 3; r += 1) {
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    }
    if (Math.abs(a[pivot][col]) < 1e-9) return null;
    if (pivot !== col) [a[pivot], a[col]] = [a[col], a[pivot]];

    const div = a[col][col];
    for (let c = col; c < 4; c += 1) a[col][c] /= div;

    for (let r = 0; r < 3; r += 1) {
      if (r === col) continue;
      const factor = a[r][col];
      for (let c = col; c < 4; c += 1) a[r][c] -= factor * a[col][c];
    }
  }
  return [a[0][3], a[1][3], a[2][3]];
}

function weightedAffine(point, anchors) {
  if (anchors.length < 3) return null;

  const sorted = anchors
    .map((anchor) => ({ anchor, dist: distance(point, anchor) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, Math.max(3, Math.min(NEIGHBORS, anchors.length)));

  const normal = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const bx = [0, 0, 0];
  const by = [0, 0, 0];

  sorted.forEach(({ anchor, dist }) => {
    const w = anchor.weight / Math.pow(Math.max(dist, 1), POWER);
    const v = [anchor.oldX, anchor.oldY, 1];
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) normal[r][c] += w * v[r] * v[c];
      bx[r] += w * v[r] * anchor.correctX;
      by[r] += w * v[r] * anchor.correctY;
    }
  });

  const cx = solveLinear3(normal, bx);
  const cy = solveLinear3(normal, by);
  if (!cx || !cy) return null;

  return {
    x: cx[0] * point.x + cx[1] * point.y + cx[2],
    y: cy[0] * point.x + cy[1] * point.y + cy[2],
    method: 'local-affine',
  };
}

function idwDisplacement(point, anchors) {
  let sumW = 0;
  let sumDx = 0;
  let sumDy = 0;

  anchors.forEach((anchor) => {
    const dist = distance(point, anchor);
    if (dist < SNAP_EPS) {
      sumW = 1;
      sumDx = anchor.dx;
      sumDy = anchor.dy;
      return;
    }
    const w = anchor.weight / Math.pow(Math.max(dist, 1), POWER);
    sumW += w;
    sumDx += w * anchor.dx;
    sumDy += w * anchor.dy;
  });

  if (sumW <= 0) return { x: point.x, y: point.y, method: 'no-op' };
  return {
    x: point.x + sumDx / sumW,
    y: point.y + sumDy / sumW,
    method: 'idw-displacement',
  };
}

function recalibratePoint(point, anchors) {
  const exact = anchors.find((anchor) =>
    anchor.targetType === point.targetType && anchor.targetKey === point.targetKey
  );
  if (exact) {
    return { x: exact.correctX, y: exact.correctY, method: 'snap-anchor' };
  }

  if (METHOD === 'idw') return idwDisplacement(point, anchors);
  return weightedAffine(point, anchors) || idwDisplacement(point, anchors);
}

function applyToLocations(locationRows, anchors) {
  const changes = [];
  const updated = locationRows.map((row) => {
    const oldX = numberOrNull(row.world_x);
    const oldY = numberOrNull(row.world_y);
    if (oldX === null || oldY === null) return row;

    const result = recalibratePoint({ x: oldX, y: oldY, targetType: 'location', targetKey: row.location_key }, anchors);
    const newX = Math.round(result.x);
    const newY = Math.round(result.y);
    const move = Math.sqrt((newX - oldX) ** 2 + (newY - oldY) ** 2);

    const notes = row.notes || '';
    const stamp = `Globaal herberekend via Sprint 4B.4 (${result.method}, ${anchors.length} ankers).`;
    const next = {
      ...row,
      world_x: roundCoord(newX),
      world_y: roundCoord(newY),
      notes: notes.includes('Sprint 4B.4') ? notes : `${notes ? `${notes} ` : ''}${stamp}`,
      source_key: row.source_key || 'global_calibration',
    };

    changes.push({
      type: 'location',
      key: row.location_key,
      name: row.name,
      oldX,
      oldY,
      newX,
      newY,
      move: Math.round(move),
      method: result.method,
      warn: move > MAX_MOVE_WARN ? 'grote verplaatsing' : '',
    });
    return next;
  });
  return { updated, changes };
}

function applyToEntityPoints(pointRows, anchors) {
  const changes = [];
  const updated = pointRows.map((row) => {
    const oldX = numberOrNull(row.world_x);
    const oldY = numberOrNull(row.world_y);
    if (oldX === null || oldY === null) return row;

    const result = recalibratePoint({ x: oldX, y: oldY, targetType: 'entity_point', targetKey: row.point_key }, anchors);
    const newX = Math.round(result.x);
    const newY = Math.round(result.y);
    const move = Math.sqrt((newX - oldX) ** 2 + (newY - oldY) ** 2);

    const notes = row.notes || '';
    const stamp = `Globaal herberekend via Sprint 4B.4 (${result.method}, ${anchors.length} ankers).`;
    const next = {
      ...row,
      world_x: roundCoord(newX),
      world_y: roundCoord(newY),
      notes: notes.includes('Sprint 4B.4') ? notes : `${notes ? `${notes} ` : ''}${stamp}`,
      accuracy_level: result.method === 'snap-anchor' ? 'verified' : (row.accuracy_level || 'estimated_high'),
      is_verified: result.method === 'snap-anchor' ? '1' : row.is_verified,
      source_key: row.source_key || 'global_calibration',
    };

    changes.push({
      type: 'entity_point',
      key: row.point_key,
      name: row.name,
      oldX,
      oldY,
      newX,
      newY,
      move: Math.round(move),
      method: result.method,
      warn: move > MAX_MOVE_WARN ? 'grote verplaatsing' : '',
    });
    return next;
  });
  return { updated, changes };
}

function writeReport(anchors, skipped, changes) {
  ensureDir(GENERATED_DIR);
  const reportFile = path.join(GENERATED_DIR, 'global_map_recalibration_report.csv');
  writeCsv(
    reportFile,
    ['type', 'key', 'name', 'old_x', 'old_y', 'new_x', 'new_y', 'move_px', 'method', 'warn'],
    changes.map((change) => ({
      type: change.type,
      key: change.key,
      name: change.name,
      old_x: change.oldX,
      old_y: change.oldY,
      new_x: change.newX,
      new_y: change.newY,
      move_px: change.move,
      method: change.method,
      warn: change.warn,
    }))
  );

  const anchorFile = path.join(GENERATED_DIR, 'global_map_calibration_anchors_resolved.csv');
  writeCsv(
    anchorFile,
    ['calibration_key', 'target_type', 'target_key', 'old_x', 'old_y', 'correct_x', 'correct_y', 'delta_x', 'delta_y', 'locked', 'notes'],
    anchors.map((anchor) => ({
      calibration_key: anchor.key,
      target_type: anchor.targetType,
      target_key: anchor.targetKey,
      old_x: anchor.oldX,
      old_y: anchor.oldY,
      correct_x: anchor.correctX,
      correct_y: anchor.correctY,
      delta_x: anchor.dx,
      delta_y: anchor.dy,
      locked: anchor.locked ? '1' : '0',
      notes: anchor.notes,
    }))
  );

  const skippedFile = path.join(GENERATED_DIR, 'global_map_calibration_skipped.csv');
  writeCsv(skippedFile, ['calibration_key', 'reason'], skipped.map((row) => ({ calibration_key: row.key, reason: row.reason })));

  return { reportFile, anchorFile, skippedFile };
}

function backup(file) {
  if (!BACKUP) return null;
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const backupFile = `${file}.bak-global-map-${stamp}`;
  fs.copyFileSync(file, backupFile);
  return backupFile;
}

function main() {
  console.log('Sprint 4B.4 global map recalibration');
  console.log(`Methode: ${METHOD}; neighbors=${NEIGHBORS}; power=${POWER}`);
  console.log(`Write mode: ${WRITE ? 'aan' : 'uit / preview'}`);

  const { locations, points, calibration } = loadRows();
  const indexes = buildIndexes(locations.records, points.records);
  const { anchors, skipped } = buildAnchors(calibration.records, indexes);

  if (anchors.length < 3) {
    throw new Error(`Minimaal 3 bruikbare kalibratiepunten nodig; gevonden: ${anchors.length}`);
  }

  const locResult = applyToLocations(locations.records, anchors);
  const pointResult = applyToEntityPoints(points.records, anchors);
  const changes = [...locResult.changes, ...pointResult.changes];
  const reports = writeReport(anchors, skipped, changes);

  const moved = changes.filter((change) => change.move > 0);
  const warnings = changes.filter((change) => change.warn);
  const topMoves = [...changes].sort((a, b) => b.move - a.move).slice(0, 12);

  console.log(`Bruikbare ankers: ${anchors.length}`);
  console.log(`Overgeslagen ankers: ${skipped.length}`);
  skipped.forEach((row) => console.log(`- overgeslagen: ${row.key}: ${row.reason}`));
  console.log(`Locations verwerkt: ${locResult.changes.length}; verplaatst: ${moved.filter((c) => c.type === 'location').length}`);
  console.log(`Entity-punten verwerkt: ${pointResult.changes.length}; verplaatst: ${moved.filter((c) => c.type === 'entity_point').length}`);
  console.log(`Waarschuwingen > ${MAX_MOVE_WARN}px: ${warnings.length}`);

  if (topMoves.length) {
    console.log('Grootste verplaatsingen:');
    topMoves.forEach((change) => console.log(`- ${change.type}/${change.key}: ${change.oldX},${change.oldY} -> ${change.newX},${change.newY} (${change.move}px, ${change.method})`));
  }

  console.log(`Rapport: ${reports.reportFile}`);
  console.log(`Resolved anchors: ${reports.anchorFile}`);
  if (skipped.length) console.log(`Overgeslagen anchors: ${reports.skippedFile}`);

  if (WRITE) {
    const locBackup = backup(LOC_FILE);
    const pointBackup = backup(POINT_FILE);
    writeCsv(LOC_FILE, locations.header, locResult.updated);
    writeCsv(POINT_FILE, points.header, pointResult.updated);
    if (locBackup) console.log(`Backup locations: ${locBackup}`);
    if (pointBackup) console.log(`Backup entity-punten: ${pointBackup}`);
    if (!BACKUP) console.log('Geen backupbestanden gemaakt. Gebruik --backup als je lokale .bak-bestanden wilt.');
    console.log(`Template bijgewerkt: ${LOC_FILE}`);
    console.log(`Template bijgewerkt: ${POINT_FILE}`);
  } else {
    const locPreview = path.join(GENERATED_DIR, 'locations_global_recalibration_preview.csv');
    const pointPreview = path.join(GENERATED_DIR, 'entity_points_global_recalibration_preview.csv');
    writeCsv(locPreview, locations.header, locResult.updated);
    writeCsv(pointPreview, points.header, pointResult.updated);
    console.log(`Preview locations: ${locPreview}`);
    console.log(`Preview entity-punten: ${pointPreview}`);
    console.log('Gebruik --write om de templates echt bij te werken.');
  }
}

try {
  main();
} catch (error) {
  console.error('Sprint 4B.4 global map recalibration mislukt:');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
}
