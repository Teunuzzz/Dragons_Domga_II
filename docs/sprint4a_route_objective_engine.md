# Sprint 4A — Route Objective Engine

Doel: de OP-route niet meer alleen als globale route tonen, maar als exacte stap-voor-stap walkthrough met objective cards.

## Toegevoegd

### Database

Nieuw schema:

- `database/schema/009_walkthrough_objectives_schema.sql`

Nieuwe tabellen:

- `route_objectives`
- `route_objective_steps`
- `route_objective_actions`
- `route_decisions`
- `vocation_route_profiles`
- `vocation_route_step_rules`

Hiermee kan één route-step worden verrijkt met:

- wat je nu moet doen;
- wat je moet pakken;
- welke quest of sidequest wel/niet belangrijk is;
- beloningen/flags;
- vocation-profielregels;
- OP Fast / completionist beslissingen.

### CSV templates

Nieuw in `database/imports/templates/`:

- `route_objectives_import_template.csv`
- `route_objective_steps_import_template.csv`
- `route_objective_actions_import_template.csv`
- `route_decisions_import_template.csv`
- `vocation_route_profiles_import_template.csv`
- `vocation_route_step_rules_import_template.csv`

De huidige Fighter OP Fast Act 1 / Trevo-route is alvast omgezet naar 20 objectives en 26 actions.

### Tools

Nieuwe npm scripts:

```powershell
npm.cmd run import:objectives
npm.cmd run export:objectives
npm.cmd run report:objectives
```

Tools:

- `tools/import_route_objectives.js`
- `tools/export_route_objectives_json.js`
- `tools/report_route_objective_coverage.js`

`export:objectives` schrijft naar:

- `database/exports/route_objectives.json`
- `app/public/data/route_objectives.json`

### Frontend

Nieuw geladen bestand:

- `/data/route_objectives.json`

Nieuwe UI:

- paneel **OP-route stap voor stap**;
- route-selector;
- voortgangsbalk;
- “Moet nu doen”-kaart;
- objective-lijst met status open / actief / klaar / skip;
- detailweergave met:
  - Moet nu doen;
  - Pak mee;
  - Quest;
  - Beloning;
  - Requirements;
  - Items database;
  - Keuzes / sidequests wel of niet.

Voortgang wordt lokaal opgeslagen in `localStorage` onder:

- `dd2_route_objective_progress_v1`

## Workflow voor Teun op de PC

Na het toepassen van deze patch:

```powershell
npm.cmd run import:objectives
npm.cmd run export:objectives
npm.cmd run report:objectives
cd app
npm.cmd run build
```

Daarna committen en pushen:

```powershell
git status
git add .
git commit -m "Sprint 4A route objective engine"
git push
```

GitHub Pages pakt daarna de nieuwe beta op volgens je bestaande Pages/Actions workflow.

## Volgende sprints

- Sprint 4B: Fighter OP Fast volledig verder vullen na Trevo/Vernworth.
- Sprint 4C: All Vocations Unlock Route.
- Sprint 4D: Battahl/midgame OP route.
- Sprint 4E: Endgame prep.
- Sprint 4F: Unmoored World.
- Sprint 4G: echte vocation-specific variants.
