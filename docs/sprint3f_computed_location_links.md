# Sprint 3F — Computed location links

Deze patch voegt een eerste berekende locatielaag toe voor items, quests, NPCs, vendors en vocations.

## Methode

De bestaande seed bevatte oudere anchor-punten in een compact coördinatensysteem. Vier daarvan waren al handmatig gekalibreerd op de definitieve Leaflet-map:

- Borderwatch Outpost → 1170,1851
- Melve → 1104,1723
- Vernworth → 1205,1327
- Trevo Mine → 967,1495

Met deze vier paren is een affine-transformatie berekend:

```text
x_new = 2.23495982 * x_old - 0.01429136 * y_old - 16.9972416
y_new = 0.44287512 * x_old - 2.05585404 * y_old + 1799.32833
```

Daarmee zijn de overige seed-anchors omgerekend naar de definitieve map. Sub-locaties zoals Roderick's Smithy, Vernworth Vocation Guild en Hot Springs zijn vervolgens als kleine offsets rond hun hoofdlocaties geplaatst.

## Belangrijk

Dit is een professionele **v0.1-locatielaag**, geen perfecte marker-database. De app mag deze punten tonen, maar noteert in de data dat diverse punten nog in-game of met de kalibratiehulp gecontroleerd moeten worden.

We kopiëren geen commerciële markerdata. We gebruiken publieke bronnen alleen als referentie voor naam/relatie, en gebruiken eigen/berekende coördinaten.

## Toegevoegd

- `locations_import_template.csv` met 29 locaties/sub-locaties
- gekoppelde startlocaties voor quests
- gekoppelde objectives/stages voor quests
- gekoppelde NPC-locaties
- gekoppelde vendor-locaties
- gekoppelde vocation-unlock-locaties
- bestaande Trevo Mine item-locaties blijven behouden
- frontend locatiechips + kalibratiehulp vanuit Sprint 3E zijn inbegrepen

## Gebruik

```powershell
npm.cmd run import:csv
node .	ools\import_walkthrough_csv_to_sqlite.js
npm.cmd run export:json
node .	ools\export_walkthrough_json.js
Copy-Item .\database\exports\*.json .pp\public\data\ -Force
node .	oolseport_location_coverage.js
cd .pp
npm.cmd run build
```

## Volgende controlepunten

Controleer in de app vooral:

- Checkpoint Rest Town
- Bakbattahl
- Sacred Arbor
- Harve Village
- Nameless Village
- Reverent Shrine
- Volcanic Island Camp
- Windwalker's Home
- Drabnir's Grotto
- Bay Wayside Shrine / Dragonforged
