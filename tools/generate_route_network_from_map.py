from __future__ import annotations

import csv
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from skimage.graph import route_through_array
from skimage.morphology import remove_small_objects


ROOT_DIR = Path(__file__).resolve().parents[1]

MAP_PATH = ROOT_DIR / "app" / "public" / "maps" / "world-map.png"
LOCATIONS_CSV = ROOT_DIR / "database" / "imports" / "templates" / "locations_import_template.csv"
ROUTE_STEPS_CSV = ROOT_DIR / "database" / "imports" / "templates" / "op_route_steps_import_template.csv"

GENERATED_DIR = ROOT_DIR / "database" / "imports" / "generated"
DEBUG_DIR = ROOT_DIR / "app" / "public" / "debug"

NODES_OUT = GENERATED_DIR / "route_network_nodes_generated.csv"
EDGES_OUT = GENERATED_DIR / "route_network_edges_generated.csv"

PREVIEW_OUT = DEBUG_DIR / "corridor_auto_route_preview.png"
ROAD_SCORE_OUT = DEBUG_DIR / "corridor_road_score_preview.png"

ROUTE_KEY = "fighter_op_fast_manual"

# Dit moet gelijk zijn aan DD2_MAP_BOUNDS in app/src/App.tsx:
# const DD2_MAP_BOUNDS = [[0, 0], [2048, 1757]]
MAP_WORLD_WIDTH = 1757
MAP_WORLD_HEIGHT = 2048

# Lager = meer routepunten, route volgt bochten beter.
# Hoger = minder routepunten, grovere lijn.
SIMPLIFY_EPSILON = 6.0

# Start/eindpunt wordt naar dichtstbijzijnde waarschijnlijke wegpixel gesnapt.
SNAP_RADIUS = 90

# Standaard corridor rond segment.
DEFAULT_CORRIDOR_MARGIN = 340

# Kaart-rand uitsluiten bij wegdetectie.
# De rand is licht/beige en lijkt anders te veel op wegen.
BORDER_MARGIN = 135

# Segmenten die meer ruimte nodig hebben omdat de weg omrijdt.
SEGMENT_MARGIN_OVERRIDES = {
    ("borderwatch_outpost", "melve"): 260,
    ("melve", "vernworth"): 620,
    ("vernworth", "trevo_mine"): 380,
    ("trevo_mine", "vernworth"): 380,
}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def load_map() -> np.ndarray:
    if not MAP_PATH.exists():
        raise FileNotFoundError(f"Kaart niet gevonden: {MAP_PATH}")

    return np.array(Image.open(MAP_PATH).convert("RGB"))


def world_to_image_xy(
    world_x: int,
    world_y: int,
    image_width: int,
    image_height: int,
) -> tuple[int, int]:
    image_x = round((world_x / MAP_WORLD_WIDTH) * image_width)
    image_y = round(((MAP_WORLD_HEIGHT - world_y) / MAP_WORLD_HEIGHT) * image_height)

    return image_x, image_y


def image_to_world_xy(
    image_x: int,
    image_y: int,
    image_width: int,
    image_height: int,
) -> tuple[int, int]:
    world_x = round((image_x / image_width) * MAP_WORLD_WIDTH)
    world_y = round(MAP_WORLD_HEIGHT - ((image_y / image_height) * MAP_WORLD_HEIGHT))

    return world_x, world_y

def get_locations() -> dict[str, dict[str, object]]:
    rows = read_csv(LOCATIONS_CSV)
    locations: dict[str, dict[str, object]] = {}

    for row in rows:
        key = row["location_key"].strip()

        if not key:
            continue

        locations[key] = {
            "name": row.get("name") or key,
            "region_key": row.get("region_key") or "",
            "world_x": int(float(row["world_x"])),
            "world_y": int(float(row["world_y"])),
            "danger_level": int(float(row.get("danger_level") or 1)),
        }

    return locations


def get_route_location_sequence() -> list[str]:
    rows = read_csv(ROUTE_STEPS_CSV)

    usable_rows = []

    for row in rows:
        if row.get("route_key") != ROUTE_KEY:
            continue

        location_key = (row.get("location_key") or "").strip()

        if not location_key:
            continue

        usable_rows.append(row)

    usable_rows.sort(key=lambda r: int(float(r.get("step_order") or 999999)))

    sequence: list[str] = []

    for row in usable_rows:
        location_key = row["location_key"].strip()

        if not sequence or sequence[-1] != location_key:
            sequence.append(location_key)

    return sequence


