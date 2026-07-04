# Dragon's Dogma II Companion App - Project Pipeline

Dit project gebruikt een professionele data-pipeline.

De website/app leest uiteindelijk geen losse handmatige data en ook geen SQLite direct.  
SQLite is de centrale database. De frontend gebruikt alleen geëxporteerde JSON-bestanden.

---

## Hoofdprincipe

```text
CSV import templates
        ↓
Node.js importer
        ↓
SQLite Master Database
        ↓
Node.js exporter
        ↓
JSON exports
        ↓
React + Leaflet + PWA frontend