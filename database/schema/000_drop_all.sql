PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS source_refs;
DROP TABLE IF EXISTS route_step_edges;
DROP TABLE IF EXISTS route_step_rewards;
DROP TABLE IF EXISTS route_step_requirements;
DROP TABLE IF EXISTS route_step_items;
DROP TABLE IF EXISTS op_route_steps;
DROP TABLE IF EXISTS op_routes;
DROP TABLE IF EXISTS location_items;
DROP TABLE IF EXISTS bosses;
DROP TABLE IF EXISTS quests;
DROP TABLE IF EXISTS item_vocations;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS vocations;
DROP TABLE IF EXISTS regions;
DROP TABLE IF EXISTS marker_categories;
DROP TABLE IF EXISTS map_anchor_positions;
DROP TABLE IF EXISTS map_anchor_points;
DROP TABLE IF EXISTS map_profiles;
DROP TABLE IF EXISTS data_import_batches;
DROP TABLE IF EXISTS sources;

PRAGMA foreign_keys = ON;