def build_road_score(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """
    Maakt een weg-waarschijnlijkheidskaart.

    road_score:
      0.0 = onwaarschijnlijk weg
      1.0 = waarschijnlijk weg

    road_mask:
      bool-mask voor duidelijke wegpixels
    """
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)

    h = hsv[:, :, 0]
    s = hsv[:, :, 1]
    v = hsv[:, :, 2]
    l = lab[:, :, 0]
    a = lab[:, :, 1]
    b = lab[:, :, 2]

    blurred = cv2.GaussianBlur(gray, (3, 3), 0)

    # Top-hat benadrukt dunne lichte structuren zoals wegen.
    kernel_17 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))
    kernel_31 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31))

    top_hat_small = cv2.morphologyEx(blurred, cv2.MORPH_TOPHAT, kernel_17)
    top_hat_large = cv2.morphologyEx(blurred, cv2.MORPH_TOPHAT, kernel_31)

    top_hat = np.maximum(top_hat_small, top_hat_large)

    # Wegen zijn meestal licht, beige/wit en relatief laag verzadigd,
    # maar ze moeten ook een dunne lijnstructuur hebben.
    bright_line = (top_hat > 16) & (gray > 100) & (s < 135)

    pale_line = (top_hat > 24) & (gray > 150) & (s < 95) & (v > 135)

    beige_road = (
        (l > 125)
        & (a > 112)
        & (a < 152)
        & (b > 112)
        & (b < 178)
        & (s < 155)
    )

    road_mask = (bright_line & beige_road) | pale_line

    # Kaart-rand uitsluiten. Die is licht/beige en lijkt anders te veel op wegen.
    height, width = road_mask.shape

    road_mask[:BORDER_MARGIN, :] = False
    road_mask[-BORDER_MARGIN:, :] = False
    road_mask[:, :BORDER_MARGIN] = False
    road_mask[:, -BORDER_MARGIN:] = False

    # Grote compacte witte vlakken, wolken en stadsblokken beperken.
    road_mask = remove_small_objects(road_mask, min_size=45)

    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(
        road_mask.astype(np.uint8),
        connectivity=8,
    )

    cleaned = np.zeros_like(road_mask)

    for label in range(1, num_labels):
        area = stats[label, cv2.CC_STAT_AREA]
        width = stats[label, cv2.CC_STAT_WIDTH]
        height = stats[label, cv2.CC_STAT_HEIGHT]

        aspect = max(width, height) / max(1, min(width, height))
        fill_ratio = area / max(1, width * height)

        # Wegen zijn vaak lang/dun. Grote compacte blobs zijn verdacht.
        keep = area >= 45 and not (area > 2500 and fill_ratio > 0.18 and aspect < 4.5)

        if keep:
            cleaned[labels == label] = True

    road_mask = cleaned

    # Score op basis van road_mask + lokale helderheidslijn.
    top_hat_norm = np.clip(top_hat.astype(np.float32) / 45.0, 0.0, 1.0)
    brightness_norm = np.clip((gray.astype(np.float32) - 85.0) / 120.0, 0.0, 1.0)
    low_saturation_norm = 1.0 - np.clip(s.astype(np.float32) / 180.0, 0.0, 1.0)

    road_score = (
        0.55 * top_hat_norm
        + 0.25 * brightness_norm
        + 0.20 * low_saturation_norm
    )

    road_score[road_mask] = np.maximum(road_score[road_mask], 0.85)

    return road_score.astype(np.float32), road_mask


def build_base_cost(rgb: np.ndarray, road_score: np.ndarray, road_mask: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)

    s = hsv[:, :, 1]
    v = hsv[:, :, 2]

    inverse_road = (~road_mask).astype(np.uint8)
    distance_to_road = cv2.distanceTransform(inverse_road, cv2.DIST_L2, 5)

    # Basis: ver van wegen wordt snel duur.
    cost = 1.0 + np.minimum(distance_to_road, 120) ** 1.75

    # Duidelijke wegpixels zijn zeer goedkoop.
    cost[road_mask] = 1.0

    # Net naast wegen mag nog, zodat kleine gaten in de detectie overbrugbaar zijn.
    near_road = distance_to_road <= 8
    cost[near_road] = np.minimum(cost[near_road], 4.0)

    # Verder van wegen: sterk afstraffen.
    cost[distance_to_road > 18] += 250
    cost[distance_to_road > 45] += 1000
    cost[distance_to_road > 80] += 2500

    # Water/zee extra duur maken.
    blueish_water = (gray < 115) & (s > 20) & (v < 150)
    dark_water = (gray < 90) & (v < 120)
    water_like = blueish_water | dark_water

    cost[water_like] += 1800

    return cost.astype(np.float32)

