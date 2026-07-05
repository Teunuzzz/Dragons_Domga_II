PRAGMA foreign_keys = ON;

-- =========================================================
-- DRAGON'S DOGMA II COMPANION APP
-- Sprint 2C - Reusable route network
-- =========================================================

CREATE TABLE IF NOT EXISTS route_network_nodes (
  node_id INTEGER PRIMARY KEY AUTOINCREMENT,
  node_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  region_key TEXT,
  world_x REAL NOT NULL,
  world_y REAL NOT NULL,
  node_type TEXT NOT NULL DEFAULT 'waypoint',
  danger_level INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  source_key TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS route_network_edges (
  edge_id INTEGER PRIMARY KEY AUTOINCREMENT,
  edge_key TEXT NOT NULL UNIQUE,
  from_node_id INTEGER NOT NULL,
  to_node_id INTEGER NOT NULL,
  distance_score REAL NOT NULL DEFAULT 1,
  danger_level INTEGER NOT NULL DEFAULT 1,
  road_type TEXT NOT NULL DEFAULT 'road',
  bidirectional INTEGER NOT NULL DEFAULT 1,
  requires_flag TEXT,
  notes TEXT,
  source_key TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (from_node_id) REFERENCES route_network_nodes(node_id),
  FOREIGN KEY (to_node_id) REFERENCES route_network_nodes(node_id)
);

CREATE INDEX IF NOT EXISTS idx_route_network_nodes_key
ON route_network_nodes(node_key);

CREATE INDEX IF NOT EXISTS idx_route_network_edges_from
ON route_network_edges(from_node_id);

CREATE INDEX IF NOT EXISTS idx_route_network_edges_to
ON route_network_edges(to_node_id);

PRAGMA user_version = 6;