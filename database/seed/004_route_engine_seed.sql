PRAGMA foreign_keys = ON;

-- =========================================================
-- DRAGON'S DOGMA II COMPANION APP
-- Sprint 1B - Route Engine Seed Data
-- =========================================================


-- =========================================================
-- ROUTE ENGINE PROFILES
-- =========================================================

INSERT OR IGNORE INTO route_engine_profiles
(
    engine_profile_key,
    name,
    description,
    loot_weight,
    quest_weight,
    boss_weight,
    distance_weight,
    danger_weight,
    vocation_weight,
    prerequisite_weight,
    backtracking_penalty,
    spoilers_allowed,
    is_default,
    is_active
)
VALUES
(
    'op_fast',
    'OP Fast Route',
    'Prioriteit op snel sterker worden, sterke loot, weinig backtracking en duidelijke spoilers.',
    80,
    40,
    35,
    45,
    20,
    70,
    100,
    50,
    1,
    1,
    1
),
(
    'op_safe',
    'OP Safe Route',
    'Snel sterker worden, maar met minder risico en minder gevaarlijke stappen vroeg in de route.',
    70,
    45,
    20,
    40,
    70,
    65,
    100,
    45,
    1,
    0,
    1
),
(
    'completionist',
    'Completionist Route',
    'Meer nadruk op collectibles, quests, checklists en volledige gebiedsafwerking.',
    60,
    75,
    45,
    25,
    30,
    45,
    100,
    25,
    1,
    0,
    1
),
(
    'low_spoiler',
    'Low Spoiler Route',
    'Route met minder spoilers en minder expliciete late-game informatie.',
    55,
    50,
    25,
    35,
    35,
    50,
    100,
    35,
    0,
    0,
    1
);


-- =========================================================
-- ROUTE STEP TAGS
-- =========================================================

INSERT OR IGNORE INTO route_step_tags
(tag_key, name, tag_type, description, sort_order)
VALUES
('early_game', 'Early Game', 'phase', 'Geschikt voor de vroege game.', 10),
('mid_game', 'Mid Game', 'phase', 'Geschikt voor de middenfase van de game.', 20),
('late_game', 'Late Game', 'phase', 'Geschikt voor de late game.', 30),

('high_value_loot', 'High Value Loot', 'loot', 'Stap levert zeer waardevolle loot of power upgrade op.', 100),
('important_weapon', 'Important Weapon', 'loot', 'Stap levert een belangrijk wapen op.', 110),
('important_armor', 'Important Armor', 'loot', 'Stap levert belangrijke armor op.', 120),
('gold_income', 'Gold Income', 'loot', 'Stap levert goede goudwaarde of verkoopwaarde op.', 130),
('keep_item', 'Keep Item', 'loot', 'Item niet verkopen of kwijtraken.', 140),

('fighter_priority', 'Fighter Priority', 'vocation', 'Extra relevant voor Fighter.', 200),
('warrior_priority', 'Warrior Priority', 'vocation', 'Extra relevant voor Warrior.', 210),
('mage_priority', 'Mage Priority', 'vocation', 'Extra relevant voor Mage.', 220),
('sorcerer_priority', 'Sorcerer Priority', 'vocation', 'Extra relevant voor Sorcerer.', 230),
('thief_priority', 'Thief Priority', 'vocation', 'Extra relevant voor Thief.', 240),
('archer_priority', 'Archer Priority', 'vocation', 'Extra relevant voor Archer.', 250),
('mystic_spearhand_priority', 'Mystic Spearhand Priority', 'vocation', 'Extra relevant voor Mystic Spearhand.', 260),
('magick_archer_priority', 'Magick Archer Priority', 'vocation', 'Extra relevant voor Magick Archer.', 270),
('trickster_priority', 'Trickster Priority', 'vocation', 'Extra relevant voor Trickster.', 280),
('warfarer_priority', 'Warfarer Priority', 'vocation', 'Extra relevant voor Warfarer.', 290),

('dangerous', 'Dangerous', 'risk', 'Stap is gevaarlijk voor lage levels.', 300),
('safe', 'Safe', 'risk', 'Stap is relatief veilig.', 310),
('no_combat', 'No Combat', 'risk', 'Stap kan zonder gevecht of bijna zonder gevecht.', 320),
('boss_fight', 'Boss Fight', 'risk', 'Stap bevat een baasgevecht.', 330),

('low_backtracking', 'Low Backtracking', 'routing', 'Past goed in een efficiënte route zonder veel teruglopen.', 400),
('detour', 'Detour', 'routing', 'Stap is een omweg.', 410),
('near_main_route', 'Near Main Route', 'routing', 'Stap ligt dicht bij de hoofdroute.', 420),
('requires_unlock', 'Requires Unlock', 'routing', 'Stap vereist eerst een unlock, quest of gebiedstoegang.', 430),

('missable', 'Missable', 'warning', 'Kan gemist worden.', 500),
('spoiler', 'Spoiler', 'warning', 'Bevat duidelijke spoilerinformatie.', 510),
('time_sensitive', 'Time Sensitive', 'warning', 'Timing of volgorde is belangrijk.', 520);


-- =========================================================
-- ROUTE ENGINE RULES: OP FAST
-- =========================================================

