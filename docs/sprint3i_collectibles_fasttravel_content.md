# Sprint 3I — Golden Trove Beetles, Portcrystals and Newt Liqueur

Adds the first real content expansion for the three previously unlinked items:

- Golden Trove Beetle
- Portcrystal
- Newt Liqueur

## Scope

This sprint adds route-friendly starter locations and acquisition links rather than a copied full commercial marker database. Golden Trove Beetle points are intentionally marked as estimated and should be corrected with the Sprint 3G calibration flow before being treated as exact collectible markers.

## Added content

### Golden Trove Beetles

Adds eight estimated, route-friendly collectible nodes around early Vermund and Battahl route segments. Each is connected through both `location_items_import_template.csv` and `item_sources_import_template.csv`.

### Portcrystals

Adds Portcrystal acquisition routes for:

- Forested Griffin's Nest pickup
- A Trial of Archery quest reward
- Feast of Deception quest reward
- Dragonforged WLC purchase
- Sphinx riddle route as high-spoiler cross-check

### Newt Liqueur

Adds Newt Liqueur acquisition routes for:

- Higg's Tavern Stand secret shop
- Earland in East Bakbattahl
- Forbidden Magick Research Lab pickup
- Windwalker's Home pickup
- crafting from Fruit Wine + Saurian Tail

Also adds support items/vendors/locations for Beastren Mask and Wyrmslife Crystal context.

## Important data-quality notes

- Golden Trove Beetle exact markers need in-game calibration.
- `item_sources` import is now cleared before import because the SQLite unique constraint contains nullable FK columns; without clearing, repeated imports can duplicate source rows when nullable columns are present.
- Database/exports JSON should remain generated/local; commit `app/public/data/*.json` for GitHub Pages.
