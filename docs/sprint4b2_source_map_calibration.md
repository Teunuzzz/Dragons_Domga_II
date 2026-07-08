# Sprint 4B.2 — Source-map coordinate calibration

Deze patch legt de juiste werkwijze vast voor coördinaten uit externe bronnen.

## Probleem

De oude flow gebruikte één algemene herkalibratie op bestaande app-coördinaten. Dat is bruikbaar voor handmatig gecorrigeerde app-markers, maar niet goed genoeg voor coördinaten uit andere bronnen. Een coördinaat uit Game8, GamesRadar of een andere map is namelijk geen app-coördinaat. Het hoort bij het coördinatenstelsel van die bron.

Daarom kunnen punten verkeerd eindigen, zelfs in zee, als ze als directe `world_x/world_y` in onze map worden gezet.

## Nieuwe regel

Voor elke externe bron geldt voortaan:

1. Bewaar de originele broncoördinaat apart.
2. Bewaar minimaal 3 bekende bronankers uit dezelfde bron.
3. Koppel die bronankers aan dezelfde punten op onze kaart.
4. Reken broncoördinaten om naar onze kaart via een transformatie per `source_key`.
5. Schrijf pas daarna `world_x/world_y` in de app-template.

## Nieuwe templates

- `database/imports/templates/map_source_calibration_points_import_template.csv`
- `database/imports/templates/location_source_coords_import_template.csv`
- `database/imports/templates/entity_map_point_source_coords_import_template.csv`

## Commands

Preview:

```powershell
npm.cmd run report:source-map
npm.cmd run recalculate:source-map
```

Schrijven:

```powershell
npm.cmd run recalculate:source-map -- --write
```

Daarna normale pipeline:

```powershell
npm.cmd run import:csv
npm.cmd run import:walkthrough
npm.cmd run import:points
npm.cmd run import:objectives

npm.cmd run export:json
npm.cmd run export:walkthrough
npm.cmd run export:points
npm.cmd run export:objectives
```

## Forbidden Magick Research Lab

De screenshot-correctie is alvast vastgelegd als handmatige kalibratie:

```text
forbidden_magick_research_lab: x 1122, y 749 -> x 662, y 831
```

Dit is een directe correctie totdat de echte bronmapcoördinaten met bronankers zijn toegevoegd.

## Belangrijk

GitHub Pages is statisch. De knop **Schrijf weg + herbereken alles** kan daar niet naar de repository schrijven. Bij gebruik op de beta-site krijg je daarom HTTP 405. Gebruik de knop lokaal via `npm.cmd run dev`, of kopieer de CSV-regel handmatig naar de template.
