# Sprint 4B.3 — Navigator visibility + safe coordinate display

Fixes:

- De navigator toont nu altijd een actieve GPS-marker en een volgende-stap-marker wanneer er een actieve objective is.
- De navigator-polyline is duidelijker gemaakt en gebruikt een fallback naar objective/location-coördinaten als een exact point niet betrouwbaar is.
- Unverified external exact points worden niet meer als marker gebruikt zolang de bijbehorende bronkaart niet source-map gekalibreerd is.
- Exact points van `own_calibration`, `manual_screen_calibration`, `source_map_calibration`, `dd2_seed_grid` en verified punten blijven zichtbaar.

Waarom:

Externe bronnen zoals Game8/Fextralife gebruiken niet automatisch dezelfde kaartprojectie als onze kaart. Directe `world_x/world_y` uit zo'n bron mag daarom niet zichtbaar worden als exact punt totdat die bron eigen kalibratie-ankers heeft.

Workflow vanaf nu:

1. Bronkaart toevoegen met eigen `source_key`.
2. Minimaal 3, liever 6-10, ankerpunten van diezelfde bron toevoegen.
3. Items/locaties alleen als `source_x/source_y` uit die bron invoeren.
4. `npm.cmd run recalculate:source-map -- --write` draaien.
5. Import/export/build/push.
