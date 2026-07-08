# Sprint 4B — Fighter OP Fast volledige Act 1 route

## Doel

Sprint 4B vult de Sprint 4A route-objective engine met echte route-inhoud voor **Fighter OP Fast Act 1**.

Scope:

- Borderwatch → Melve → Vernworth
- Vernworth hub-regels
- Brant Act 1 mainline
- Vocation Frustration + Trevo Mine
- Monster Culling volledig
- Warrior + Sorcerer unlock
- Readvent of Calamity missable/vocation-window waarschuwing
- The Caged Magistrate + The Heel of History
- The Nameless Village + Thief maister-context
- The Stolen Throne
- An Unsettling Encounter
- Pre-Feast missable sweep
- Feast of Deception → Battahl-ready checkpoint

## Routekeuze

De route is bewust OP Fast, niet completionist. Sidequests krijgen daarom duidelijke labels:

- **wel doen**: vocation unlocks, missable/high-value quests, Brant progression, Trevo/Monster Culling synergy
- **pak mee**: Two-Hander, Grievous Horns, courtly attire, Ferrystone/Wakestone safety, Thief maister-scrolls als je toch in Nameless Village bent
- **skip voorlopig**: lage-beloning fetchquests, lange losse errands, collectibles die niet direct op de route liggen

## Aantal contentregels

- Route steps: 55
- Objectives: 55
- Objective actions: 100+
- Decisions: 14
- Vocation route rules: alle bestaande profielen krijgen Act 1 step-rules

## Importvolgorde

Gebruik na het uitpakken:

```powershell
npm.cmd run import:csv
npm.cmd run import:walkthrough
npm.cmd run import:points
npm.cmd run import:objectives
npm.cmd run export:json
npm.cmd run export:points
npm.cmd run export:objectives
npm.cmd run report:objectives
```

Daarna:

```powershell
cd app
npm.cmd run build
cd ..
git status
git add .
git commit -m "Sprint 4B complete Fighter OP Fast Act 1 route"
git push
```

## Belangrijk

De route gebruikt geschatte sublocatiepunten voor kasteelkamers, Nameless Village Depths en enkele Monster Culling-subgebieden. Die zijn bewust gemarkeerd als `estimated_high` of vergelijkbaar; later kunnen ze met de bestaande kaartkalibratie exact worden geprikt.
