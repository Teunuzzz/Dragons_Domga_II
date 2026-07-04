window.DD2_DATA = {
  "vocations": [
    "Fighter",
    "Archer",
    "Thief",
    "Mage",
    "Warrior",
    "Sorcerer",
    "Mystic Spearhand",
    "Magick Archer",
    "Trickster",
    "Warfarer"
  ],
  "types": [
    "town",
    "quest",
    "loot",
    "dungeon",
    "boss",
    "merchant",
    "camp",
    "token",
    "beetle",
    "portcrystal",
    "vocation",
    "material"
  ],
  "maps": [
    {
      "id": "op",
      "title": "Map 1: OP-route",
      "subtitle": "Beste route om sterk te worden met Fighter-start"
    },
    {
      "id": "complete",
      "title": "Map 2: 100% completion",
      "subtitle": "Alle markers, collectibles en checklist"
    }
  ],
  "locations": [
    {
      "id": "borderwatch",
      "name": "Borderwatch Outpost",
      "region": "Vermund",
      "type": "town",
      "x": 48,
      "y": 11,
      "priority": 1,
      "level": 1,
      "desc": "Startgebied. Regel je party, rust bij de inn en verzamel vroege consumables.",
      "loot": [
        "Startgear, curatives"
      ],
      "quests": [
        "In Dragon's Wake"
      ],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "melve",
      "name": "Melve",
      "region": "Vermund",
      "type": "town",
      "x": 47,
      "y": 19,
      "priority": 2,
      "level": 2,
      "desc": "Vroeg hubgebied met belangrijke quests en later Mystic Spearhand-trigger.",
      "loot": [
        "Vroege armor/curatives"
      ],
      "quests": [
        "Readvent of Calamity"
      ],
      "bosses": [
        "Drake event"
      ],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "vernworth",
      "name": "Vernworth",
      "region": "Vermund",
      "type": "town",
      "x": 50,
      "y": 36,
      "priority": 5,
      "level": 3,
      "desc": "Grote stad en veilig middelpunt. Gebruik dit als basis voor gear, vocation guild en Brant-quests.",
      "loot": [
        "Merchants, inn, storage"
      ],
      "quests": [
        "Seat of the Sovran",
        "Brant questline"
      ],
      "bosses": [],
      "vocations": [],
      "map": [
        "op",
        "complete"
      ],
      "route": 3
    },
    {
      "id": "trevo",
      "name": "Trevo Mine",
      "region": "Vermund",
      "type": "dungeon",
      "x": 43,
      "y": 34,
      "priority": 5,
      "level": 10,
      "desc": "Eerste topbestemming voor OP worden. Haal de items voor Warrior/Sorcerer-unlock en veel vroege loot.",
      "loot": [
        "Two-Hander",
        "Archistaff",
        "goud",
        "ore"
      ],
      "quests": [
        "Vocation Frustration"
      ],
      "bosses": [
        "goblins",
        "saurians"
      ],
      "vocations": [
        "Fighter",
        "Archer",
        "Thief",
        "Mage",
        "Warrior",
        "Sorcerer",
        "Mystic Spearhand",
        "Magick Archer",
        "Trickster",
        "Warfarer"
      ],
      "map": [
        "op",
        "complete"
      ],
      "route": 4
    },
    {
      "id": "harve",
      "name": "Harve Village",
      "region": "Vermund",
      "type": "town",
      "x": 39,
      "y": 48,
      "priority": 4,
      "level": 12,
      "desc": "Kustdorp met quests, saurians en vervolgcontent. Goed combineren met Vernworth-routes.",
      "loot": [
        "materials",
        "quest rewards"
      ],
      "quests": [
        "Scaly Invaders"
      ],
      "bosses": [
        "saurians"
      ],
      "vocations": [],
      "map": [
        "op",
        "complete"
      ],
      "route": null
    },
    {
      "id": "nameless",
      "name": "Nameless Village",
      "region": "Vermund",
      "type": "town",
      "x": 62,
      "y": 30,
      "priority": 4,
      "level": 12,
      "desc": "Belangrijke Thief-locatie en verhaallijn rond de valse Sovran.",
      "loot": [
        "Thief Maister skill route"
      ],
      "quests": [
        "The Nameless Village"
      ],
      "bosses": [
        "bandits"
      ],
      "vocations": [],
      "map": [
        "op",
        "complete"
      ],
      "route": null
    },
    {
      "id": "sacred_arbor",
      "name": "Sacred Arbor",
      "region": "Vermund",
      "type": "town",
      "x": 28,
      "y": 24,
      "priority": 4,
      "level": 18,
      "desc": "Elvengebied. Interessant voor Archer/Mage/Sorcerer en speciale merchants.",
      "loot": [
        "elven gear",
        "materials"
      ],
      "quests": [
        "A Trial of Archery"
      ],
      "bosses": [],
      "vocations": [],
      "map": [
        "op",
        "complete"
      ],
      "route": null
    },
    {
      "id": "checkpoint",
      "name": "Checkpoint Rest Town",
      "region": "Border",
      "type": "town",
      "x": 36,
      "y": 60,
      "priority": 5,
      "level": 18,
      "desc": "Knooppunt tussen Vermund en Battahl. Handig voor voorbereiding, scrap shop en grenspassage.",
      "loot": [
        "gear shops",
        "forgeries"
      ],
      "quests": [
        "Nation of the Lambent Flame"
      ],
      "bosses": [],
      "vocations": [],
      "map": [
        "op",
        "complete"
      ],
      "route": 8
    },
    {
      "id": "ancient_battle",
      "name": "Ancient Battleground",
      "region": "Border",
      "type": "dungeon",
      "x": 30,
      "y": 55,
      "priority": 4,
      "level": 20,
      "desc": "Sterke dungeon-route met zware vijanden en waardevolle loot. Ga voorbereid.",
      "loot": [
        "rare gear",
        "wakestone shards"
      ],
      "quests": [],
      "bosses": [
        "cyclops",
        "undead"
      ],
      "vocations": [
        "Fighter",
        "Archer",
        "Thief",
        "Mage",
        "Warrior",
        "Sorcerer",
        "Mystic Spearhand",
        "Magick Archer",
        "Trickster",
        "Warfarer"
      ],
      "map": [
        "op",
        "complete"
      ],
      "route": null
    },
    {
      "id": "bakbattahl",
      "name": "Bakbattahl",
      "region": "Battahl",
      "type": "town",
      "x": 39,
      "y": 75,
      "priority": 5,
      "level": 25,
      "desc": "Hoofdstad van Battahl. Nieuwe gearsprong, quests, vocation-content en betere winkels.",
      "loot": [
        "sterke midgame gear"
      ],
      "quests": [
        "A New Godsway"
      ],
      "bosses": [],
      "vocations": [],
      "map": [
        "op",
        "complete"
      ],
      "route": 10
    },
    {
      "id": "volcanic_camp",
      "name": "Volcanic Island Camp",
      "region": "Agamen Volcanic Island",
      "type": "town",
      "x": 57,
      "y": 85,
      "priority": 5,
      "level": 35,
      "desc": "Laatmidgame/endgame hub met sterke gear en Magick Archer/Warfarer routes.",
      "loot": [
        "endgame gear"
      ],
      "quests": [],
      "bosses": [
        "gore enemies"
      ],
      "vocations": [],
      "map": [
        "op",
        "complete"
      ],
      "route": 11
    },
    {
      "id": "seafloor",
      "name": "Seafloor Shrine",
      "region": "Endgame",
      "type": "town",
      "x": 53,
      "y": 63,
      "priority": 5,
      "level": 35,
      "desc": "Belangrijk later/verhaal/endgame. Gebruik pas als je spoilers oké vindt.",
      "loot": [
        "endgame progression"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "op",
        "complete"
      ],
      "route": 12
    },
    {
      "id": "sphinx1",
      "name": "Mountain Shrine / Sphinx",
      "region": "Vermund",
      "type": "quest",
      "x": 22,
      "y": 36,
      "priority": 5,
      "level": 20,
      "desc": "Sphinx-riddles. Spoiler aan: markeer dit vroeg, maar maak manual save/inn save vóór je keuzes.",
      "loot": [
        "Portcrystal",
        "Ferrystones",
        "rare rewards"
      ],
      "quests": [
        "A Game of Wits"
      ],
      "bosses": [
        "Sphinx"
      ],
      "vocations": [
        "Fighter",
        "Archer",
        "Thief",
        "Mage",
        "Warrior",
        "Sorcerer",
        "Mystic Spearhand",
        "Magick Archer",
        "Trickster",
        "Warfarer"
      ],
      "map": [
        "op",
        "complete"
      ],
      "route": 13
    },
    {
      "id": "dragonsbreath",
      "name": "Dragon's Breath Tower",
      "region": "Battahl",
      "type": "boss",
      "x": 49,
      "y": 80,
      "priority": 5,
      "level": 30,
      "desc": "Belangrijke drake/loot-route en Mystic Spearhand-context. Ga niet zonder wakestones/healing.",
      "loot": [
        "dragon materials",
        "rare loot"
      ],
      "quests": [],
      "bosses": [
        "Drake"
      ],
      "vocations": [
        "Fighter",
        "Archer",
        "Thief",
        "Mage",
        "Warrior",
        "Sorcerer",
        "Mystic Spearhand",
        "Magick Archer",
        "Trickster",
        "Warfarer"
      ],
      "map": [
        "op",
        "complete"
      ],
      "route": 14
    },
    {
      "id": "medusa",
      "name": "Nera Battahl Windrift / Medusa",
      "region": "Battahl",
      "type": "boss",
      "x": 32,
      "y": 82,
      "priority": 4,
      "level": 30,
      "desc": "Medusa-route voor speciale materialen en trofee/loot. Neem stun/positioning serieus.",
      "loot": [
        "Medusa Head",
        "monster materials"
      ],
      "quests": [],
      "bosses": [
        "Medusa"
      ],
      "vocations": [
        "Fighter",
        "Archer",
        "Thief",
        "Mage",
        "Warrior",
        "Sorcerer",
        "Mystic Spearhand",
        "Magick Archer",
        "Trickster",
        "Warfarer"
      ],
      "map": [
        "op",
        "complete"
      ],
      "route": null
    },
    {
      "id": "digger_ruins",
      "name": "Digger's Ruins",
      "region": "Battahl",
      "type": "dungeon",
      "x": 44,
      "y": 70,
      "priority": 4,
      "level": 24,
      "desc": "Goede Battahl-dungeon voor materials en levelen.",
      "loot": [
        "ore",
        "goud",
        "equipment"
      ],
      "quests": [],
      "bosses": [
        "bandits",
        "goblins"
      ],
      "vocations": [
        "Fighter",
        "Archer",
        "Thief",
        "Mage",
        "Warrior",
        "Sorcerer",
        "Mystic Spearhand",
        "Magick Archer",
        "Trickster",
        "Warfarer"
      ],
      "map": [
        "op",
        "complete"
      ],
      "route": null
    },
    {
      "id": "waterfall_cave",
      "name": "Waterfall Cave",
      "region": "Vermund",
      "type": "dungeon",
      "x": 55,
      "y": 22,
      "priority": 5,
      "level": 8,
      "desc": "Vroege maar gevaarlijke grot met zeer goede beloning. Kom met volle party en curatives.",
      "loot": [
        "Wakestone shard",
        "spellbooks",
        "rare chest"
      ],
      "quests": [],
      "bosses": [
        "chimera/lich-style danger"
      ],
      "vocations": [
        "Fighter",
        "Archer",
        "Thief",
        "Mage",
        "Warrior",
        "Sorcerer",
        "Mystic Spearhand",
        "Magick Archer",
        "Trickster",
        "Warfarer"
      ],
      "map": [
        "op",
        "complete"
      ],
      "route": 17
    },
    {
      "id": "malachite",
      "name": "Malachite Forest",
      "region": "Vermund",
      "type": "material",
      "x": 31,
      "y": 30,
      "priority": 3,
      "level": 14,
      "desc": "Goed gebied voor materials, beetles en verkennen richting Sacred Arbor.",
      "loot": [
        "materials",
        "beetles"
      ],
      "quests": [],
      "bosses": [
        "wolves",
        "goblins"
      ],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "melve_drake",
      "name": "Melve Drake Event",
      "region": "Vermund",
      "type": "boss",
      "x": 46,
      "y": 18,
      "priority": 5,
      "level": 12,
      "desc": "Belangrijke trigger voor Mystic Spearhand. Niet erg als je hem niet doodt; overleven en questflow is genoeg.",
      "loot": [
        "Mystic Spearhand route",
        "dragon materials"
      ],
      "quests": [
        "Readvent of Calamity"
      ],
      "bosses": [
        "Drake"
      ],
      "vocations": [
        "Fighter",
        "Archer",
        "Thief",
        "Mage",
        "Warrior",
        "Sorcerer",
        "Mystic Spearhand",
        "Magick Archer",
        "Trickster",
        "Warfarer"
      ],
      "map": [
        "op",
        "complete"
      ],
      "route": 19
    },
    {
      "id": "ulrika",
      "name": "Ulrika questline",
      "region": "Vermund",
      "type": "quest",
      "x": 47,
      "y": 19,
      "priority": 4,
      "level": 10,
      "desc": "Missable-gevoelige Melve/Harve questline. Rust regelmatig bij inn en check Melve na storyprogressie.",
      "loot": [
        "quest rewards"
      ],
      "quests": [
        "Readvent of Calamity",
        "Home Is Where the Hearth Is"
      ],
      "bosses": [],
      "vocations": [
        "Fighter",
        "Archer",
        "Thief",
        "Mage",
        "Warrior",
        "Sorcerer",
        "Mystic Spearhand",
        "Magick Archer",
        "Trickster",
        "Warfarer"
      ],
      "map": [
        "op",
        "complete"
      ],
      "route": null
    },
    {
      "id": "brant",
      "name": "Captain Brant route",
      "region": "Vernworth",
      "type": "quest",
      "x": 50,
      "y": 36,
      "priority": 5,
      "level": 10,
      "desc": "Hoofdroute in Vernworth. Doe zijcontent/gear voor je te veel Brant-quests achter elkaar afrondt.",
      "loot": [
        "story unlocks",
        "Battahl access"
      ],
      "quests": [
        "Monster Culling",
        "Disa's Plot",
        "The Caged Magistrate"
      ],
      "bosses": [],
      "vocations": [
        "Fighter",
        "Archer",
        "Thief",
        "Mage",
        "Warrior",
        "Sorcerer",
        "Mystic Spearhand",
        "Magick Archer",
        "Trickster",
        "Warfarer"
      ],
      "map": [
        "op",
        "complete"
      ],
      "route": 21
    },
    {
      "id": "vocation_guild",
      "name": "Vernworth Vocation Guild",
      "region": "Vermund",
      "type": "vocation",
      "x": 50,
      "y": 36,
      "priority": 5,
      "level": 8,
      "desc": "Hier wissel je vocation. Voor Fighter-start: pak eerst Trevo Mine voor Warrior/Sorcerer unlock.",
      "loot": [
        "Warrior unlock",
        "Sorcerer unlock"
      ],
      "quests": [
        "Vocation Frustration"
      ],
      "bosses": [],
      "vocations": [
        "Fighter",
        "Archer",
        "Thief",
        "Mage",
        "Warrior",
        "Sorcerer",
        "Mystic Spearhand",
        "Magick Archer",
        "Trickster",
        "Warfarer"
      ],
      "map": [
        "op",
        "complete"
      ],
      "route": 22
    },
    {
      "id": "mystic_spearhand",
      "name": "Mystic Spearhand unlock",
      "region": "Vermund",
      "type": "vocation",
      "x": 46,
      "y": 18,
      "priority": 5,
      "level": 12,
      "desc": "Na de draak-aanval rond Melve kun je deze vocation-route vrijspelen via Sigurd.",
      "loot": [
        "Mystic Spearhand vocation"
      ],
      "quests": [
        "Readvent of Calamity"
      ],
      "bosses": [
        "Drake"
      ],
      "vocations": [
        "Fighter",
        "Archer",
        "Thief",
        "Mage",
        "Warrior",
        "Sorcerer",
        "Mystic Spearhand",
        "Magick Archer",
        "Trickster",
        "Warfarer"
      ],
      "map": [
        "op",
        "complete"
      ],
      "route": 23
    },
    {
      "id": "magick_archer",
      "name": "Magick Archer unlock",
      "region": "Agamen Volcanic Island",
      "type": "vocation",
      "x": 58,
      "y": 88,
      "priority": 5,
      "level": 35,
      "desc": "Laatgame vocation-route op Volcanic Island.",
      "loot": [
        "Magick Archer vocation"
      ],
      "quests": [
        "Put a Spring in Thy Step"
      ],
      "bosses": [],
      "vocations": [
        "Fighter",
        "Archer",
        "Thief",
        "Mage",
        "Warrior",
        "Sorcerer",
        "Mystic Spearhand",
        "Magick Archer",
        "Trickster",
        "Warfarer"
      ],
      "map": [
        "op",
        "complete"
      ],
      "route": 24
    },
    {
      "id": "warfarer",
      "name": "Warfarer unlock",
      "region": "Agamen Volcanic Island",
      "type": "vocation",
      "x": 55,
      "y": 87,
      "priority": 5,
      "level": 35,
      "desc": "Laatgame vocation-route. Handig voor flexibele builds.",
      "loot": [
        "Warfarer vocation"
      ],
      "quests": [
        "The Sotted Sage"
      ],
      "bosses": [],
      "vocations": [
        "Fighter",
        "Archer",
        "Thief",
        "Mage",
        "Warrior",
        "Sorcerer",
        "Mystic Spearhand",
        "Magick Archer",
        "Trickster",
        "Warfarer"
      ],
      "map": [
        "op",
        "complete"
      ],
      "route": 25
    },
    {
      "id": "port_vern",
      "name": "Vernworth Portcrystal",
      "region": "Vermund",
      "type": "portcrystal",
      "x": 50,
      "y": 36,
      "priority": 5,
      "level": 10,
      "desc": "Belangrijk fasttravel-anker. Spaar Ferrystones.",
      "loot": [
        "fast travel"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "op",
        "complete"
      ],
      "route": 26
    },
    {
      "id": "port_harve",
      "name": "Harve Portcrystal kandidaat",
      "region": "Vermund",
      "type": "portcrystal",
      "x": 39,
      "y": 48,
      "priority": 4,
      "level": 16,
      "desc": "Sterke plek voor eigen Portcrystal als je veel Harve/Sphinx/kust routes doet.",
      "loot": [
        "route efficiency"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "op",
        "complete"
      ],
      "route": null
    },
    {
      "id": "port_checkpoint",
      "name": "Checkpoint Portcrystal kandidaat",
      "region": "Border",
      "type": "portcrystal",
      "x": 36,
      "y": 60,
      "priority": 5,
      "level": 20,
      "desc": "Een van de handigste eigen Portcrystal-plekken voor midgame.",
      "loot": [
        "route efficiency"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "op",
        "complete"
      ],
      "route": 28
    },
    {
      "id": "port_bak",
      "name": "Bakbattahl Portcrystal kandidaat",
      "region": "Battahl",
      "type": "portcrystal",
      "x": 39,
      "y": 75,
      "priority": 5,
      "level": 25,
      "desc": "Zet hier vroeg een Portcrystal zodra Battahl open is.",
      "loot": [
        "route efficiency"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "op",
        "complete"
      ],
      "route": 29
    },
    {
      "id": "beetle_0_0",
      "name": "Golden Trove Beetle 1-1",
      "region": "Vermund",
      "type": "beetle",
      "x": 55.3,
      "y": 35.2,
      "priority": 3,
      "level": 5,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_0_1",
      "name": "Golden Trove Beetle 1-2",
      "region": "Vermund",
      "type": "beetle",
      "x": 40.9,
      "y": 21.4,
      "priority": 3,
      "level": 5,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_0_2",
      "name": "Golden Trove Beetle 1-3",
      "region": "Vermund",
      "type": "beetle",
      "x": 53.4,
      "y": 31.8,
      "priority": 3,
      "level": 5,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_0_3",
      "name": "Golden Trove Beetle 1-4",
      "region": "Vermund",
      "type": "beetle",
      "x": 50.7,
      "y": 24.9,
      "priority": 3,
      "level": 5,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_0_0",
      "name": "Seeker Token 1-1",
      "region": "Vermund",
      "type": "token",
      "x": 50.1,
      "y": 30.1,
      "priority": 3,
      "level": 5,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_0_1",
      "name": "Seeker Token 1-2",
      "region": "Vermund",
      "type": "token",
      "x": 49.6,
      "y": 21.2,
      "priority": 3,
      "level": 5,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_0_2",
      "name": "Seeker Token 1-3",
      "region": "Vermund",
      "type": "token",
      "x": 46.6,
      "y": 25.9,
      "priority": 3,
      "level": 5,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_0_3",
      "name": "Seeker Token 1-4",
      "region": "Vermund",
      "type": "token",
      "x": 52.5,
      "y": 37.9,
      "priority": 3,
      "level": 5,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_0_4",
      "name": "Seeker Token 1-5",
      "region": "Vermund",
      "type": "token",
      "x": 57.0,
      "y": 28.9,
      "priority": 3,
      "level": 5,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "camp_0_0",
      "name": "Campfire 1-1",
      "region": "Vermund",
      "type": "camp",
      "x": 47.2,
      "y": 24.8,
      "priority": 2,
      "level": 5,
      "desc": "Rustpunt voor routeplanning. Controleer in-game of camping kit veilig is.",
      "loot": [
        "rest point"
      ],
      "quests": [],
      "bosses": [
        "night enemies"
      ],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "camp_0_1",
      "name": "Campfire 1-2",
      "region": "Vermund",
      "type": "camp",
      "x": 41.5,
      "y": 21.4,
      "priority": 2,
      "level": 5,
      "desc": "Rustpunt voor routeplanning. Controleer in-game of camping kit veilig is.",
      "loot": [
        "rest point"
      ],
      "quests": [],
      "bosses": [
        "night enemies"
      ],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_1_0",
      "name": "Golden Trove Beetle 2-1",
      "region": "Vermund",
      "type": "beetle",
      "x": 41.4,
      "y": 39.1,
      "priority": 3,
      "level": 9,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_1_1",
      "name": "Golden Trove Beetle 2-2",
      "region": "Vermund",
      "type": "beetle",
      "x": 40.1,
      "y": 48.3,
      "priority": 3,
      "level": 9,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_1_2",
      "name": "Golden Trove Beetle 2-3",
      "region": "Vermund",
      "type": "beetle",
      "x": 42.4,
      "y": 43.0,
      "priority": 3,
      "level": 9,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_1_3",
      "name": "Golden Trove Beetle 2-4",
      "region": "Vermund",
      "type": "beetle",
      "x": 37.8,
      "y": 34.4,
      "priority": 3,
      "level": 9,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_1_0",
      "name": "Seeker Token 2-1",
      "region": "Vermund",
      "type": "token",
      "x": 38.5,
      "y": 34.7,
      "priority": 3,
      "level": 9,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_1_1",
      "name": "Seeker Token 2-2",
      "region": "Vermund",
      "type": "token",
      "x": 42.2,
      "y": 52.0,
      "priority": 3,
      "level": 9,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_1_2",
      "name": "Seeker Token 2-3",
      "region": "Vermund",
      "type": "token",
      "x": 45.5,
      "y": 35.6,
      "priority": 3,
      "level": 9,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_1_3",
      "name": "Seeker Token 2-4",
      "region": "Vermund",
      "type": "token",
      "x": 49.9,
      "y": 47.9,
      "priority": 3,
      "level": 9,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_1_4",
      "name": "Seeker Token 2-5",
      "region": "Vermund",
      "type": "token",
      "x": 46.7,
      "y": 50.1,
      "priority": 3,
      "level": 9,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "camp_1_0",
      "name": "Campfire 2-1",
      "region": "Vermund",
      "type": "camp",
      "x": 45.7,
      "y": 46.1,
      "priority": 2,
      "level": 9,
      "desc": "Rustpunt voor routeplanning. Controleer in-game of camping kit veilig is.",
      "loot": [
        "rest point"
      ],
      "quests": [],
      "bosses": [
        "night enemies"
      ],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "camp_1_1",
      "name": "Campfire 2-2",
      "region": "Vermund",
      "type": "camp",
      "x": 40.0,
      "y": 48.7,
      "priority": 2,
      "level": 9,
      "desc": "Rustpunt voor routeplanning. Controleer in-game of camping kit veilig is.",
      "loot": [
        "rest point"
      ],
      "quests": [],
      "bosses": [
        "night enemies"
      ],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_2_0",
      "name": "Golden Trove Beetle 3-1",
      "region": "Vermund",
      "type": "beetle",
      "x": 37.4,
      "y": 22.6,
      "priority": 3,
      "level": 13,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_2_1",
      "name": "Golden Trove Beetle 3-2",
      "region": "Vermund",
      "type": "beetle",
      "x": 34.1,
      "y": 31.4,
      "priority": 3,
      "level": 13,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_2_2",
      "name": "Golden Trove Beetle 3-3",
      "region": "Vermund",
      "type": "beetle",
      "x": 29.4,
      "y": 28.5,
      "priority": 3,
      "level": 13,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_2_3",
      "name": "Golden Trove Beetle 3-4",
      "region": "Vermund",
      "type": "beetle",
      "x": 29.8,
      "y": 34.8,
      "priority": 3,
      "level": 13,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_2_0",
      "name": "Seeker Token 3-1",
      "region": "Vermund",
      "type": "token",
      "x": 30.0,
      "y": 34.6,
      "priority": 3,
      "level": 13,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_2_1",
      "name": "Seeker Token 3-2",
      "region": "Vermund",
      "type": "token",
      "x": 27.1,
      "y": 35.7,
      "priority": 3,
      "level": 13,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_2_2",
      "name": "Seeker Token 3-3",
      "region": "Vermund",
      "type": "token",
      "x": 38.0,
      "y": 27.2,
      "priority": 3,
      "level": 13,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_2_3",
      "name": "Seeker Token 3-4",
      "region": "Vermund",
      "type": "token",
      "x": 31.4,
      "y": 36.4,
      "priority": 3,
      "level": 13,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_2_4",
      "name": "Seeker Token 3-5",
      "region": "Vermund",
      "type": "token",
      "x": 34.5,
      "y": 27.7,
      "priority": 3,
      "level": 13,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "camp_2_0",
      "name": "Campfire 3-1",
      "region": "Vermund",
      "type": "camp",
      "x": 26.1,
      "y": 25.5,
      "priority": 2,
      "level": 13,
      "desc": "Rustpunt voor routeplanning. Controleer in-game of camping kit veilig is.",
      "loot": [
        "rest point"
      ],
      "quests": [],
      "bosses": [
        "night enemies"
      ],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "camp_2_1",
      "name": "Campfire 3-2",
      "region": "Vermund",
      "type": "camp",
      "x": 32.8,
      "y": 23.3,
      "priority": 2,
      "level": 13,
      "desc": "Rustpunt voor routeplanning. Controleer in-game of camping kit veilig is.",
      "loot": [
        "rest point"
      ],
      "quests": [],
      "bosses": [
        "night enemies"
      ],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_3_0",
      "name": "Golden Trove Beetle 4-1",
      "region": "Border",
      "type": "beetle",
      "x": 41.5,
      "y": 54.3,
      "priority": 3,
      "level": 17,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_3_1",
      "name": "Golden Trove Beetle 4-2",
      "region": "Border",
      "type": "beetle",
      "x": 41.6,
      "y": 55.0,
      "priority": 3,
      "level": 17,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_3_2",
      "name": "Golden Trove Beetle 4-3",
      "region": "Border",
      "type": "beetle",
      "x": 42.3,
      "y": 61.3,
      "priority": 3,
      "level": 17,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_3_3",
      "name": "Golden Trove Beetle 4-4",
      "region": "Border",
      "type": "beetle",
      "x": 35.1,
      "y": 58.3,
      "priority": 3,
      "level": 17,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_3_0",
      "name": "Seeker Token 4-1",
      "region": "Border",
      "type": "token",
      "x": 38.0,
      "y": 59.8,
      "priority": 3,
      "level": 17,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_3_1",
      "name": "Seeker Token 4-2",
      "region": "Border",
      "type": "token",
      "x": 31.2,
      "y": 52.2,
      "priority": 3,
      "level": 17,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_3_2",
      "name": "Seeker Token 4-3",
      "region": "Border",
      "type": "token",
      "x": 35.2,
      "y": 66.7,
      "priority": 3,
      "level": 17,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_3_3",
      "name": "Seeker Token 4-4",
      "region": "Border",
      "type": "token",
      "x": 37.5,
      "y": 49.5,
      "priority": 3,
      "level": 17,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_3_4",
      "name": "Seeker Token 4-5",
      "region": "Border",
      "type": "token",
      "x": 41.4,
      "y": 62.5,
      "priority": 3,
      "level": 17,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "camp_3_0",
      "name": "Campfire 4-1",
      "region": "Border",
      "type": "camp",
      "x": 40.7,
      "y": 53.7,
      "priority": 2,
      "level": 17,
      "desc": "Rustpunt voor routeplanning. Controleer in-game of camping kit veilig is.",
      "loot": [
        "rest point"
      ],
      "quests": [],
      "bosses": [
        "night enemies"
      ],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "camp_3_1",
      "name": "Campfire 4-2",
      "region": "Border",
      "type": "camp",
      "x": 38.4,
      "y": 51.8,
      "priority": 2,
      "level": 17,
      "desc": "Rustpunt voor routeplanning. Controleer in-game of camping kit veilig is.",
      "loot": [
        "rest point"
      ],
      "quests": [],
      "bosses": [
        "night enemies"
      ],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_4_0",
      "name": "Golden Trove Beetle 5-1",
      "region": "Battahl",
      "type": "beetle",
      "x": 42.4,
      "y": 68.4,
      "priority": 3,
      "level": 21,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_4_1",
      "name": "Golden Trove Beetle 5-2",
      "region": "Battahl",
      "type": "beetle",
      "x": 35.6,
      "y": 78.0,
      "priority": 3,
      "level": 21,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_4_2",
      "name": "Golden Trove Beetle 5-3",
      "region": "Battahl",
      "type": "beetle",
      "x": 33.7,
      "y": 72.4,
      "priority": 3,
      "level": 21,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_4_3",
      "name": "Golden Trove Beetle 5-4",
      "region": "Battahl",
      "type": "beetle",
      "x": 45.7,
      "y": 67.9,
      "priority": 3,
      "level": 21,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_4_0",
      "name": "Seeker Token 5-1",
      "region": "Battahl",
      "type": "token",
      "x": 34.2,
      "y": 79.6,
      "priority": 3,
      "level": 21,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_4_1",
      "name": "Seeker Token 5-2",
      "region": "Battahl",
      "type": "token",
      "x": 38.5,
      "y": 76.3,
      "priority": 3,
      "level": 21,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_4_2",
      "name": "Seeker Token 5-3",
      "region": "Battahl",
      "type": "token",
      "x": 30.6,
      "y": 69.2,
      "priority": 3,
      "level": 21,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_4_3",
      "name": "Seeker Token 5-4",
      "region": "Battahl",
      "type": "token",
      "x": 33.4,
      "y": 75.5,
      "priority": 3,
      "level": 21,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_4_4",
      "name": "Seeker Token 5-5",
      "region": "Battahl",
      "type": "token",
      "x": 31.7,
      "y": 81.1,
      "priority": 3,
      "level": 21,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "camp_4_0",
      "name": "Campfire 5-1",
      "region": "Battahl",
      "type": "camp",
      "x": 33.4,
      "y": 75.2,
      "priority": 2,
      "level": 21,
      "desc": "Rustpunt voor routeplanning. Controleer in-game of camping kit veilig is.",
      "loot": [
        "rest point"
      ],
      "quests": [],
      "bosses": [
        "night enemies"
      ],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "camp_4_1",
      "name": "Campfire 5-2",
      "region": "Battahl",
      "type": "camp",
      "x": 33.3,
      "y": 68.6,
      "priority": 2,
      "level": 21,
      "desc": "Rustpunt voor routeplanning. Controleer in-game of camping kit veilig is.",
      "loot": [
        "rest point"
      ],
      "quests": [],
      "bosses": [
        "night enemies"
      ],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_5_0",
      "name": "Golden Trove Beetle 6-1",
      "region": "Battahl",
      "type": "beetle",
      "x": 55.0,
      "y": 72.5,
      "priority": 3,
      "level": 25,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_5_1",
      "name": "Golden Trove Beetle 6-2",
      "region": "Battahl",
      "type": "beetle",
      "x": 44.9,
      "y": 81.1,
      "priority": 3,
      "level": 25,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_5_2",
      "name": "Golden Trove Beetle 6-3",
      "region": "Battahl",
      "type": "beetle",
      "x": 48.2,
      "y": 70.7,
      "priority": 3,
      "level": 25,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_5_3",
      "name": "Golden Trove Beetle 6-4",
      "region": "Battahl",
      "type": "beetle",
      "x": 57.8,
      "y": 72.4,
      "priority": 3,
      "level": 25,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_5_0",
      "name": "Seeker Token 6-1",
      "region": "Battahl",
      "type": "token",
      "x": 40.7,
      "y": 74.9,
      "priority": 3,
      "level": 25,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_5_1",
      "name": "Seeker Token 6-2",
      "region": "Battahl",
      "type": "token",
      "x": 52.3,
      "y": 82.8,
      "priority": 3,
      "level": 25,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_5_2",
      "name": "Seeker Token 6-3",
      "region": "Battahl",
      "type": "token",
      "x": 42.3,
      "y": 74.7,
      "priority": 3,
      "level": 25,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_5_3",
      "name": "Seeker Token 6-4",
      "region": "Battahl",
      "type": "token",
      "x": 40.6,
      "y": 77.0,
      "priority": 3,
      "level": 25,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_5_4",
      "name": "Seeker Token 6-5",
      "region": "Battahl",
      "type": "token",
      "x": 55.3,
      "y": 82.8,
      "priority": 3,
      "level": 25,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "camp_5_0",
      "name": "Campfire 6-1",
      "region": "Battahl",
      "type": "camp",
      "x": 55.6,
      "y": 81.6,
      "priority": 2,
      "level": 25,
      "desc": "Rustpunt voor routeplanning. Controleer in-game of camping kit veilig is.",
      "loot": [
        "rest point"
      ],
      "quests": [],
      "bosses": [
        "night enemies"
      ],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "camp_5_1",
      "name": "Campfire 6-2",
      "region": "Battahl",
      "type": "camp",
      "x": 55.1,
      "y": 80.9,
      "priority": 2,
      "level": 25,
      "desc": "Rustpunt voor routeplanning. Controleer in-game of camping kit veilig is.",
      "loot": [
        "rest point"
      ],
      "quests": [],
      "bosses": [
        "night enemies"
      ],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_6_0",
      "name": "Golden Trove Beetle 7-1",
      "region": "Agamen Volcanic Island",
      "type": "beetle",
      "x": 55.6,
      "y": 81.6,
      "priority": 3,
      "level": 29,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_6_1",
      "name": "Golden Trove Beetle 7-2",
      "region": "Agamen Volcanic Island",
      "type": "beetle",
      "x": 58.6,
      "y": 83.1,
      "priority": 3,
      "level": 29,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_6_2",
      "name": "Golden Trove Beetle 7-3",
      "region": "Agamen Volcanic Island",
      "type": "beetle",
      "x": 49.6,
      "y": 85.2,
      "priority": 3,
      "level": 29,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "beetle_6_3",
      "name": "Golden Trove Beetle 7-4",
      "region": "Agamen Volcanic Island",
      "type": "beetle",
      "x": 62.0,
      "y": 80.0,
      "priority": 3,
      "level": 29,
      "desc": "Checklist-marker: verhoogt draaggewicht. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Golden Trove Beetle"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_6_0",
      "name": "Seeker Token 7-1",
      "region": "Agamen Volcanic Island",
      "type": "token",
      "x": 57.7,
      "y": 83.9,
      "priority": 3,
      "level": 29,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_6_1",
      "name": "Seeker Token 7-2",
      "region": "Agamen Volcanic Island",
      "type": "token",
      "x": 56.3,
      "y": 78.9,
      "priority": 3,
      "level": 29,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_6_2",
      "name": "Seeker Token 7-3",
      "region": "Agamen Volcanic Island",
      "type": "token",
      "x": 65.2,
      "y": 81.2,
      "priority": 3,
      "level": 29,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_6_3",
      "name": "Seeker Token 7-4",
      "region": "Agamen Volcanic Island",
      "type": "token",
      "x": 58.1,
      "y": 84.4,
      "priority": 3,
      "level": 29,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "token_6_4",
      "name": "Seeker Token 7-5",
      "region": "Agamen Volcanic Island",
      "type": "token",
      "x": 46.4,
      "y": 87.2,
      "priority": 3,
      "level": 29,
      "desc": "Checklist-marker: Seeker Token cluster. Exacte positie kun je later in de editor fijnafstellen.",
      "loot": [
        "Seeker Token"
      ],
      "quests": [],
      "bosses": [],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "camp_6_0",
      "name": "Campfire 7-1",
      "region": "Agamen Volcanic Island",
      "type": "camp",
      "x": 51.0,
      "y": 79.8,
      "priority": 2,
      "level": 29,
      "desc": "Rustpunt voor routeplanning. Controleer in-game of camping kit veilig is.",
      "loot": [
        "rest point"
      ],
      "quests": [],
      "bosses": [
        "night enemies"
      ],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    },
    {
      "id": "camp_6_1",
      "name": "Campfire 7-2",
      "region": "Agamen Volcanic Island",
      "type": "camp",
      "x": 49.5,
      "y": 81.3,
      "priority": 2,
      "level": 29,
      "desc": "Rustpunt voor routeplanning. Controleer in-game of camping kit veilig is.",
      "loot": [
        "rest point"
      ],
      "quests": [],
      "bosses": [
        "night enemies"
      ],
      "vocations": [],
      "map": [
        "complete"
      ],
      "route": null
    }
  ],
  "gear": [
    {
      "name": "Two-Hander",
      "type": "weapon",
      "vocation": "Warrior",
      "where": "Trevo Mine",
      "note": "Nodig/handig voor Warrior unlock via Vocation Frustration."
    },
    {
      "name": "Archistaff",
      "type": "weapon",
      "vocation": "Sorcerer",
      "where": "Trevo Mine",
      "note": "Nodig/handig voor Sorcerer unlock via Vocation Frustration."
    },
    {
      "name": "Ferrystone",
      "type": "item",
      "vocation": "All",
      "where": "Merchants/chests/quest rewards",
      "note": "Niet verspillen; gebruik pas voor lange terugreis of Portcrystal route."
    },
    {
      "name": "Wakestone Shard",
      "type": "item",
      "vocation": "All",
      "where": "Chests/quests/exploration",
      "note": "Altijd meenemen; redt je bij bazen en escort quests."
    },
    {
      "name": "Golden Trove Beetle",
      "type": "collectible",
      "vocation": "All",
      "where": "Bomen/rotsen langs routes",
      "note": "Permanent meer draaggewicht. Prioriteit voor jouw speelstijl."
    },
    {
      "name": "Seeker Token",
      "type": "collectible",
      "vocation": "All",
      "where": "Verborgen locaties",
      "note": "Checklist-object; eerste tokenlocatie onthouden voor Sphinx."
    }
  ],
  "quests": [
    {
      "name": "Vocation Frustration",
      "region": "Vernworth/Trevo Mine",
      "spoiler": "Unlock Warrior en Sorcerer door wapens uit Trevo Mine te halen."
    },
    {
      "name": "Monster Culling",
      "region": "Vermund",
      "spoiler": "Brant-opdracht; combineer met Harve en Trevo-routes."
    },
    {
      "name": "Readvent of Calamity",
      "region": "Melve",
      "spoiler": "Belangrijke Melve-drake en Mystic Spearhand context."
    },
    {
      "name": "The Nameless Village",
      "region": "Vermund",
      "spoiler": "Thief/false Sovran route."
    },
    {
      "name": "A Game of Wits",
      "region": "Sphinx",
      "spoiler": "Maak inn save; eerste Seeker Token locatie is belangrijk."
    },
    {
      "name": "Nation of the Lambent Flame",
      "region": "Checkpoint/Battahl",
      "spoiler": "Grens naar Battahl; bereid gear en Portcrystal voor."
    },
    {
      "name": "Put a Spring in Thy Step",
      "region": "Volcanic Island",
      "spoiler": "Magick Archer unlock route."
    },
    {
      "name": "The Sotted Sage",
      "region": "Volcanic Island",
      "spoiler": "Warfarer unlock route."
    }
  ]
};