PRAGMA foreign_keys = ON;

-- =========================================================
-- DRAGON'S DOGMA II COMPANION APP
-- Sprint 1B - Intelligent Route Engine Schema
-- =========================================================
-- Dit bestand breidt de basisdatabase uit met tabellen voor:
-- - spelerprofielen
-- - voortgang
-- - inventory/checklists
-- - slimme route-profielen
-- - route-engine regels
-- - tags voor route-stappen
-- =========================================================


-- =========================================================
-- PLAYER PROFILES
-- =========================================================
-- Lokale spelerprofielen. In de PWA worden deze later offline opgeslagen.
-- SQLite ondersteunt dit alvast zodat we kunnen testen met voorbeeldprofielen.

CREATE TABLE IF NOT EXISTS player_profiles (
    player_profile_id INTEGER PRIMARY KEY AUTOINCREMENT,

    profile_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,

    selected_vocation_id INTEGER,
    current_region_id INTEGER,

    playstyle_key TEXT NOT NULL DEFAULT 'op_fast',

    spoilers_enabled INTEGER NOT NULL DEFAULT 1,
    avoid_backtracking INTEGER NOT NULL DEFAULT 1,
    prefer_safe_routes INTEGER NOT NULL DEFAULT 0,
    prefer_loot_first INTEGER NOT NULL DEFAULT 1,
    prefer_minimal_grinding INTEGER NOT NULL DEFAULT 1,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (selected_vocation_id) REFERENCES vocations(vocation_id),
    FOREIGN KEY (current_region_id) REFERENCES regions(region_id)
);


-- =========================================================
-- PLAYER FLAGS
-- =========================================================
-- Algemene voortgangsvlaggen.
-- Voorbeelden:
-- - quest_complete:seat_of_the_sovran
-- - region_unlocked:battahl
-- - vocation_unlocked:warrior
-- - boss_defeated:cyclops_trevo_mine
-- - route_milestone:vernworth_reached

CREATE TABLE IF NOT EXISTS player_progress_flags (
    progress_flag_id INTEGER PRIMARY KEY AUTOINCREMENT,

    player_profile_id INTEGER NOT NULL,

    flag_type TEXT NOT NULL,
    flag_key TEXT NOT NULL,

    flag_value TEXT,
    completed INTEGER NOT NULL DEFAULT 1,

    completed_at TEXT,
    notes TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (player_profile_id, flag_type, flag_key),

    FOREIGN KEY (player_profile_id) REFERENCES player_profiles(player_profile_id) ON DELETE CASCADE
);


-- =========================================================
-- PLAYER INVENTORY / CHECKLIST
-- =========================================================
-- Hiermee weet de route-engine welke belangrijke loot al verzameld is.

