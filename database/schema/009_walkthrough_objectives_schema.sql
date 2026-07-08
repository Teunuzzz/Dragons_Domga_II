PRAGMA foreign_keys = ON;

-- =========================================================
-- DRAGON'S DOGMA II COMPANION APP
-- Sprint 4A - Route Objective Engine
--
-- Additive schema for exact step-by-step OP walkthrough logic.
-- SQLite remains the single source of truth; frontend reads exported JSON.
-- Existing op_route_steps stay intact. This layer groups steps into
-- objectives, actions, decisions and vocation-specific route profiles.
-- =========================================================

-- One objective is the user-facing "what do I do now?" card.
-- It can be linked to an existing op_route_step and enriched with
-- why/next-hint/category metadata without changing core step rows.
CREATE TABLE IF NOT EXISTS route_objectives (
  objective_id INTEGER PRIMARY KEY AUTOINCREMENT,
  route_id INTEGER NOT NULL,
  step_id INTEGER,
  objective_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  summary TEXT,
  instruction TEXT,
  objective_type TEXT NOT NULL DEFAULT 'action',
  route_stage TEXT NOT NULL DEFAULT 'walkthrough',
  importance TEXT NOT NULL DEFAULT 'recommended',
  is_required INTEGER NOT NULL DEFAULT 1,
  is_op_critical INTEGER NOT NULL DEFAULT 0,
  skip_for_fast_route INTEGER NOT NULL DEFAULT 0,
  vocation_keys TEXT,
  spoiler_level INTEGER NOT NULL DEFAULT 1,
  why_text TEXT,
  next_hint TEXT,
  source_id INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (route_id, objective_key),
  FOREIGN KEY (route_id) REFERENCES op_routes(route_id) ON DELETE CASCADE,
  FOREIGN KEY (step_id) REFERENCES op_route_steps(step_id) ON DELETE SET NULL,
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE INDEX IF NOT EXISTS idx_route_objectives_route_order
ON route_objectives(route_id, sort_order, objective_key);

CREATE INDEX IF NOT EXISTS idx_route_objectives_step
ON route_objectives(step_id);

-- Explicit many-to-many links for objectives that cover several route steps.
CREATE TABLE IF NOT EXISTS route_objective_steps (
  objective_step_id INTEGER PRIMARY KEY AUTOINCREMENT,
  objective_id INTEGER NOT NULL,
  step_id INTEGER NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'primary',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  UNIQUE (objective_id, step_id, relation_type),
  FOREIGN KEY (objective_id) REFERENCES route_objectives(objective_id) ON DELETE CASCADE,
  FOREIGN KEY (step_id) REFERENCES op_route_steps(step_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_route_objective_steps_objective
ON route_objective_steps(objective_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_route_objective_steps_step
ON route_objective_steps(step_id);

-- Atomic checklist/action rows shown under: Moet nu doen, Pak mee, Quest,
-- Beloning, Niet overslaan and vocation-specific notes.
CREATE TABLE IF NOT EXISTS route_objective_actions (
  action_id INTEGER PRIMARY KEY AUTOINCREMENT,
  objective_id INTEGER NOT NULL,
  action_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  action_type TEXT NOT NULL DEFAULT 'action',
  label TEXT NOT NULL,
  details TEXT,
  entity_type TEXT,
  entity_key TEXT,
  location_id INTEGER,
  item_id INTEGER,
  quest_id INTEGER,
  npc_id INTEGER,
  vocation_id INTEGER,
  is_required INTEGER NOT NULL DEFAULT 1,
  blocks_completion INTEGER NOT NULL DEFAULT 0,
  grants_flag_key TEXT,
  spoiler_level INTEGER NOT NULL DEFAULT 1,
  source_id INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (objective_id, action_key),
  FOREIGN KEY (objective_id) REFERENCES route_objectives(objective_id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(location_id),
  FOREIGN KEY (item_id) REFERENCES items(item_id),
  FOREIGN KEY (quest_id) REFERENCES quests(quest_id),
  FOREIGN KEY (npc_id) REFERENCES npcs(npc_id),
  FOREIGN KEY (vocation_id) REFERENCES vocations(vocation_id),
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE INDEX IF NOT EXISTS idx_route_objective_actions_objective
ON route_objective_actions(objective_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_route_objective_actions_entity
ON route_objective_actions(entity_type, entity_key);

-- Route choices/branch notes. These are not separate routes yet; they tell the
-- OP Fast user what to do, what completionists can do, and what to skip.
CREATE TABLE IF NOT EXISTS route_decisions (
  decision_id INTEGER PRIMARY KEY AUTOINCREMENT,
  objective_id INTEGER NOT NULL,
  decision_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  question TEXT NOT NULL,
  recommended_choice TEXT NOT NULL,
  fast_route_advice TEXT,
  completionist_advice TEXT,
  skip_advice TEXT,
  spoiler_level INTEGER NOT NULL DEFAULT 1,
  source_id INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (objective_id, decision_key),
  FOREIGN KEY (objective_id) REFERENCES route_objectives(objective_id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE INDEX IF NOT EXISTS idx_route_decisions_objective
ON route_decisions(objective_id, sort_order);

-- Vocation profiles describe how one shared route is prioritized for a chosen
-- vocation. Coverage can be 'ready', 'draft' or 'skeleton'.
CREATE TABLE IF NOT EXISTS vocation_route_profiles (
  vocation_route_profile_id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  route_id INTEGER,
  vocation_id INTEGER,
  playstyle_key TEXT NOT NULL DEFAULT 'op_fast',
  is_default INTEGER NOT NULL DEFAULT 0,
  coverage_status TEXT NOT NULL DEFAULT 'skeleton',
  priority_bias INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (route_id) REFERENCES op_routes(route_id) ON DELETE SET NULL,
  FOREIGN KEY (vocation_id) REFERENCES vocations(vocation_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_vocation_route_profiles_route
ON vocation_route_profiles(route_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_vocation_route_profiles_vocation
ON vocation_route_profiles(vocation_id);

-- Per-profile inclusion/priority overrides for shared steps.
CREATE TABLE IF NOT EXISTS vocation_route_step_rules (
  vocation_route_step_rule_id INTEGER PRIMARY KEY AUTOINCREMENT,
  vocation_route_profile_id INTEGER NOT NULL,
  step_id INTEGER,
  rule_key TEXT NOT NULL,
  include_mode TEXT NOT NULL DEFAULT 'include',
  priority_delta INTEGER NOT NULL DEFAULT 0,
  required_override INTEGER,
  objective_tag TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (vocation_route_profile_id, rule_key),
  FOREIGN KEY (vocation_route_profile_id) REFERENCES vocation_route_profiles(vocation_route_profile_id) ON DELETE CASCADE,
  FOREIGN KEY (step_id) REFERENCES op_route_steps(step_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vocation_route_step_rules_profile
ON vocation_route_step_rules(vocation_route_profile_id, include_mode);

CREATE INDEX IF NOT EXISTS idx_vocation_route_step_rules_step
ON vocation_route_step_rules(step_id);

PRAGMA user_version = 9;
