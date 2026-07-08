# Sprint 3K — Auto weighted calibration

Deze sprint maakt de kalibratie-flow sneller en nauwkeuriger.

## Wat is nieuw

- De app krijgt een knop: **Schrijf weg + herbereken alles**.
- Die knop werkt lokaal tijdens `npm.cmd run dev` via een Vite development endpoint.
- De knop schrijft gesleepte kalibratiepunten naar `database/imports/templates/location_calibration_points_import_template.csv`.
- Daarna draait automatisch de herberekening, import/export-pipeline en kopieert JSON naar `app/public/data`.
- De herberekening gebruikt standaard een **weighted-ratio** methode in plaats van alleen affine rotatie/schaal.
- Exacte entity-punten worden mee verschoven met hun gekoppelde hoofdlocatie.

## Weighted-ratio methode

Voor elk berekend punt wordt gekeken naar alle vaste kalibratiepunten. Elk kalibratiepunt krijgt invloed op basis van afstand in de bronkaart:

- dichtbij = veel invloed
- ver weg = weinig invloed
- exact hetzelfde punt = direct dat gecorrigeerde punt

De tool rekent met inverse-distance weighting:

```text
nieuwe puntpositie = bronpositie + gewogen gemiddelde van alle kalibratie-delta's
```

Dit sluit aan bij de gewenste werkwijze: als een locatie in de brondata relatief dichter bij kalibratiepunt A dan bij B/C/D ligt, dan beweegt die locatie ook vooral mee met A.

## Lokaal gebruik

1. Start de app lokaal:

```powershell
cd C:\Users\akker\Documents\GitHub\Dragons_Domga_II\app
npm.cmd run dev
```

2. Zet **Kalibratiemodus** aan.
3. Sleep één of meer markers naar de juiste plek.
4. Klik **Schrijf weg + herbereken alles**.
5. De app schrijft correcties weg, draait de pipeline en herlaadt automatisch.

## Handmatig alternatief

De knop voert ongeveer dit uit:

```powershell
node .\tools\recalculate_locations_from_calibration.js --write --method weighted
npm.cmd run import:csv
node .\tools\import_walkthrough_csv_to_sqlite.js
npm.cmd run export:json
node .\tools\export_walkthrough_json.js
node .\tools\export_entity_map_points_json.js
Copy-Item .\database\exports\*.json .\app\public\data\ -Force
```

## Belangrijk

Deze automatische knop werkt niet op GitHub Pages, omdat een statische PWA geen bestanden in de repository mag schrijven. Op GitHub Pages blijft de app read-only. De automatische flow is bedoeld voor lokale ontwikkeling.

## Commit-regel

Commit wel:

- `app/src/App.tsx`
- `app/src/App.css`
- `app/vite.config.ts`
- `tools/recalculate_locations_from_calibration.js`
- `docs/sprint3k_auto_weighted_calibration.md`

Commit geen `.bak-sprint3k-*` bestanden.
