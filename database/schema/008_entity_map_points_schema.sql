PRAGMA foreign_keys = ON;

-- =========================================================
-- DRAGON'S DOGMA II COMPANION APP
-- Sprint 3J - Exact Entity Map Points
--
-- Adds optional precise map points for items, NPCs, vendors,
-- quests, vocations and route steps. These points sit underneath
-- big locations so the OP route can target a chest, NPC desk,
-- vendor spot or quest objective instead of only a settlement/dungeon.
-- =========================================================

CREATE TABLE IF NOT EXISTS entity_map_points (
  point_id INTEGER PRIMARY KEY AUTOINCREMENT,
  point_key TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  route_id INTEGER,
  step_id INTEGER,
  location_id INTEGER,
  name TEXT NOT NULL,
  world_x REAL NOT NULL,
  world_y REAL NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'primary',
  accuracy_level TEXT NOT NULL DEFAULT 'estimated_low',
  accuracy_score INTEGER NOT NULL DEFAULT 50,
  route_priority INTEGER NOT NULL DEFAULT 50,
  is_primary INTEGER NOT NULL DEFAULT 1,
  is_verified INTEGER NOT NULL DEFAULT 0,
  spoiler_level INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  source_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (route_id) REFERENCES op_routes(route_id) ON DELETE CASCADE,
  FOREIGN KEY (step_id) REFERENCES op_route_steps(step_id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(location_id),
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_map_points_entity
ON entity_map_points(entity_type, entity_key);

CREATE INDEX IF NOT EXISTS idx_entity_map_points_location
ON entity_map_points(location_id);

CREATE INDEX IF NOT EXISTS idx_entity_map_points_step
ON entity_map_points(step_id);

CREATE INDEX IF NOT EXISTS idx_entity_map_points_priority
ON entity_map_points(route_priority, accuracy_score);

PRAGMA user_version = 8;
