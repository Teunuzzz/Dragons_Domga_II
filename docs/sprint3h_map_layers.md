# Sprint 3H — Map layers, marker filters and rich popups

Sprint 3H makes the current map usable as a growing companion map instead of a single marker layer.

## Added

- A new **Kaartlagen** panel in the sidebar.
- Layer toggles for:
  - Route
  - Locaties
  - Items
  - Quests
  - NPCs
  - Vendors
  - Vocations
  - Kalibratie
- A `solo` action per layer to temporarily show only one layer.
- Separate map markers for items, quests, NPCs, vendors and vocations.
- Slight marker offsets when multiple entities share the same location.
- Rich location popups that show linked:
  - route steps
  - items
  - quests
  - NPCs
  - vendors
  - vocations
- Entity popups with layer badge, title, linked location and coordinates.
- Calibration correction markers are now a separate toggleable layer.

## Important behavior

- Location markers are still shown while calibration mode is active, even when the Location layer is disabled. This prevents the user from hiding markers that are needed for dragging/correction.
- Entity markers are generated from the existing JSON exports. No new SQLite schema is required.
- The route polyline remains based on route_network and can be hidden through the Route layer toggle.

## Files changed

- `app/src/App.tsx`
- `app/src/App.css`

## Test command

```powershell
cd C:\Users\akker\Documents\GitHub\Dragons_Domga_II\app
npm.cmd run build
npm.cmd run dev
```

## Next sprint idea

Sprint 3I can focus on the content layer that still needs multi-source/multi-location handling:

- Golden Trove Beetles
- Portcrystals
- Newt Liqueur
- collectible routes
- route filtering by objective: OP-fast, safe, completionist
