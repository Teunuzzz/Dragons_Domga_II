const path = require('path');
const Database = require('better-sqlite3');
const repoRoot = path.resolve(__dirname, '..');
const dbPath = path.join(repoRoot, 'database', 'DD2_Master.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
function idsFor(table, keyCol, keys, idCol) {
  if (!keys.length) return [];
  const placeholders = keys.map(() => '?').join(',');
  return db.prepare(`SELECT ${idCol} AS id FROM ${table} WHERE ${keyCol} IN (${placeholders})`).all(...keys).map(r => r.id);
}
function delIn(table, col, ids) {
  if (!ids.length) return 0;
  const placeholders = ids.map(() => '?').join(',');
  return db.prepare(`DELETE FROM ${table} WHERE ${col} IN (${placeholders})`).run(...ids).changes;
}
const tx = db.transaction(() => {
  const itemIds = idsFor('items','item_key',['starter_weapon_placeholder','golden_trove_beetle_placeholder'],'item_id');
  const questIds = idsFor('quests','quest_key',['test_intro_route'],'quest_id');
  const skillIds = idsFor('skills','skill_key',['fighter_skill_placeholder'],'skill_id');
  let total = 0;
  total += delIn('route_step_items','item_id',itemIds);
  total += delIn('vendor_inventory','item_id',itemIds);
  total += delIn('item_sources','item_id',itemIds);
  total += delIn('item_stats','item_id',itemIds);
  total += delIn('location_items','item_id',itemIds);
  if (questIds.length) {
    const stageIds = db.prepare(`SELECT quest_stage_id AS id FROM quest_stages WHERE quest_id IN (${questIds.map(() => '?').join(',')})`).all(...questIds).map(r => r.id);
    total += delIn('quest_objectives','quest_stage_id',stageIds);
    total += delIn('quest_choices','quest_id',questIds);
    total += delIn('quest_rewards','quest_id',questIds);
    total += delIn('quest_requirements','quest_id',questIds);
    total += delIn('quest_stages','quest_id',questIds);
  }
  total += db.prepare("DELETE FROM maister_teachings WHERE teaching_key = 'fighter_maister_placeholder'").run().changes;
  total += delIn('vocation_skill_links','skill_id',skillIds);
  total += delIn('skills','skill_id',skillIds);
  total += delIn('quests','quest_id',questIds);
  total += delIn('items','item_id',itemIds);
  total += db.prepare("DELETE FROM route_step_checklist_items WHERE checklist_key IN ('check_start_equipment','reach_melve')").run().changes;
  console.log(`Sprint 3B cleanup klaar. Verwijderde placeholder-rijen: ${total}`);
});
tx();
db.close();
