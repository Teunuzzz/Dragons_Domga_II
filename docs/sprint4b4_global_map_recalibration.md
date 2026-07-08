# Sprint 4B.4 — Global map recalibration from user exact points

Doel: geen punten meer "verbergen" als oplossing. De gebruiker geeft kleine, herkenbare exacte punten op de eigen kaart. De tool gebruikt deze ankers om alle bestaande kaartdata opnieuw te berekenen.

## Bestanden

- `database/imports/templates/map_global_calibration_points_import_template.csv`
- `tools/recalculate_all_map_points_from_calibration.js`
- `tools/report_map_calibration_accuracy.js`

## Methode

De tool gebruikt lokale gewogen affine interpolatie:

1. Voor elk anker wordt de huidige databasecoördinaat gelezen.
2. Het verschil naar de door de gebruiker opgegeven exacte coördinaat wordt bepaald.
3. Voor elk locatie- en entity-map-point wordt op basis van de dichtstbijzijnde ankers een lokale affine transformatie berekend.
4. Kalibratie-ankers zelf worden exact vastgezet op de opgegeven coördinaat.

Dit is bewust géén simpele globale schuif. De correctie verandert per gebied, zodat Vermund, Battahl en Volcanic Island apart beter kunnen vallen.

## Workflow

```powershell
npm.cmd run report:global-map
npm.cmd run recalculate:global-map -- --write
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

## Let op

- `harve_village_riftstone` staat bewust alvast in de template, maar zonder coördinaten. De tool slaat die rij over totdat de gebruiker het exacte punt invult.
- De tool schrijft rapporten naar `database/imports/generated/`.
- Standaard worden geen backupbestanden gemaakt, zodat er niets per ongeluk naar Git gaat. Gebruik `--backup` alleen als je lokaal `.bak-global-map-*` wilt bewaren.
