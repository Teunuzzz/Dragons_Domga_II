# Sprint 3G — Interactive calibration recalculation

Doel: bestaande berekende locaties in de app kunnen verslepen en die correcties gebruiken om alle computed locations opnieuw te berekenen.

## Wat is toegevoegd

- Kalibratiemodus in de frontend.
- Bestaande kaartmarkers zijn versleepbaar als kalibratiemodus aan staat.
- Iedere sleepactie maakt een correctiepunt met oude en nieuwe x/y.
- Correctiepunten worden tijdelijk in `localStorage` bewaard.
- De app toont een CSV-blok dat gekopieerd kan worden naar:

```text
database/imports/templates/location_calibration_points_import_template.csv
```

- Nieuwe tool:

```text
tools/recalculate_locations_from_calibration.js
```

- Nieuwe templates:

```text
database/imports/templates/location_seed_points_import_template.csv
database/imports/templates/location_calibration_points_import_template.csv
```

## Werkwijze

1. Start de app.
2. Zet **Kalibratiemodus** aan.
3. Sleep 1 of meer bestaande markers naar de juiste plek.
4. Kopieer de correctie-CSV uit het paneel.
5. Plak de regels onder de bestaande regels in:

```text
database/imports/templates/location_calibration_points_import_template.csv
```

Laat de 4 originele kalibratieregels staan.

6. Draai eerst een preview:

```powershell
node .\tools\recalculate_locations_from_calibration.js
```

7. Als de preview logisch is, schrijf de nieuwe `locations_import_template.csv`:

```powershell
node .\tools\recalculate_locations_from_calibration.js --write
```

De tool maakt automatisch een `.bak-sprint3g-*` backup van de oude `locations_import_template.csv`.

8. Daarna de normale pipeline draaien:

```powershell
npm.cmd run import:csv
node .\tools\import_walkthrough_csv_to_sqlite.js

npm.cmd run export:json
node .\tools\export_walkthrough_json.js

Copy-Item .\database\exports\*.json .\app\public\data\ -Force

cd .\app
npm.cmd run build
npm.cmd run dev
```

## Hoe de berekening werkt

De tool gebruikt een least-squares affine transform:

```text
source_x/source_y + kalibratiepunten -> nieuwe world_x/world_y
```

Voor hoofdlocaties wordt de affine transform gebruikt. Voor sublocaties met `source_type = computed_offset` beweegt de sublocatie mee met de parent-locatie plus vaste offset. Daardoor schuift bijvoorbeeld `bakbattahl_vocation_guild` mee als `bakbattahl` wordt gecorrigeerd.

## Belangrijke regels

- Corrigeer bij voorkeur hoofdankers, niet kleine sublocaties.
- Goede eerste correcties:
  - Checkpoint Rest Town
  - Bakbattahl
  - Sacred Arbor
  - Volcanic Island Camp
  - Seafloor Shrine
  - Moonglint Tower
- Gebruik minimaal 3 kalibratiepunten; de 4 originele punten staan al in de template.
- Voeg daarna stap voor stap 1–3 nieuwe correcties toe, exporteer opnieuw en controleer visueel.

## Niet committen

De backupbestanden moeten niet naar Git:

```text
database/imports/templates/*.bak-sprint3g-*
```

De gegenereerde preview staat in:

```text
database/imports/generated/locations_import_template_recalculated_preview.csv
```

en valt onder bestaande ignore voor `database/imports/generated/`.
