# Sprint 3C - Frontend route-step details

Deze patch vervangt `app/src/App.tsx` en `app/src/App.css`.

Doel:
- extra JSON-bestanden laden naast locations/op_routes/route_network;
- data-overzicht tonen met aantallen voor items, quests, NPCs, vendors en vocations;
- een detailpaneel tonen voor de actieve route-stap;
- gekoppelde checklist-, requirement-, reward-, item-, quest-, NPC- en vocation-records tonen wanneer ze via step_key/step_slug te vinden zijn;
- een eenvoudige databrowser tonen zodat gecontroleerd kan worden dat items en quests echt geladen zijn.

Na kopiëren:

```powershell
cd C:\Users\akker\Documents\GitHub\Dragons_Domga_II\app
npm.cmd run build
npm.cmd run dev
```
