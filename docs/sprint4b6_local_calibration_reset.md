# Sprint 4B.6 — Local calibration reset + navigator cleanup

Probleem:
- De app paste tijdelijke browser-correcties uit `localStorage` altijd toe op de gewone kaartweergave.
- Daardoor konden oude gesleepte correcties de nieuwe database/export overschrijven in de browser.
- Voorbeeld: Dragonforged had in de database het juiste anker `x 717, y 978`, maar een oude lokale correctie sleepte hem naar `x 1076, y 972`.

Fix:
- Legacy localStorage-key `dd2_location_calibration_corrections_v1` wordt bij laden gewist.
- Nieuwe tijdelijke correcties gebruiken `dd2_location_calibration_corrections_v2`.
- Tijdelijke correcties beïnvloeden de kaart alleen nog wanneer kalibratiemodus actief is.
- De knop "Wis tijdelijke correcties" wist nu ook echt de localStorage-correcties.
- Navigator-next marker kiest niet meer per ongeluk de vorige stap als 'volgende'.

Na deploy:
- Ctrl+F5.
- Indien nog oude correcties zichtbaar zijn: klik in Kalibratiehulp op "Wis tijdelijke correcties".
