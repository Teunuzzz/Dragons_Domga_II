# Sprint 3B - Fighter OP Fast Manual content patch

Deze patch vult de eerste echte datalaag voor de Fighter OP Fast Manual-route:

- Borderwatch -> Melve -> Vernworth -> Trevo Mine -> Vernworth
- Vocation Frustration route
- Two-Hander en Grievous Horns als kernitems
- Warrior/Sorcerer unlocks
- Trevo Mine optionele loot als lage-prioriteit data
- checklist-items, requirements, rewards, flags, quest stages/objectives, NPCs en source refs

Gebruik deze patch als eigen app-content. Bronnen worden alleen als referentie/cross-check opgeslagen; teksten zijn niet overgenomen uit gidsen.

## Installatie vanaf repo-root

```powershell
cd C:\Users\akker\Documents\GitHub\Dragons_Domga_II

Copy-Item "<PATCHMAP>\database\imports\templates\*.csv" ".\database\imports\templates\" -Force
Copy-Item "<PATCHMAP>\tools\cleanup_sprint3_placeholders.js" ".\tools\" -Force
Copy-Item "<PATCHMAP>\docs\sprint3b_fighter_op_fast_content.md" ".\docs\" -Force

npm.cmd run import:csv
node .\tools\import_walkthrough_csv_to_sqlite.js
node .\tools\cleanup_sprint3_placeholders.js
npm.cmd run export:json
node .\tools\export_walkthrough_json.js
Copy-Item .\database\exports\*.json .\app\public\data\ -Force

cd .\app
npm.cmd run build
```
