const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'app', 'public', 'data');

function readJson(fileName, fallback) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function asArray(value, preferredKeys = []) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    for (const key of preferredKeys) {
      if (Array.isArray(value[key])) return value[key];
    }
  }
  return [];
}

function normalizeKey(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || null;
}

function collectLocationKeys(value, result = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectLocationKeys(item, result));
    return result;
  }
  if (!value || typeof value !== 'object') return result;

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = normalizeKey(key) || '';
    if (normalizedKey.endsWith('location_key') || normalizedKey === 'location') {
      const locationKey = normalizeKey(nestedValue);
      if (locationKey) result.add(locationKey);
    }
    if (Array.isArray(nestedValue) || (nestedValue && typeof nestedValue === 'object')) {
      collectLocationKeys(nestedValue, result);
    }
  }
  return result;
}

function getRecordKey(record, entity) {
  return normalizeKey(record[`${entity}_key`] || record[`${entity}_slug`] || record.key || record.slug || record.name || record.title);
}

function reportEntity(entityName, records, entityKey) {
  const withLocations = [];
  const withoutLocations = [];

  for (const record of records) {
    const locationKeys = collectLocationKeys(record);
    if (locationKeys.size > 0) withLocations.push(record);
    else withoutLocations.push(record);
  }

  console.log(`\n${entityName}`);
  console.log(`- totaal: ${records.length}`);
  console.log(`- met locatiekoppeling: ${withLocations.length}`);
  console.log(`- zonder locatiekoppeling: ${withoutLocations.length}`);

  if (withoutLocations.length > 0) {
    console.log('- eerste zonder locatie:');
    withoutLocations.slice(0, 20).forEach((record) => {
      console.log(`  - ${getRecordKey(record, entityKey) || JSON.stringify(record).slice(0, 80)}`);
    });
  }
}

function main() {
  const items = asArray(readJson('item_details.json', []), ['item_details', 'items']);
  const quests = asArray(readJson('quest_details.json', []), ['quest_details', 'quests']);
  const npcs = asArray(readJson('npcs.json', []), ['npcs']);
  const vendors = asArray(readJson('vendors.json', []), ['vendors']);
  const vocations = asArray(readJson('vocations.json', []), ['vocations']);

  console.log('DD2 locatiekoppeling coverage');
  console.log('Data-map:', DATA_DIR);
  reportEntity('Items', items, 'item');
  reportEntity('Quests', quests, 'quest');
  reportEntity('NPCs', npcs, 'npc');
  reportEntity('Vendors', vendors, 'vendor');
  reportEntity('Vocations', vocations, 'vocation');
}

main();