def segment_margin(from_key: str, to_key: str) -> int:
    direct = SEGMENT_MARGIN_OVERRIDES.get((from_key, to_key))

    if direct is not None:
        return direct

    reverse = SEGMENT_MARGIN_OVERRIDES.get((to_key, from_key))

    if reverse is not None:
        return reverse

    return DEFAULT_CORRIDOR_MARGIN


def make_bbox(
    start_xy: tuple[int, int],
    end_xy: tuple[int, int],
    margin: int,
    width: int,
    height: int,
) -> tuple[int, int, int, int]:
    min_x = max(0, min(start_xy[0], end_xy[0]) - margin)
    max_x = min(width - 1, max(start_xy[0], end_xy[0]) + margin)
    min_y = max(0, min(start_xy[1], end_xy[1]) - margin)
    max_y = min(height - 1, max(start_xy[1], end_xy[1]) + margin)

    return min_x, min_y, max_x, max_y


def snap_to_road(
    xy: tuple[int, int],
    road_mask: np.ndarray,
    base_cost: np.ndarray,
    bbox: tuple[int, int, int, int],
    radius: int = SNAP_RADIUS,
) -> tuple[int, int]:
    x, y = xy
    min_x, min_y, max_x, max_y = bbox

    search_min_x = max(min_x, x - radius)
    search_max_x = min(max_x, x + radius)
    search_min_y = max(min_y, y - radius)
    search_max_y = min(max_y, y + radius)

    if search_min_x >= search_max_x or search_min_y >= search_max_y:
        return xy

    crop_mask = road_mask[search_min_y : search_max_y + 1, search_min_x : search_max_x + 1]

    road_pixels = np.argwhere(crop_mask)

    if len(road_pixels) == 0:
        return xy

    best_xy = xy
    best_score = float("inf")

    for local_y, local_x in road_pixels:
        candidate_x = search_min_x + int(local_x)
        candidate_y = search_min_y + int(local_y)

        distance = math.hypot(candidate_x - x, candidate_y - y)
        score = distance * 1.8 + float(base_cost[candidate_y, candidate_x])

        if score < best_score:
            best_score = score
            best_xy = (candidate_x, candidate_y)

    return best_xy


def simplify_path(path_yx: list[tuple[int, int]]) -> list[tuple[int, int]]:
    if len(path_yx) <= 2:
        return path_yx

    points_xy = np.array([[x, y] for y, x in path_yx], dtype=np.float32)
    contour = points_xy.reshape((-1, 1, 2))

    simplified = cv2.approxPolyDP(contour, SIMPLIFY_EPSILON, False)
    simplified_xy = simplified.reshape((-1, 2))

    result = [(int(round(y)), int(round(x))) for x, y in simplified_xy]

    if result[0] != path_yx[0]:
        result.insert(0, path_yx[0])

    if result[-1] != path_yx[-1]:
        result.append(path_yx[-1])

    return result


def find_path_for_segment(
    base_cost: np.ndarray,
    road_mask: np.ndarray,
    start_xy: tuple[int, int],
    end_xy: tuple[int, int],
    margin: int,
) -> list[tuple[int, int]]:
    height, width = base_cost.shape

    bbox = make_bbox(start_xy, end_xy, margin, width, height)

    snapped_start = snap_to_road(start_xy, road_mask, base_cost, bbox)
    snapped_end = snap_to_road(end_xy, road_mask, base_cost, bbox)

    min_x, min_y, max_x, max_y = bbox

    crop_cost = base_cost[min_y : max_y + 1, min_x : max_x + 1].copy()

    # Start/eind altijd toegestaan.
    start_local = (snapped_start[1] - min_y, snapped_start[0] - min_x)
    end_local = (snapped_end[1] - min_y, snapped_end[0] - min_x)

    crop_cost[start_local] = 1.0
    crop_cost[end_local] = 1.0

    path_local, _ = route_through_array(
        crop_cost,
        start_local,
        end_local,
        fully_connected=True,
        geometric=True,
    )

    path_yx = [
        (int(local_y) + min_y, int(local_x) + min_x)
        for local_y, local_x in path_local
    ]

    simplified = simplify_path(path_yx)

    # Locatiepunt zelf toevoegen aan begin/eind, zodat markers logisch aansluiten.
    start_yx = (start_xy[1], start_xy[0])
    end_yx = (end_xy[1], end_xy[0])

    if simplified[0] != start_yx:
        simplified.insert(0, start_yx)

    if simplified[-1] != end_yx:
        simplified.append(end_yx)

    return simplified


