# Sprint 3K fix — locked calibration points + no npm.cmd pipeline

Deze fix lost twee problemen op:

1. Kalibratiepunten zonder expliciete seed, zoals `ancestral_chamber`, werden genegeerd door de herberekentool. Daardoor kon een gesleepte marker na herberekenen terug springen naar de berekende positie. De tool gebruikt nu voor iedere locatie zonder seed de huidige CSV-positie als fallback seed, zodat elke locatie als vast kalibratiepunt kan dienen.

2. De lokale Vite-knop gebruikte `npm.cmd`, wat op Windows problemen gaf met quoting. De lokale pipeline draait nu rechtstreeks de Node-tools:

- `tools/recalculate_locations_from_calibration.js --write --method weighted`
- `tools/import_csv_to_sqlite.js`
- `tools/import_walkthrough_csv_to_sqlite.js`
- optioneel `tools/import_entity_map_points.js`
- `tools/export_sqlite_to_json.js`
- `tools/export_walkthrough_json.js`
- optioneel `tools/export_entity_map_points_json.js`

Daarna kopieert de plugin alle JSON uit `database/exports/` naar `app/public/data/`.

Gebruik:

1. Start lokaal met `npm.cmd run dev`.
2. Zet kalibratiemodus aan.
3. Sleep markers.
4. Klik `Schrijf weg + herbereken alles`.

Op GitHub Pages blijft dit niet mogelijk, omdat GitHub Pages geen bestanden in de repo kan wijzigen.
