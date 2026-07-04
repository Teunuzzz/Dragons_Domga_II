PRAGMA foreign_keys = ON;

-- =========================================================
-- DRAGON'S DOGMA II COMPANION APP
-- Sprint 1 - Core Database Schema
-- SQLite = single source of truth
-- =========================================================


-- =========================================================
-- SOURCES / IMPORTS
-- =========================================================

CREATE TABLE IF NOT EXISTS sources (
    source_id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    url TEXT,
    source_type TEXT NOT NULL DEFAULT 'website',
    reliability_score INTEGER NOT NULL DEFAULT 3,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS data_import_batches (
    batch_id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_key TEXT NOT NULL UNIQUE,
    source_id INTEGER,
    import_type TEXT NOT NULL,
    file_name TEXT,
    row_count INTEGER DEFAULT 0,
    notes TEXT,
    imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (source_id) REFERENCES sources(source_id)
);


-- =========================================================
-- MAP PROFILES / CALIBRATION
-- =========================================================

CREATE TABLE IF NOT EXISTS map_profiles (
    map_profile_id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    image_file TEXT,
    width_px INTEGER,
    height_px INTEGER,
    projection_type TEXT NOT NULL DEFAULT 'anchor_affine',
    is_default INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS map_anchor_points (
    anchor_id INTEGER PRIMARY KEY AUTOINCREMENT,
    anchor_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    world_x REAL NOT NULL,
    world_y REAL NOT NULL,
    anchor_order INTEGER NOT NULL DEFAULT 0,
    is_core_anchor INTEGER NOT NULL DEFAULT 1,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS map_anchor_positions (
    anchor_position_id INTEGER PRIMARY KEY AUTOINCREMENT,
    map_profile_id INTEGER NOT NULL,
    anchor_id INTEGER NOT NULL,
    pixel_x REAL NOT NULL,
    pixel_y REAL NOT NULL,
    confidence INTEGER NOT NULL DEFAULT 100,
    notes TEXT,

    UNIQUE (map_profile_id, anchor_id),

    FOREIGN KEY (map_profile_id) REFERENCES map_profiles(map_profile_id) ON DELETE CASCADE,
    FOREIGN KEY (anchor_id) REFERENCES map_anchor_points(anchor_id) ON DELETE CASCADE
);


-- =========================================================
-- TAXONOMY
-- =========================================================

CREATE TABLE IF NOT EXISTS marker_categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    parent_category_id INTEGER,
    icon_key TEXT,
    color TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,

    FOREIGN KEY (parent_category_id) REFERENCES marker_categories(category_id)
);

CREATE TABLE IF NOT EXISTS regions (
    region_id INTEGER PRIMARY KEY AUTOINCREMENT,
    region_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    region_type TEXT NOT NULL DEFAULT 'region',
    parent_region_id INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    notes TEXT,

    FOREIGN KEY (parent_region_id) REFERENCES regions(region_id)
);

CREATE TABLE IF NOT EXISTS vocations (
    vocation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    vocation_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    vocation_type TEXT NOT NULL DEFAULT 'basic',
    unlock_order INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
);


-- =========================================================
-- CORE GAME DATA
-- =========================================================

CREATE TABLE IF NOT EXISTS locations (
    location_id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category_id INTEGER,
    region_id INTEGER,
    world_x REAL NOT NULL,
    world_y REAL NOT NULL,
    location_type TEXT NOT NULL DEFAULT 'generic',
    discoverable INTEGER NOT NULL DEFAULT 1,
    is_missable INTEGER NOT NULL DEFAULT 0,
    spoiler_level INTEGER NOT NULL DEFAULT 0,
    short_description TEXT,
    notes TEXT,
    source_id INTEGER,
    batch_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES marker_categories(category_id),
    FOREIGN KEY (region_id) REFERENCES regions(region_id),
    FOREIGN KEY (source_id) REFERENCES sources(source_id),
    FOREIGN KEY (batch_id) REFERENCES data_import_batches(batch_id)
);

CREATE TABLE IF NOT EXISTS items (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    item_type TEXT NOT NULL DEFAULT 'item',
    rarity TEXT,
    value_gold INTEGER,
    weight REAL,
    is_unique INTEGER NOT NULL DEFAULT 0,
    is_missable INTEGER NOT NULL DEFAULT 0,
    keep_warning INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    notes TEXT,
    source_id INTEGER,
    batch_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (source_id) REFERENCES sources(source_id),
    FOREIGN KEY (batch_id) REFERENCES data_import_batches(batch_id)
);

CREATE TABLE IF NOT EXISTS item_vocations (
    item_vocation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    vocation_id INTEGER NOT NULL,
    relation_type TEXT NOT NULL DEFAULT 'usable',

    UNIQUE (item_id, vocation_id, relation_type),

    FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE,
    FOREIGN KEY (vocation_id) REFERENCES vocations(vocation_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quests (
    quest_id INTEGER PRIMARY KEY AUTOINCREMENT,
    quest_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    quest_type TEXT NOT NULL DEFAULT 'side',
    start_location_id INTEGER,
    start_npc TEXT,
    recommended_level INTEGER,
    is_missable INTEGER NOT NULL DEFAULT 0,
    spoiler_level INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    notes TEXT,
    source_id INTEGER,
    batch_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (start_location_id) REFERENCES locations(location_id),
    FOREIGN KEY (source_id) REFERENCES sources(source_id),
    FOREIGN KEY (batch_id) REFERENCES data_import_batches(batch_id)
);

CREATE TABLE IF NOT EXISTS bosses (
    boss_id INTEGER PRIMARY KEY AUTOINCREMENT,
    boss_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    location_id INTEGER,
    region_id INTEGER,
    recommended_level INTEGER,
    difficulty_score INTEGER,
    weakness TEXT,
    description TEXT,
    notes TEXT,
    source_id INTEGER,
    batch_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (location_id) REFERENCES locations(location_id),
    FOREIGN KEY (region_id) REFERENCES regions(region_id),
    FOREIGN KEY (source_id) REFERENCES sources(source_id),
    FOREIGN KEY (batch_id) REFERENCES data_import_batches(batch_id)
);

CREATE TABLE IF NOT EXISTS location_items (
    location_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    acquisition_method TEXT NOT NULL DEFAULT 'pickup',
    container_type TEXT,
    is_hidden INTEGER NOT NULL DEFAULT 0,
    respawns INTEGER NOT NULL DEFAULT 0,
    requires_quest_id INTEGER,
    requires_flag_key TEXT,
    recommended_level INTEGER,
    spoiler_level INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    source_id INTEGER,
    batch_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (location_id) REFERENCES locations(location_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE,
    FOREIGN KEY (requires_quest_id) REFERENCES quests(quest_id),
    FOREIGN KEY (source_id) REFERENCES sources(source_id),
    FOREIGN KEY (batch_id) REFERENCES data_import_batches(batch_id)
);


-- =========================================================
-- OP ROUTES
-- =========================================================

CREATE TABLE IF NOT EXISTS op_routes (
    route_id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    vocation_id INTEGER,
    route_type TEXT NOT NULL DEFAULT 'manual_walkthrough',
    target_playstyle TEXT NOT NULL DEFAULT 'op_fast',
    spoiler_level INTEGER NOT NULL DEFAULT 2,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (vocation_id) REFERENCES vocations(vocation_id)
);

CREATE TABLE IF NOT EXISTS op_route_steps (
    step_id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    step_key TEXT NOT NULL,
    step_order INTEGER,
    title TEXT NOT NULL,
    instruction TEXT NOT NULL,
    location_id INTEGER,
    step_type TEXT NOT NULL DEFAULT 'general',
    objective_type TEXT NOT NULL DEFAULT 'visit',
    estimated_minutes INTEGER,
    danger_level INTEGER NOT NULL DEFAULT 1,
    priority_score INTEGER NOT NULL DEFAULT 50,
    manual_only INTEGER NOT NULL DEFAULT 0,
    engine_enabled INTEGER NOT NULL DEFAULT 1,
    is_optional INTEGER NOT NULL DEFAULT 0,
    is_repeatable INTEGER NOT NULL DEFAULT 0,
    spoiler_level INTEGER NOT NULL DEFAULT 2,
    notes TEXT,
    source_id INTEGER,
    batch_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (route_id, step_key),

    FOREIGN KEY (route_id) REFERENCES op_routes(route_id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(location_id),
    FOREIGN KEY (source_id) REFERENCES sources(source_id),
    FOREIGN KEY (batch_id) REFERENCES data_import_batches(batch_id)
);

CREATE TABLE IF NOT EXISTS route_step_items (
    route_step_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    step_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    relation_type TEXT NOT NULL DEFAULT 'pickup',
    quantity INTEGER NOT NULL DEFAULT 1,
    notes TEXT,

    UNIQUE (step_id, item_id, relation_type),

    FOREIGN KEY (step_id) REFERENCES op_route_steps(step_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE
);


-- =========================================================
-- ROUTE ENGINE
-- =========================================================

CREATE TABLE IF NOT EXISTS route_step_requirements (
    requirement_id INTEGER PRIMARY KEY AUTOINCREMENT,
    step_id INTEGER NOT NULL,
    requirement_type TEXT NOT NULL,
    requirement_key TEXT NOT NULL,
    operator TEXT NOT NULL DEFAULT 'exists',
    requirement_value TEXT,
    logic_group TEXT NOT NULL DEFAULT 'all',
    is_hard_requirement INTEGER NOT NULL DEFAULT 1,
    notes TEXT,

    FOREIGN KEY (step_id) REFERENCES op_route_steps(step_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS route_step_rewards (
    reward_id INTEGER PRIMARY KEY AUTOINCREMENT,
    step_id INTEGER NOT NULL,
    reward_type TEXT NOT NULL,
    reward_key TEXT NOT NULL,
    reward_amount INTEGER DEFAULT 1,
    notes TEXT,

    FOREIGN KEY (step_id) REFERENCES op_route_steps(step_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS route_step_edges (
    edge_id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    from_step_id INTEGER NOT NULL,
    to_step_id INTEGER NOT NULL,
    edge_type TEXT NOT NULL DEFAULT 'next',
    weight INTEGER NOT NULL DEFAULT 50,
    condition_key TEXT,
    notes TEXT,

    UNIQUE (route_id, from_step_id, to_step_id, edge_type),

    FOREIGN KEY (route_id) REFERENCES op_routes(route_id) ON DELETE CASCADE,
    FOREIGN KEY (from_step_id) REFERENCES op_route_steps(step_id) ON DELETE CASCADE,
    FOREIGN KEY (to_step_id) REFERENCES op_route_steps(step_id) ON DELETE CASCADE
);


-- =========================================================
-- SOURCE REFERENCES
-- =========================================================

CREATE TABLE IF NOT EXISTS source_refs (
    source_ref_id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    entity_type TEXT NOT NULL,
    entity_key TEXT NOT NULL,
    url TEXT,
    title TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (source_id) REFERENCES sources(source_id) ON DELETE CASCADE
);


-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_locations_world
ON locations(world_x, world_y);

CREATE INDEX IF NOT EXISTS idx_locations_region
ON locations(region_id);

CREATE INDEX IF NOT EXISTS idx_location_items_location
ON location_items(location_id);

CREATE INDEX IF NOT EXISTS idx_location_items_item
ON location_items(item_id);

CREATE INDEX IF NOT EXISTS idx_route_steps_route_order
ON op_route_steps(route_id, step_order);

CREATE INDEX IF NOT EXISTS idx_route_steps_location
ON op_route_steps(location_id);

CREATE INDEX IF NOT EXISTS idx_route_requirements_step
ON route_step_requirements(step_id);

CREATE INDEX IF NOT EXISTS idx_route_rewards_step
ON route_step_rewards(step_id);

CREATE INDEX IF NOT EXISTS idx_route_edges_from
ON route_step_edges(from_step_id);

CREATE INDEX IF NOT EXISTS idx_route_edges_to
ON route_step_edges(to_step_id);

CREATE INDEX IF NOT EXISTS idx_source_refs_entity
ON source_refs(entity_type, entity_key);

-- =========================================================
-- SCHEMA VERSION
-- =========================================================

PRAGMA user_version = 5;