def segment_key(from_key: str, to_key: str) -> str:
    return f"{from_key}_to_{to_key}".replace("_outpost", "")


def generate_network(
    locations: dict[str, dict[str, object]],
    sequence: list[str],
    base_cost: np.ndarray,
    road_mask: np.ndarray,
) -> tuple[list[dict[str, object]], list[dict[str, object]], list[list[tuple[int, int]]]]:
    node_rows: list[dict[str, object]] = []
    edge_rows: list[dict[str, object]] = []
    preview_paths: list[list[tuple[int, int]]] = []

    added_nodes: set[str] = set()
    added_edges: set[str] = set()
    handled_segments: set[tuple[str, str]] = set()

    image_height, image_width = base_cost.shape

    def add_location_node(location_key: str) -> None:
        if location_key in added_nodes:
            return

        loc = locations[location_key]

        node_rows.append({
            "node_key": location_key,
            "name": loc["name"],
            "region_key": loc["region_key"],
            "world_x": loc["world_x"],
            "world_y": loc["world_y"],
            "node_type": "location",
            "danger_level": loc["danger_level"],
            "notes": f"Gekoppeld aan location {location_key}.",
            "source_key": "auto_road_extraction",
        })

        added_nodes.add(location_key)

    def add_waypoint_node(node_key: str, world_x: int, world_y: int) -> None:
        if node_key in added_nodes:
            return

        node_rows.append({
            "node_key": node_key,
            "name": node_key.replace("_", " ").title(),
            "region_key": "vermund",
            "world_x": world_x,
            "world_y": world_y,
            "node_type": "waypoint",
            "danger_level": 1,
            "notes": "Automatisch gegenereerd uit corridor-based kaartwegdetectie.",
            "source_key": "auto_road_extraction",
        })

        added_nodes.add(node_key)

    def add_edge(from_node_key: str, to_node_key: str, order: int) -> None:
        edge_key = f"auto_{order:04d}_{from_node_key}_to_{to_node_key}"

        if edge_key in added_edges:
            return

        edge_rows.append({
            "edge_key": edge_key,
            "from_node_key": from_node_key,
            "to_node_key": to_node_key,
            "distance_score": 1,
            "danger_level": 1,
            "road_type": "auto_road",
            "bidirectional": 1,
            "requires_flag": "",
            "notes": "Automatisch gegenereerde corridor route-edge.",
            "source_key": "auto_road_extraction",
        })

        added_edges.add(edge_key)

    for location_key in sequence:
        add_location_node(location_key)

    edge_counter = 1

    for index in range(len(sequence) - 1):
        from_key = sequence[index]
        to_key = sequence[index + 1]

        if from_key == to_key:
            continue

        normalized_segment = tuple(sorted((from_key, to_key)))

        if normalized_segment in handled_segments:
            continue

        handled_segments.add(normalized_segment)

        from_loc = locations[from_key]
        to_loc = locations[to_key]

        start_xy = world_to_image_xy(
            int(from_loc["world_x"]),
            int(from_loc["world_y"]),
            image_width,
            image_height,
        )

        end_xy = world_to_image_xy(
            int(to_loc["world_x"]),
            int(to_loc["world_y"]),
            image_width,
            image_height,
        )

        margin = segment_margin(from_key, to_key)

        print(f"Pad zoeken: {from_key} → {to_key} met corridor margin {margin}")

        path_yx = find_path_for_segment(
            base_cost=base_cost,
            road_mask=road_mask,
            start_xy=start_xy,
            end_xy=end_xy,
            margin=margin,
        )

        preview_paths.append(path_yx)

        segment_base = segment_key(from_key, to_key)
        node_sequence: list[str] = [from_key]

        inner_points = path_yx[1:-1]

        for point_index, (image_y, image_x) in enumerate(inner_points, start=1):
            node_key = f"auto_{segment_base}_{point_index:03d}"

            world_x, world_y = image_to_world_xy(image_x, image_y, image_width, image_height)

            add_waypoint_node(node_key, world_x, world_y)
            node_sequence.append(node_key)

        node_sequence.append(to_key)

        for node_index in range(len(node_sequence) - 1):
            add_edge(node_sequence[node_index], node_sequence[node_index + 1], edge_counter)
            edge_counter += 1

    return node_rows, edge_rows, preview_paths