INSERT OR IGNORE INTO route_engine_rules
(
    engine_profile_id,
    rule_key,
    rule_type,
    target_type,
    target_key,
    operator,
    score_value,
    condition_type,
    condition_key,
    condition_operator,
    condition_value,
    notes
)
SELECT
    rep.engine_profile_id,
    'op_fast_high_value_loot',
    'tag_score',
    'tag',
    'high_value_loot',
    'add',
    80,
    NULL,
    NULL,
    NULL,
    NULL,
    'OP Fast geeft veel prioriteit aan sterke loot.'
FROM route_engine_profiles rep
WHERE rep.engine_profile_key = 'op_fast';


INSERT OR IGNORE INTO route_engine_rules
(
    engine_profile_id,
    rule_key,
    rule_type,
    target_type,
    target_key,
    operator,
    score_value,
    condition_type,
    condition_key,
    condition_operator,
    condition_value,
    notes
)
SELECT
    rep.engine_profile_id,
    'op_fast_early_game',
    'tag_score',
    'tag',
    'early_game',
    'add',
    45,
    NULL,
    NULL,
    NULL,
    NULL,
    'Vroege stappen krijgen bonus in OP Fast.'
FROM route_engine_profiles rep
WHERE rep.engine_profile_key = 'op_fast';


INSERT OR IGNORE INTO route_engine_rules
(
    engine_profile_id,
    rule_key,
    rule_type,
    target_type,
    target_key,
    operator,
    score_value,
    condition_type,
    condition_key,
    condition_operator,
    condition_value,
    notes
)
SELECT
    rep.engine_profile_id,
    'op_fast_danger_penalty',
    'tag_score',
    'tag',
    'dangerous',
    'add',
    -25,
    NULL,
    NULL,
    NULL,
    NULL,
    'Gevaarlijke stappen krijgen lichte straf, maar worden niet volledig uitgesloten.'
FROM route_engine_profiles rep
WHERE rep.engine_profile_key = 'op_fast';


INSERT OR IGNORE INTO route_engine_rules
(
    engine_profile_id,
    rule_key,
    rule_type,
    target_type,
    target_key,
    operator,
    score_value,
    condition_type,
    condition_key,
    condition_operator,
    condition_value,
    notes
)
SELECT
    rep.engine_profile_id,
    'op_fast_low_backtracking',
    'tag_score',
    'tag',
    'low_backtracking',
    'add',
    50,
    NULL,
    NULL,
    NULL,
    NULL,
    'Efficiënte route zonder veel teruglopen krijgt bonus.'
FROM route_engine_profiles rep
WHERE rep.engine_profile_key = 'op_fast';


-- =========================================================
-- ROUTE ENGINE RULES: OP SAFE
-- =========================================================

INSERT OR IGNORE INTO route_engine_rules
(
    engine_profile_id,
    rule_key,
    rule_type,
    target_type,
    target_key,
    operator,
    score_value,
    condition_type,
    condition_key,
    condition_operator,
    condition_value,
    notes
)
SELECT
    rep.engine_profile_id,
    'op_safe_safe_bonus',
    'tag_score',
    'tag',
    'safe',
    'add',
    70,
    NULL,
    NULL,
    NULL,
    NULL,
    'Veilige stappen krijgen hoge prioriteit.'
FROM route_engine_profiles rep
WHERE rep.engine_profile_key = 'op_safe';


INSERT OR IGNORE INTO route_engine_rules
(
    engine_profile_id,
    rule_key,
    rule_type,
    target_type,
    target_key,
    operator,
    score_value,
    condition_type,
    condition_key,
    condition_operator,
    condition_value,
    notes
)
SELECT
    rep.engine_profile_id,
    'op_safe_danger_penalty',
    'tag_score',
    'tag',
    'dangerous',
    'add',
    -75,
    NULL,
    NULL,
    NULL,
    NULL,
    'Gevaarlijke stappen krijgen sterke straf in veilige route.'
FROM route_engine_profiles rep
WHERE rep.engine_profile_key = 'op_safe';


-- =========================================================
-- ROUTE ENGINE RULES: COMPLETIONIST
-- =========================================================

INSERT OR IGNORE INTO route_engine_rules
(
    engine_profile_id,
    rule_key,
    rule_type,
    target_type,
    target_key,
    operator,
    score_value,
    condition_type,
    condition_key,
    condition_operator,
    condition_value,
    notes
)
SELECT
    rep.engine_profile_id,
    'completionist_collectible_bonus',
    'tag_score',
    'tag',
    'seeker_token',
    'add',
    40,
    NULL,
    NULL,
    NULL,
    NULL,
    'Collectibles krijgen bonus in completionist-profiel.'
FROM route_engine_profiles rep
WHERE rep.engine_profile_key = 'completionist';


-- =========================================================
-- TEST PLAYER PROFILE
-- =========================================================
-- Dit profiel gebruiken we later om de route-engine te testen.

INSERT OR IGNORE INTO player_profiles
(
    profile_key,
    name,
    selected_vocation_id,
    current_region_id,
    playstyle_key,
    spoilers_enabled,
    avoid_backtracking,
    prefer_safe_routes,
    prefer_loot_first,
    prefer_minimal_grinding
)
SELECT
    'test_teun_fighter_op',
    'Test Profile - Fighter OP',
    v.vocation_id,
    r.region_id,
    'op_fast',
    1,
    1,
    0,
    1,
    1
FROM vocations v
JOIN regions r
WHERE v.vocation_key = 'fighter'
AND r.region_key = 'vermund';


-- =========================================================
-- SEED VERSION CHECK
-- =========================================================

PRAGMA user_version = 4;