PRAGMA foreign_keys = ON;

-- =========================================================
-- DRAGON'S DOGMA II COMPANION APP
-- Sprint 3A - Walkthrough Content Expansion
-- SQLite remains the single source of truth.
-- Frontend reads exported JSON only.
--
-- This schema is additive and avoids ALTER TABLE so it can be
-- applied safely next to the current core/route-engine schema.
-- =========================================================

-- =========================================================
-- REFERENCE SOURCES
-- =========================================================
-- Existing table: sources
-- Existing table: source_refs
-- This file only adds indexes helpful for source-heavy content.

CREATE INDEX IF NOT EXISTS idx_sources_key ON sources(source_key);
CREATE INDEX IF NOT EXISTS idx_source_refs_source ON source_refs(source_id);
CREATE INDEX IF NOT EXISTS idx_source_refs_entity_type_key ON source_refs(entity_type, entity_key);

-- =========================================================
-- GAME FLAGS
-- =========================================================
-- Canonical flags used by requirements, rewards, checklist logic
-- and later local player progress.
-- Examples:
--   vocation_unlocked:warrior
--   quest_complete:seat_of_the_sovran
--   region_unlocked:battahl
--   item_obtained:two_hander
--   route_milestone:vernworth_reached

CREATE TABLE IF NOT EXISTS game_flags (
  flag_id INTEGER PRIMARY KEY AUTOINCREMENT,
  flag_key TEXT NOT NULL UNIQUE,
  flag_type TEXT NOT NULL DEFAULT 'generic',
  name TEXT NOT NULL,
  description TEXT,
  spoiler_level INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  source_id INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE INDEX IF NOT EXISTS idx_game_flags_type ON game_flags(flag_type);

-- =========================================================
-- OP ROUTE PHASES
-- =========================================================
-- Phases keep the OP walkthrough readable without changing the
-- existing op_route_steps table.

CREATE TABLE IF NOT EXISTS op_route_phases (
  phase_id INTEGER PRIMARY KEY AUTOINCREMENT,
  route_id INTEGER NOT NULL,
  phase_key TEXT NOT NULL,
  phase_order INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  short_name TEXT,
  description TEXT,
  goal_text TEXT,
  spoiler_level INTEGER NOT NULL DEFAULT 2,
  is_optional INTEGER NOT NULL DEFAULT 0,
  source_id INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (route_id, phase_key),
  FOREIGN KEY (route_id) REFERENCES op_routes(route_id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE TABLE IF NOT EXISTS op_route_phase_steps (
  phase_step_id INTEGER PRIMARY KEY AUTOINCREMENT,
  phase_id INTEGER NOT NULL,
  step_id INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  UNIQUE (phase_id, step_id),
  FOREIGN KEY (phase_id) REFERENCES op_route_phases(phase_id) ON DELETE CASCADE,
  FOREIGN KEY (step_id) REFERENCES op_route_steps(step_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_op_route_phases_route ON op_route_phases(route_id, phase_order);
CREATE INDEX IF NOT EXISTS idx_op_route_phase_steps_phase ON op_route_phase_steps(phase_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_op_route_phase_steps_step ON op_route_phase_steps(step_id);

-- =========================================================
-- STEP CHECKLIST ITEMS
-- =========================================================
-- UI checklist per walkthrough step. This is intentionally generic
-- so one step can say: talk to NPC, loot chest, buy item, unlock
-- vocation, complete quest objective, set flag, optional warning, etc.

CREATE TABLE IF NOT EXISTS route_step_checklist_items (
  checklist_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  step_id INTEGER NOT NULL,
  checklist_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  checklist_type TEXT NOT NULL DEFAULT 'action',
  entity_type TEXT,
  entity_key TEXT,
  is_required INTEGER NOT NULL DEFAULT 1,
  default_checked INTEGER NOT NULL DEFAULT 0,
  blocks_next_step INTEGER NOT NULL DEFAULT 0,
  grants_flag_key TEXT,
  spoiler_level INTEGER NOT NULL DEFAULT 2,
  notes TEXT,
  source_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (step_id, checklist_key),
  FOREIGN KEY (step_id) REFERENCES op_route_steps(step_id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE INDEX IF NOT EXISTS idx_step_checklist_step ON route_step_checklist_items(step_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_step_checklist_entity ON route_step_checklist_items(entity_type, entity_key);

-- =========================================================
-- MULTI-LOCATION STEP LINKS
-- =========================================================
-- Existing op_route_steps has one primary location_id. This table
-- adds secondary locations for steps that involve several places.

CREATE TABLE IF NOT EXISTS route_step_locations (
  route_step_location_id INTEGER PRIMARY KEY AUTOINCREMENT,
  step_id INTEGER NOT NULL,
  location_id INTEGER NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'related',
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  UNIQUE (step_id, location_id, relation_type),
  FOREIGN KEY (step_id) REFERENCES op_route_steps(step_id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(location_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_route_step_locations_step ON route_step_locations(step_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_route_step_locations_location ON route_step_locations(location_id);

-- =========================================================
-- NPCS AND VENDORS
-- =========================================================

CREATE TABLE IF NOT EXISTS npcs (
  npc_id INTEGER PRIMARY KEY AUTOINCREMENT,
  npc_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  npc_type TEXT NOT NULL DEFAULT 'npc',
  default_location_id INTEGER,
  region_id INTEGER,
  is_essential INTEGER NOT NULL DEFAULT 0,
  is_missable INTEGER NOT NULL DEFAULT 0,
  spoiler_level INTEGER NOT NULL DEFAULT 0,
  short_description TEXT,
  notes TEXT,
  source_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (default_location_id) REFERENCES locations(location_id),
  FOREIGN KEY (region_id) REFERENCES regions(region_id),
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE TABLE IF NOT EXISTS npc_locations (
  npc_location_id INTEGER PRIMARY KEY AUTOINCREMENT,
  npc_id INTEGER NOT NULL,
  location_id INTEGER NOT NULL,
  time_of_day TEXT,
  condition_flag_key TEXT,
  relation_type TEXT NOT NULL DEFAULT 'appears_at',
  notes TEXT,
  UNIQUE (npc_id, location_id, time_of_day, condition_flag_key, relation_type),
  FOREIGN KEY (npc_id) REFERENCES npcs(npc_id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(location_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendors (
  vendor_id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  npc_id INTEGER,
  location_id INTEGER,
  vendor_type TEXT NOT NULL DEFAULT 'shop',
  currency_type TEXT NOT NULL DEFAULT 'gold',
  spoiler_level INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  source_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (npc_id) REFERENCES npcs(npc_id),
  FOREIGN KEY (location_id) REFERENCES locations(location_id),
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE TABLE IF NOT EXISTS vendor_inventory (
  vendor_inventory_id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  price_gold INTEGER,
  stock_quantity INTEGER,
  restocks INTEGER NOT NULL DEFAULT 0,
  available_after_flag_key TEXT,
  available_before_flag_key TEXT,
  is_limited INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  source_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (vendor_id, item_id, available_after_flag_key),
  FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE INDEX IF NOT EXISTS idx_npcs_key ON npcs(npc_key);
CREATE INDEX IF NOT EXISTS idx_npcs_location ON npcs(default_location_id);
CREATE INDEX IF NOT EXISTS idx_vendor_inventory_vendor ON vendor_inventory(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_inventory_item ON vendor_inventory(item_id);

-- =========================================================
-- ITEM DETAILS AND SOURCES
-- =========================================================
-- items remains the core table. These tables add structured stats and
-- many-to-many acquisition sources.

CREATE TABLE IF NOT EXISTS item_stats (
  item_stat_id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL UNIQUE,
  equipment_slot TEXT,
  weapon_type TEXT,
  armor_type TEXT,
  strength INTEGER,
  magick INTEGER,
  defense INTEGER,
  magick_defense INTEGER,
  knockdown_power INTEGER,
  knockdown_resistance INTEGER,
  slash_strength INTEGER,
  strike_strength INTEGER,
  element TEXT,
  debilitations TEXT,
  stamina_bonus INTEGER,
  health_bonus INTEGER,
  carry_weight_bonus REAL,
  upgrade_notes TEXT,
  source_id INTEGER,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE TABLE IF NOT EXISTS item_sources (
  item_source_id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'location',
  location_id INTEGER,
  quest_id INTEGER,
  npc_id INTEGER,
  vendor_id INTEGER,
  boss_id INTEGER,
  source_flag_key TEXT,
  acquisition_method TEXT NOT NULL DEFAULT 'unknown',
  quantity INTEGER NOT NULL DEFAULT 1,
  price_gold INTEGER,
  is_repeatable INTEGER NOT NULL DEFAULT 0,
  is_missable INTEGER NOT NULL DEFAULT 0,
  spoiler_level INTEGER NOT NULL DEFAULT 0,
  priority_score INTEGER NOT NULL DEFAULT 50,
  notes TEXT,
  source_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (item_id, source_type, location_id, quest_id, npc_id, vendor_id, boss_id, source_flag_key),
  FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(location_id),
  FOREIGN KEY (quest_id) REFERENCES quests(quest_id),
  FOREIGN KEY (npc_id) REFERENCES npcs(npc_id),
  FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),
  FOREIGN KEY (boss_id) REFERENCES bosses(boss_id),
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE INDEX IF NOT EXISTS idx_item_stats_item ON item_stats(item_id);
CREATE INDEX IF NOT EXISTS idx_item_sources_item ON item_sources(item_id);
CREATE INDEX IF NOT EXISTS idx_item_sources_location ON item_sources(location_id);
CREATE INDEX IF NOT EXISTS idx_item_sources_quest ON item_sources(quest_id);
CREATE INDEX IF NOT EXISTS idx_item_sources_priority ON item_sources(priority_score);

-- =========================================================
-- QUEST DETAILS
-- =========================================================

CREATE TABLE IF NOT EXISTS quest_requirements (
  quest_requirement_id INTEGER PRIMARY KEY AUTOINCREMENT,
  quest_id INTEGER NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_key TEXT NOT NULL,
  operator TEXT NOT NULL DEFAULT 'exists',
  requirement_value TEXT,
  logic_group TEXT NOT NULL DEFAULT 'all',
  is_hard_requirement INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  UNIQUE (quest_id, requirement_type, requirement_key, logic_group),
  FOREIGN KEY (quest_id) REFERENCES quests(quest_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quest_stages (
  quest_stage_id INTEGER PRIMARY KEY AUTOINCREMENT,
  quest_id INTEGER NOT NULL,
  stage_key TEXT NOT NULL,
  stage_order INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  location_id INTEGER,
  npc_id INTEGER,
  grants_flag_key TEXT,
  spoiler_level INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  source_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (quest_id, stage_key),
  FOREIGN KEY (quest_id) REFERENCES quests(quest_id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(location_id),
  FOREIGN KEY (npc_id) REFERENCES npcs(npc_id),
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE TABLE IF NOT EXISTS quest_objectives (
  quest_objective_id INTEGER PRIMARY KEY AUTOINCREMENT,
  quest_stage_id INTEGER NOT NULL,
  objective_key TEXT NOT NULL,
  objective_order INTEGER NOT NULL DEFAULT 0,
  instruction TEXT NOT NULL,
  objective_type TEXT NOT NULL DEFAULT 'action',
  location_id INTEGER,
  npc_id INTEGER,
  item_id INTEGER,
  target_flag_key TEXT,
  is_optional INTEGER NOT NULL DEFAULT 0,
  spoiler_level INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  source_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (quest_stage_id, objective_key),
  FOREIGN KEY (quest_stage_id) REFERENCES quest_stages(quest_stage_id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(location_id),
  FOREIGN KEY (npc_id) REFERENCES npcs(npc_id),
  FOREIGN KEY (item_id) REFERENCES items(item_id),
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE TABLE IF NOT EXISTS quest_rewards (
  quest_reward_id INTEGER PRIMARY KEY AUTOINCREMENT,
  quest_id INTEGER NOT NULL,
  reward_type TEXT NOT NULL DEFAULT 'item',
  reward_key TEXT NOT NULL,
  item_id INTEGER,
  gold_amount INTEGER,
  xp_amount INTEGER,
  discipline_amount INTEGER,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  source_id INTEGER,
  UNIQUE (quest_id, reward_type, reward_key),
  FOREIGN KEY (quest_id) REFERENCES quests(quest_id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(item_id),
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE TABLE IF NOT EXISTS quest_choices (
  quest_choice_id INTEGER PRIMARY KEY AUTOINCREMENT,
  quest_id INTEGER NOT NULL,
  choice_key TEXT NOT NULL,
  choice_order INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  outcome_text TEXT,
  grants_flag_key TEXT,
  spoiler_level INTEGER NOT NULL DEFAULT 2,
  notes TEXT,
  source_id INTEGER,
  UNIQUE (quest_id, choice_key),
  FOREIGN KEY (quest_id) REFERENCES quests(quest_id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE INDEX IF NOT EXISTS idx_quest_requirements_quest ON quest_requirements(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_stages_quest ON quest_stages(quest_id, stage_order);
CREATE INDEX IF NOT EXISTS idx_quest_objectives_stage ON quest_objectives(quest_stage_id, objective_order);
CREATE INDEX IF NOT EXISTS idx_quest_rewards_quest ON quest_rewards(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_choices_quest ON quest_choices(quest_id, choice_order);

-- =========================================================
-- VOCATION / SKILL DETAILS
-- =========================================================
-- Existing table: vocations

CREATE TABLE IF NOT EXISTS vocation_unlocks (
  vocation_unlock_id INTEGER PRIMARY KEY AUTOINCREMENT,
  vocation_id INTEGER NOT NULL UNIQUE,
  unlock_method TEXT NOT NULL DEFAULT 'quest',
  unlock_location_id INTEGER,
  unlock_quest_id INTEGER,
  unlock_npc_id INTEGER,
  required_flag_key TEXT,
  grants_flag_key TEXT,
  is_arisen_only INTEGER NOT NULL DEFAULT 0,
  recommended_level INTEGER,
  priority_score INTEGER NOT NULL DEFAULT 50,
  spoiler_level INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  source_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vocation_id) REFERENCES vocations(vocation_id) ON DELETE CASCADE,
  FOREIGN KEY (unlock_location_id) REFERENCES locations(location_id),
  FOREIGN KEY (unlock_quest_id) REFERENCES quests(quest_id),
  FOREIGN KEY (unlock_npc_id) REFERENCES npcs(npc_id),
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE TABLE IF NOT EXISTS skills (
  skill_id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  skill_type TEXT NOT NULL DEFAULT 'weapon_skill',
  description TEXT,
  source_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE TABLE IF NOT EXISTS vocation_skill_links (
  vocation_skill_link_id INTEGER PRIMARY KEY AUTOINCREMENT,
  vocation_id INTEGER NOT NULL,
  skill_id INTEGER NOT NULL,
  unlock_rank INTEGER,
  discipline_cost INTEGER,
  is_maister_skill INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  UNIQUE (vocation_id, skill_id),
  FOREIGN KEY (vocation_id) REFERENCES vocations(vocation_id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS maister_teachings (
  maister_teaching_id INTEGER PRIMARY KEY AUTOINCREMENT,
  teaching_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  vocation_id INTEGER NOT NULL,
  skill_id INTEGER,
  npc_id INTEGER,
  location_id INTEGER,
  quest_id INTEGER,
  unlock_summary TEXT,
  item_key TEXT,
  spoiler_level INTEGER NOT NULL DEFAULT 2,
  notes TEXT,
  source_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vocation_id) REFERENCES vocations(vocation_id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(skill_id),
  FOREIGN KEY (npc_id) REFERENCES npcs(npc_id),
  FOREIGN KEY (location_id) REFERENCES locations(location_id),
  FOREIGN KEY (quest_id) REFERENCES quests(quest_id),
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE INDEX IF NOT EXISTS idx_vocation_unlocks_vocation ON vocation_unlocks(vocation_id);
CREATE INDEX IF NOT EXISTS idx_skills_key ON skills(skill_key);
CREATE INDEX IF NOT EXISTS idx_vocation_skill_links_vocation ON vocation_skill_links(vocation_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_maister_teachings_vocation ON maister_teachings(vocation_id);

-- =========================================================
-- EXPORT HELPERS / VIEWS
-- =========================================================

CREATE VIEW IF NOT EXISTS v_route_steps_enriched AS
SELECT
  r.route_key,
  r.name AS route_name,
  p.phase_key,
  p.name AS phase_name,
  p.phase_order,
  s.step_key,
  s.step_order,
  s.title,
  s.instruction,
  l.location_key,
  l.name AS location_name,
  l.world_x,
  l.world_y,
  s.step_type,
  s.objective_type,
  s.estimated_minutes,
  s.danger_level,
  s.priority_score,
  s.is_optional,
  s.spoiler_level
FROM op_route_steps s
JOIN op_routes r ON r.route_id = s.route_id
LEFT JOIN op_route_phase_steps ps ON ps.step_id = s.step_id
LEFT JOIN op_route_phases p ON p.phase_id = ps.phase_id
LEFT JOIN locations l ON l.location_id = s.location_id;

PRAGMA user_version = 7;