def save_debug_previews(
    rgb: np.ndarray,
    road_score: np.ndarray,
    road_mask: np.ndarray,
    paths: list[list[tuple[int, int]]],
) -> None:
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)

    score_u8 = np.clip(road_score * 255, 0, 255).astype(np.uint8)
    Image.fromarray(score_u8).save(ROAD_SCORE_OUT)

    overlay = rgb.copy()

    # Wegmasker subtiel groen.
    overlay[road_mask] = (
        0.78 * overlay[road_mask] + 0.22 * np.array([0, 255, 80])
    ).astype(np.uint8)

    # Automatische routes geel.
    colors = [
        (255, 218, 45),
        (255, 170, 40),
        (80, 210, 255),
        (255, 120, 240),
    ]

    for index, path in enumerate(paths):
        points_xy = np.array([[x, y] for y, x in path], dtype=np.int32)

        if len(points_xy) >= 2:
            cv2.polylines(
                overlay,
                [points_xy],
                isClosed=False,
                color=colors[index % len(colors)],
                thickness=5,
                lineType=cv2.LINE_AA,
            )

    Image.fromarray(overlay).save(PREVIEW_OUT)


def main() -> None:
    print("Corridor-based route-network generatie gestart...")

    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)

    rgb = load_map()
    road_score, road_mask = build_road_score(rgb)
    base_cost = build_base_cost(rgb, road_score, road_mask)

    locations = get_locations()
    sequence = get_route_location_sequence()

    print("")
    print("Route location sequence:")
    print(" → ".join(sequence))
    print("")

    image_height, image_width = rgb.shape[:2]

    print("Gebruikte locatiecoördinaten:")
    for location_key in sequence:
        loc = locations.get(location_key)

        if not loc:
            print(f"- {location_key}: NIET GEVONDEN")
            continue

        world_x = int(loc["world_x"])
        world_y = int(loc["world_y"])
        image_x, image_y = world_to_image_xy(
            world_x,
            world_y,
            image_width,
            image_height,
        )

        print(
            f"- {location_key}: "
            f"world_x={world_x}, world_y={world_y} "
            f"→ image_x={image_x}, image_y={image_y}"
        )

    print("")

    missing = [key for key in sequence if key not in locations]

    if missing:
        raise ValueError(f"Locaties ontbreken in locations_import_template.csv: {missing}")

    nodes, edges, preview_paths = generate_network(
        locations=locations,
        sequence=sequence,
        base_cost=base_cost,
        road_mask=road_mask,
    )

    write_csv(
        NODES_OUT,
        [
            "node_key",
            "name",
            "region_key",
            "world_x",
            "world_y",
            "node_type",
            "danger_level",
            "notes",
            "source_key",
        ],
        nodes,
    )

    write_csv(
        EDGES_OUT,
        [
            "edge_key",
            "from_node_key",
            "to_node_key",
            "distance_score",
            "danger_level",
            "road_type",
            "bidirectional",
            "requires_flag",
            "notes",
            "source_key",
        ],
        edges,
    )

    save_debug_previews(
        rgb=rgb,
        road_score=road_score,
        road_mask=road_mask,
        paths=preview_paths,
    )

    print("")
    print(f"Nodes geschreven: {NODES_OUT}")
    print(f"Edges geschreven: {EDGES_OUT}")
    print(f"Preview geschreven: {PREVIEW_OUT}")
    print(f"Road score geschreven: {ROAD_SCORE_OUT}")
    print("")
    print("Open:")
    print("http://localhost:5173/debug/corridor_auto_route_preview.png")
    print("http://localhost:5173/debug/corridor_road_score_preview.png")
    print("")
    print("Corridor-based route-network generatie klaar.")


if __name__ == "__main__":
    main()