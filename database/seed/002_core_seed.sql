PRAGMA foreign_keys = ON;

-- =========================================================
-- DRAGON'S DOGMA II COMPANION APP
-- Sprint 1 - Core Seed Data
-- Vaste basisdata voor database-opbouw
-- =========================================================


-- =========================================================
-- SOURCES
-- =========================================================

INSERT OR IGNORE INTO sources (source_key, name, url, source_type, reliability_score, notes)
VALUES
('own_calibration', 'Eigen kalibratie', NULL, 'manual', 5, 'Handmatig bepaalde kaartankers en eigen speldata.'),
('own_playthrough', 'Eigen playthrough', NULL, 'manual', 5, 'Eigen Dragon''s Dogma II speelervaring.'),
('fextralife', 'Fextralife', 'https://dragonsdogma2.wiki.fextralife.com/', 'website', 3, 'Openbare wiki-informatie als startpunt, niet letterlijk kopiëren.'),
('powerpyx', 'PowerPyx', 'https://www.powerpyx.com/dragons-dogma-2-wiki-strategy-guide/', 'website', 4, 'Gidsen en collectibles.'),
('game8', 'Game8', 'https://game8.co/games/Dragons-Dogma-2', 'website', 3, 'Openbare gidsinformatie.'),
('ign', 'IGN', 'https://www.ign.com/wikis/dragons-dogma-2', 'website', 3, 'Openbare gidsinformatie.'),
('polygon', 'Polygon', 'https://www.polygon.com/dragons-dogma-2-guides', 'website', 3, 'Openbare gidsinformatie.');


-- =========================================================
-- MAP PROFILE
-- =========================================================

INSERT OR IGNORE INTO map_profiles
(profile_key, name, image_file, projection_type, is_default, notes)
VALUES
('reference_map_v1', 'Reference Map v1', NULL, 'anchor_affine', 1, 'Eerste handmatig gekalibreerde kaart.');


-- =========================================================
-- MAP ANCHORS
-- =========================================================

INSERT OR IGNORE INTO map_anchor_points
(anchor_key, name, world_x, world_y, anchor_order)
VALUES
('borderwatch', 'Borderwatch Outpost', 532, 89, 10),
('melve', 'Melve', 502, 146, 20),
('vernworth', 'Vernworth', 549, 348, 30),
('trevo_mine', 'Trevo Mine', 442, 243, 40),
('nameless', 'Nameless Village', 715, 259, 50),
('harve', 'Harve Village', 412, 374, 60),
('sacred_arbor', 'Sacred Arbor', 388, 138, 70),
('checkpoint', 'Checkpoint Rest Town', 172, 351, 80),
('ancient_bg', 'Ancient Battleground', 221, 281, 90),
('bakbattahl', 'Bakbattahl', 262, 548, 100),
('reverent_shrine', 'Reverent Shrine', 186, 447, 110),
('dragonsbreath', 'Dragonsbreath Tower', 138, 651, 120),
('volcanic_camp', 'Volcanic Island Camp', 420, 657, 130),
('agamen_ruins', 'Agamen Volcanic Island Ruins', 467, 637, 140),
('moonglint', 'Moonglint Tower', 527, 729, 150),
('seafloor', 'Seafloor Shrine', 345, 480, 160);


INSERT OR IGNORE INTO map_anchor_positions
(map_profile_id, anchor_id, pixel_x, pixel_y, confidence, notes)
SELECT
    mp.map_profile_id,
    ap.anchor_id,
    ap.world_x,
    ap.world_y,
    100,
    'Initial reference calibration'
FROM map_profiles mp
JOIN map_anchor_points ap
WHERE mp.profile_key = 'reference_map_v1';


-- =========================================================
-- VOCATIONS
-- =========================================================

INSERT OR IGNORE INTO vocations
(vocation_key, name, vocation_type, unlock_order)
VALUES
('fighter', 'Fighter', 'basic', 10),
('archer', 'Archer', 'basic', 20),
('mage', 'Mage', 'basic', 30),
('thief', 'Thief', 'basic', 40),
('warrior', 'Warrior', 'advanced', 50),
('sorcerer', 'Sorcerer', 'advanced', 60),
('mystic_spearhand', 'Mystic Spearhand', 'hybrid', 70),
('magick_archer', 'Magick Archer', 'hybrid', 80),
('trickster', 'Trickster', 'hybrid', 90),
('warfarer', 'Warfarer', 'special', 100);


-- =========================================================
-- MARKER CATEGORIES
-- =========================================================

INSERT OR IGNORE INTO marker_categories
(category_key, name, icon_key, sort_order)
VALUES
('settlement', 'Settlement', 'town', 10),
('dungeon', 'Dungeon', 'cave', 20),
('chest', 'Chest', 'chest', 30),
('seeker_token', 'Seeker Token', 'token', 40),
('golden_beetle', 'Golden Beetle', 'beetle', 50),
('portcrystal', 'Portcrystal', 'portcrystal', 60),
('merchant', 'Merchant', 'merchant', 70),
('boss', 'Boss', 'boss', 80),
('quest', 'Quest', 'quest', 90),
('camp', 'Camp', 'camp', 100),
('material', 'Material', 'material', 110),
('important_loot', 'Important Loot', 'loot', 120);


-- =========================================================
-- REGIONS
-- =========================================================

INSERT OR IGNORE INTO regions
(region_key, name, region_type, sort_order)
VALUES
('vermund', 'Vermund', 'major_region', 10),
('battahl', 'Battahl', 'major_region', 20),
('volcanic_island', 'Volcanic Island', 'major_region', 30),
('seafloor_shrine_area', 'Seafloor Shrine Area', 'major_region', 40);


-- =========================================================
-- SEED VERSION CHECK
-- =========================================================

PRAGMA user_version = 2;