# Sprint 4B.5 — Stable map recalibration

Deze patch herstelt de kaartkalibratie-aanpak na Sprint 4B.4.

## Probleem

Sprint 4B.4 gebruikte de actuele `world_x/world_y` als bronsysteem voor een globale transformatie. Dat is fout zodra die actuele waarden al eerder gecorrigeerd of handmatig geplaatst waren. Dan worden reeds-gekalibreerde punten opnieuw als bron behandeld en kunnen markers juist verder verschuiven, bijvoorbeeld richting zee.

## Nieuwe regel

De stabiele pipeline gebruikt voortaan:

1. `location_seed_points_import_template.csv` als bron-coördinatenstelsel.
2. `location_calibration_points_import_template.csv` als doel-coördinatenstelsel op onze kaart.
3. `locations_import_template.csv` en `entity_map_points_import_template.csv` worden daaruit opnieuw opgebouwd.

Niet-gesedde, niet-gekalibreerde locaties blijven staan waar ze staan. Ze worden dus niet opnieuw door een globale transformatie gehaald.

## Verwerkte exacte punten van de gebruiker

De volgende exacte punten zijn verwerkt in `location_calibration_points_import_template.csv`:

- Borderwatch Outpost — 1170,1851
- Melve — 1104,1710
- Vernworth Vocation Guild — 1210,1328
- Trevo Mine — 960,1381
- Nameless Village — 1590,1456
- Checkpoint Rest Town — 377,1276
- Bakbattahl — 603,838
- Forbidden Magick Research Lab — 662,831
- Sacred Arbor — 850,1744
- Dragonforged — 717,978
- Volcanic Island Camp — 943,603
- Excavation Site — 1155,519

Harve Village is nog niet verwerkt als nieuw exact punt, omdat de coördinaat nog leeg was.

## Gebruik

```powershell
npm.cmd run recalculate:locations -- --write
npm.cmd run import:csv
npm.cmd run import:walkthrough
npm.cmd run import:points
npm.cmd run import:objectives
npm.cmd run export:json
npm.cmd run export:points
npm.cmd run export:objectives
Copy-Item .\database\exports\*.json .\app\public\data\ -Force
cd app
npm.cmd run build
cd ..
```

## Niet meer gebruiken

Gebruik `recalculate:global-map` niet meer als vrije globale transformatie op actuele `world_x/world_y`. In `package.json` verwijst dat script nu bewust naar de stabiele recalculatie om fouten te voorkomen.

## Resterend

Enkele punten hebben nog geen eigen seed of kalibratiepunt, bijvoorbeeld sommige Golden Trove Beetles en losse sublocaties. Die kunnen pas echt exact worden als er een handmatig punt of source-map coördinaat voor bestaat.
