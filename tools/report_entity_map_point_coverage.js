const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'app', 'public', 'data');

function readJson(name) {
  const p = path.join(DATA_DIR, name);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function records(data, keys) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    for (const key of keys) {
      if (Array.isArray(data[key])) return data[key];
    }
  }
  return [];
}

function norm(v) {
  return String(v ?? '').trim().toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function keyOf(record, type) {
  return norm(record?.[`${type}_key`] ?? record?.key ?? record?.slug ?? record?.name);
}

const points = records(readJson('entity_map_points.json'), ['entity_map_points', 'points']);
const pointTypes = new Map();
for (const p of points) {
  const type = norm(p.entity_type);
  const key = norm(p.entity_key);
  if (!type || !key) continue;
  const set = pointTypes.get(type) ?? new Set();
  set.add(key);
  pointTypes.set(type, set);
}

const groups = [
  ['Items', 'item', records(readJson('items.json'), ['items'])],
  ['Quests', 'quest', records(readJson('quests.json'), ['quests'])],
  ['NPCs', 'npc', records(readJson('npcs.json'), ['npcs'])],
  ['Vendors', 'vendor', records(readJson('vendors.json'), ['vendors'])],
  ['Vocations', 'vocation', records(readJson('vocations.json'), ['vocations'])],
];

console.log('DD2 exact entity map point coverage');
console.log('Data-map:', DATA_DIR);
console.log('Exact points totaal:', points.length);

for (const [label, type, list] of groups) {
  const pointSet = pointTypes.get(type) ?? new Set();
  const missing = [];
  let covered = 0;
  for (const r of list) {
    const key = keyOf(r, type);
    if (!key) continue;
    if (pointSet.has(key)) covered += 1;
    else missing.push(key);
  }
  console.log(`\n${label}`);
  console.log(`- totaal: ${list.length}`);
  console.log(`- met exact punt: ${covered}`);
  console.log(`- zonder exact punt: ${Math.max(0, list.length - covered)}`);
  if (missing.length) {
    console.log('- eerste zonder exact punt:');
    for (const key of missing.slice(0, 10)) console.log(`  - ${key}`);
  }
}

const routeStepPoints = points.filter((p) => norm(p.entity_type) === 'route_step');
const questObjectivePoints = points.filter((p) => norm(p.entity_type) === 'quest_objective');
console.log('\nRoute/objective points');
console.log(`- route_step: ${routeStepPoints.length}`);
console.log(`- quest_objective: ${questObjectivePoints.length}`);
