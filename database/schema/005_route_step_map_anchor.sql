PRAGMA foreign_keys = ON;

-- =========================================================
-- DRAGON'S DOGMA II COMPANION APP
-- Sprint 2A - Route steps koppelen aan map anchors
-- =========================================================

ALTER TABLE op_route_steps
ADD COLUMN map_anchor_id INTEGER REFERENCES map_anchor_points(anchor_id);

CREATE INDEX IF NOT EXISTS idx_route_steps_map_anchor
ON op_route_steps(map_anchor_id);

PRAGMA user_version = 5;
