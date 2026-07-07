# Sprint 3A — Walkthrough Content Expansion

Doel: de database geschikt maken voor een volledige, professionele Dragon's Dogma II OP-walkthrough, zonder dat de frontend ooit SQLite direct leest.

## Vast uitgangspunt

```text
CSV templates
↓
Node importer
↓
SQLite database = enige waarheid
↓
Node exporter
↓
JSON in database/exports
↓
Copy naar app/public/data
↓
React/Vite/Leaflet PWA
```

## Wat deze patch toevoegt

### Schema

Nieuw bestand:

```text
database/schema/007_walkthrough_content_schema.sql
```

Nieuwe onderdelen:

- `game_flags`
- `op_route_phases`
- `op_route_phase_steps`
- `route_step_checklist_items`
- `route_step_locations`
- `npcs`
- `npc_locations`
- `vendors`
- `vendor_inventory`
- `item_stats`
- `item_sources`
- `quest_requirements`
- `quest_stages`
- `quest_objectives`
- `quest_rewards`
- `quest_choices`
- `vocation_unlocks`
- `skills`
- `vocation_skill_links`
- `maister_teachings`
- view `v_route_steps_enriched`

De bestaande tabellen `items`, `quests`, `vocations`, `op_route_steps`, `route_step_requirements`, `route_step_rewards` en `route_step_items` blijven leidend waar ze al bestaan.

## CSV-templates

Deze patch voegt templates toe in:

```text
database/imports/templates/
```

Belangrijkste templates:

- `op_route_phases_import_template.csv`
- `op_route_phase_steps_import_template.csv`
- `route_step_checklist_items_import_template.csv`
- `route_step_requirements_import_template.csv`
- `route_step_rewards_import_template.csv`
- `route_step_items_import_template.csv`
- `game_flags_import_template.csv`
- `npcs_import_template.csv`
- `npc_locations_import_template.csv`
- `vendors_import_template.csv`
- `vendor_inventory_import_template.csv`
- `item_stats_import_template.csv`
- `item_sources_import_template.csv`
- `quest_stages_import_template.csv`
- `quest_objectives_import_template.csv`
- `quest_rewards_import_template.csv`
- `quest_choices_import_template.csv`
- `vocation_unlocks_import_template.csv`
- `skills_import_template.csv`
- `vocation_skill_links_import_template.csv`
- `maister_teachings_import_template.csv`
- `source_refs_import_template.csv`
- `reference_sources_import_template.csv`

## Tools

Nieuwe importtool:

```text
tools/import_walkthrough_csv_to_sqlite.js
```

Nieuwe exporttool:

```text
tools/export_walkthrough_json.js
```

Output van `export_walkthrough_json.js`:

```text
database/exports/walkthroughs.json
database/exports/vocations.json
database/exports/quest_details.json
database/exports/item_details.json
database/exports/npcs.json
database/exports/vendors.json
database/exports/game_flags.json
```

## Aanbevolen PowerShell-volgorde

Vanaf repo-root:

```powershell
cd C:\Users\akker\Documents\GitHub\Dragons_Domga_II

# 1. Voeg schema toe aan je normale database-opbouw of voer het eenmalig uit via je SQLite-tool.
# Bestand:
# database\schema\007_walkthrough_content_schema.sql

# 2. Bestaande basisdata importeren
npm.cmd run import:csv

# 3. Nieuwe Sprint 3A-data importeren
node .\tools\import_walkthrough_csv_to_sqlite.js

# 4. Bestaande JSON exporteren
npm.cmd run export:json

# 5. Nieuwe Sprint 3A JSON exporteren
node .\tools\export_walkthrough_json.js

# 6. Naar frontend kopiëren
Copy-Item .\database\exports\*.json .\app\public\data\ -Force

# 7. Frontend testen
cd .\app
npm.cmd run dev
npm.cmd run build
```

## Bronbeleid voor open source

Gebruik publieke bronnen als referentie, maar kopieer niet letterlijk complete teksten, commerciële markerdata, screenshots of complete databases.

Per database-record gebruiken we:

- eigen `*_key` slugs;
- eigen korte beschrijvingen;
- eigen routeprioriteit;
- eigen checklistlabels;
- bronverwijzingen in `sources` en `source_refs`;
- `notes` voor verificatiestatus.

Beste betrouwbaarheid:

1. eigen PS5-playthrough / eigen verificatie;
2. officiële Capcom-bronnen voor officiële namen en vocations;
3. meerdere communitybronnen ter controle;
4. één losse communitybron alleen als voorlopige data met `notes = verify`.

## Data eerst vullen in deze volgorde

1. locaties die de walkthrough nodig heeft;
2. routefases;
3. route-steps;
4. checklist-items per step;
5. rewards/requirements per step;
6. items + item_stats + item_sources;
7. quests + quest_stages + quest_objectives;
8. NPCs/vendors;
9. vocation_unlocks;
10. daarna pas meer collectibles en volledige mapvulling.

## Belangrijk

De meegeleverde CSV-rijen zijn deels placeholders zodat de importer direct testbaar is met je huidige basis. Vervang `placeholder`-records pas door echte DD2-data nadat de schema/import/export-keten werkt.
