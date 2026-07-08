# Sprint 3J — Exact Entity Map Points

Doel: items, NPCs, vendors, quests, vocations en route-stappen niet alleen koppelen aan een grote `location_key`, maar ook aan een eigen kaartpunt binnen die locatie.

Voorbeeld:

```text
Two-Hander → Trevo Mine algemeen      ❌ te grof
Two-Hander → specifieke chestpositie  ✅ beter voor OP-route
```

## Nieuwe databron

```text
database/imports/templates/entity_map_points_import_template.csv
```

Belangrijkste kolommen:

```text
point_key
entity_type
entity_key
route_key
step_key
location_key
world_x
world_y
accuracy_level
route_priority
source_key
```

Ondersteunde `entity_type` waarden in deze sprint:

```text
item
npc
vendor
quest
vocation
route_step
quest_objective
```

## Accuracy levels

```text
verified        = handmatig gecontroleerd of basis-kalibratiepunt
estimated_high  = berekend binnen kleine sublocatie, waarschijnlijk bruikbaar
estimated_medium= bruikbaar als v0.1 marker, later controleren
estimated_low   = grove contextmarker
```

## Pipeline

Voer na aanpassen van CSV uit:

```powershell
node .\tools\import_entity_map_points.js
node .\tools\export_entity_map_points_json.js
Copy-Item .\database\exports\entity_map_points.json .\app\public\data\ -Force
```

Daarna frontend build:

```powershell
cd .\app
npm.cmd run build
```

## Frontend

De app laadt nu:

```text
/data/entity_map_points.json
```

Effect:

- item/NPC/vendor/quest/vocation-markers gebruiken exacte punten als die beschikbaar zijn;
- route-step exact points worden als aparte laag **Exacte punten** getoond;
- route-stap detailpaneel toont exacte routepunten;
- klikken op een exacte route-step marker selecteert de route-stap.

## Uitbreiden

Nieuwe exacte punten voeg je toe als extra CSV-regels. Voor handmatig gecorrigeerde punten zet je:

```text
accuracy_level = verified
is_verified = 1
source_key = own_calibration
```