CREATE TABLE IF NOT EXISTS player_inventory (
    player_inventory_id INTEGER PRIMARY KEY AUTOINCREMENT,

    player_profile_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,

    quantity INTEGER NOT NULL DEFAULT 1,
    obtained INTEGER NOT NULL DEFAULT 1,

    obtained_from_location_id INTEGER,
    obtained_from_step_id INTEGER,

    obtained_at TEXT,
    notes TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (player_profile_id, item_id),

    FOREIGN KEY (player_profile_id) REFERENCES player_profiles(player_profile_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE,
    FOREIGN KEY (obtained_from_location_id) REFERENCES locations(location_id),
    FOREIGN KEY (obtained_from_step_id) REFERENCES op_route_steps(step_id)
);


-- =========================================================
-- PLAYER ROUTE PROGRESS
-- =========================================================
-- Houdt bij welke route-stappen afgerond, genegeerd of gepland zijn.

CREATE TABLE IF NOT EXISTS player_route_progress (
    player_route_progress_id INTEGER PRIMARY KEY AUTOINCREMENT,

    player_profile_id INTEGER NOT NULL,
    route_id INTEGER NOT NULL,
    step_id INTEGER NOT NULL,

    status TEXT NOT NULL DEFAULT 'not_started',
    -- not_started
    -- suggested
    -- active
    -- completed
    -- skipped
    -- blocked

    completed INTEGER NOT NULL DEFAULT 0,
    skipped INTEGER NOT NULL DEFAULT 0,

    suggested_score INTEGER,
    suggested_reason TEXT,

    started_at TEXT,
    completed_at TEXT,
    skipped_at TEXT,

    notes TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (player_profile_id, route_id, step_id),

    FOREIGN KEY (player_profile_id) REFERENCES player_profiles(player_profile_id) ON DELETE CASCADE,
    FOREIGN KEY (route_id) REFERENCES op_routes(route_id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES op_route_steps(step_id) ON DELETE CASCADE
);


-- =========================================================
-- ROUTE ENGINE PROFILES
-- =========================================================
-- Profielen voor verschillende soorten route-logica.
-- Voorbeeld:
-- - op_fast
-- - op_safe
-- - completionist
-- - low_spoiler
-- - no_backtracking

CREATE TABLE IF NOT EXISTS route_engine_profiles (
    engine_profile_id INTEGER PRIMARY KEY AUTOINCREMENT,

    engine_profile_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,

    description TEXT,

    loot_weight INTEGER NOT NULL DEFAULT 50,
    quest_weight INTEGER NOT NULL DEFAULT 30,
    boss_weight INTEGER NOT NULL DEFAULT 20,
    distance_weight INTEGER NOT NULL DEFAULT 30,
    danger_weight INTEGER NOT NULL DEFAULT 20,
    vocation_weight INTEGER NOT NULL DEFAULT 60,
    prerequisite_weight INTEGER NOT NULL DEFAULT 100,
    backtracking_penalty INTEGER NOT NULL DEFAULT 40,

    spoilers_allowed INTEGER NOT NULL DEFAULT 1,
    is_default INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- ROUTE ENGINE RULES
-- =========================================================
-- Algemene scoreregels.
-- Hiermee hoeft de route-engine later niet alles hardcoded te doen.

CREATE TABLE IF NOT EXISTS route_engine_rules (
    engine_rule_id INTEGER PRIMARY KEY AUTOINCREMENT,

    engine_profile_id INTEGER NOT NULL,

    rule_key TEXT NOT NULL,
    rule_type TEXT NOT NULL,

    target_type TEXT NOT NULL,
    target_key TEXT,

    operator TEXT NOT NULL DEFAULT 'add',
    score_value INTEGER NOT NULL DEFAULT 0,

    condition_type TEXT,
    condition_key TEXT,
    condition_operator TEXT,
    condition_value TEXT,

    is_active INTEGER NOT NULL DEFAULT 1,
    notes TEXT,

    UNIQUE (engine_profile_id, rule_key),

    FOREIGN KEY (engine_profile_id) REFERENCES route_engine_profiles(engine_profile_id) ON DELETE CASCADE
);


-- =========================================================
-- ROUTE STEP TAGS
-- =========================================================
-- Tags maken stappen slim filterbaar.
-- Voorbeelden:
-- - early_game
-- - high_value_loot
-- - fighter_priority
-- - dangerous
-- - no_combat
-- - missable
-- - low_backtracking
-- - required_for_unlock

CREATE TABLE IF NOT EXISTS route_step_tags (
    tag_id INTEGER PRIMARY KEY AUTOINCREMENT,

    tag_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,

    tag_type TEXT NOT NULL DEFAULT 'general',
    description TEXT,

    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1
);


CREATE TABLE IF NOT EXISTS route_step_tag_links (
    route_step_tag_link_id INTEGER PRIMARY KEY AUTOINCREMENT,

    step_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,

    weight INTEGER NOT NULL DEFAULT 50,
    notes TEXT,

    UNIQUE (step_id, tag_id),

    FOREIGN KEY (step_id) REFERENCES op_route_steps(step_id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES route_step_tags(tag_id) ON DELETE CASCADE
);


-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_player_flags_profile
ON player_progress_flags(player_profile_id);

CREATE INDEX IF NOT EXISTS idx_player_flags_type_key
ON player_progress_flags(flag_type, flag_key);

CREATE INDEX IF NOT EXISTS idx_player_inventory_profile
ON player_inventory(player_profile_id);

CREATE INDEX IF NOT EXISTS idx_player_route_progress_profile
ON player_route_progress(player_profile_id);

CREATE INDEX IF NOT EXISTS idx_player_route_progress_status
ON player_route_progress(status);

CREATE INDEX IF NOT EXISTS idx_route_engine_rules_profile
ON route_engine_rules(engine_profile_id);

CREATE INDEX IF NOT EXISTS idx_route_step_tags_key
ON route_step_tags(tag_key);

CREATE INDEX IF NOT EXISTS idx_route_step_tag_links_step
ON route_step_tag_links(step_id);

CREATE INDEX IF NOT EXISTS idx_route_step_tag_links_tag
ON route_step_tag_links(tag_id);


-- =========================================================
-- SCHEMA VERSION
-- =========================================================

PRAGMA user_version = 3;