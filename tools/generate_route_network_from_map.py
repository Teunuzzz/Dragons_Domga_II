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
PREVIEW_OUT = DEBUG_DIR / "auto_route_preview.png"
ROAD_MASK_OUT = DEBUG_DIR / "auto_route_road_mask.png"

# Hoe grover/harder de route wordt vereenvoudigd.
# Lager = meer punten, volgt weg beter.
# Hoger = minder punten, kortere CSV.
SIMPLIFY_EPSILON = 7.0

# Rand uitsluiten, want de kaart-rand veroorzaakt veel fout-herkenning.
BORDER_MARGIN = 85


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


def get_locations() -> dict[str, dict[str, object]]:
    rows = read_csv(LOCATIONS_CSV)
    locations: dict[str, dict[str, object]] = {}

    for row in rows:
        key = row["location_key"]
        locations[key] = {
            "name": row.get("name") or key,
            "region_key": row.get("region_key") or "",
            "world_x": int(float(row["world_x"])),
            "world_y": int(float(row["world_y"])),
            "danger_level": 1,
        }

    return locations


def get_route_location_sequence() -> list[str]:
    rows = read_csv(ROUTE_STEPS_CSV)

    usable_rows = []
    for row in rows:
        if row.get("route_key") != "fighter_op_fast_manual":
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


def build_road_mask(rgb: np.ndarray) -> np.ndarray:
    """
    Striktere detectie dan de eerste preview.

    We zoeken vooral naar dunne, lichte lijnen met lokale helderheids-contrast.
    Dit voorkomt dat de hele kaart-rand als weg wordt gebruikt.
    """
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)

    s = hsv[:, :, 1]
    v = hsv[:, :, 2]

    blurred = cv2.GaussianBlur(gray, (3, 3), 0)

    # White top-hat haalt lichte dunne structuren op, zoals wegen.
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (23, 23))
    top_hat = cv2.morphologyEx(blurred, cv2.MORPH_TOPHAT, kernel)

    road_like = (
        ((top_hat > 12) & (gray > 95) & (s < 150))
        | ((gray > 168) & (s < 85) & (v > 150))
    )

    h, w = road_like.shape

    # Rand uitsluiten.
    road_like[:BORDER_MARGIN, :] = False
    road_like[-BORDER_MARGIN:, :] = False
    road_like[:, :BORDER_MARGIN] = False
    road_like[:, -BORDER_MARGIN:] = False

    mask_u8 = road_like.astype(np.uint8) * 255

    # Kleine ruis weg, kleine gaten dicht.
    open_kernel = np.ones((2, 2), np.uint8)
    close_kernel = np.ones((3, 3), np.uint8)

    mask_u8 = cv2.morphologyEx(mask_u8, cv2.MORPH_OPEN, open_kernel, iterations=1)
    mask_u8 = cv2.morphologyEx(mask_u8, cv2.MORPH_CLOSE, close_kernel, iterations=1)

    mask_bool = mask_u8 > 0
    mask_bool = remove_small_objects(mask_bool, min_size=70)

    # Grote witte blobs zoals wolken/stadsblokken onderdrukken.
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(
        mask_bool.astype(np.uint8),
        connectivity=8,
    )

    cleaned = np.zeros_like(mask_bool)

    for label in range(1, num_labels):
        area = stats[label, cv2.CC_STAT_AREA]
        width = stats[label, cv2.CC_STAT_WIDTH]
        height = stats[label, cv2.CC_STAT_HEIGHT]

        # Wegen zijn lang/dun. Grote compacte blobs zijn meestal geen weg.
        aspect = max(width, height) / max(1, min(width, height))
        fill_ratio = area / max(1, width * height)

        keep = (
            area >= 70
            and not (area > 3500 and fill_ratio > 0.20 and aspect < 5)
        )

        if keep:
            cleaned[labels == label] = True

    return cleaned


def build_cost_array(road_mask: np.ndarray) -> np.ndarray:
    """
    Dijkstra/A* krijgt een cost-array:
    - op wegen: goedkoop
    - vlak naast wegen: redelijk
    - ver van wegen: duur

    Daardoor kan het pad kleine gaten overbruggen, maar blijft het
    bij voorkeur over herkende wegen lopen.
    """
    inverse = (~road_mask).astype(np.uint8)
    distance_to_road = cv2.distanceTransform(inverse, cv2.DIST_L2, 5)

    cost = 1.0 + np.minimum(distance_to_road, 80) ** 1.45
    cost[road_mask] = 1.0

    # Rand extreem duur maken.
    cost[:BORDER_MARGIN, :] = 9999
    cost[-BORDER_MARGIN:, :] = 9999
    cost[:, :BORDER_MARGIN] = 9999
    cost[:, -BORDER_MARGIN:] = 9999

    return cost.astype(np.float32)


def simplify_path(path_yx: list[tuple[int, int]]) -> list[tuple[int, int]]:
    if len(path_yx) <= 2:
        return path_yx

    points_xy = np.array([[x, y] for y, x in path_yx], dtype=np.float32)
    contour = points_xy.reshape((-1, 1, 2))

    simplified = cv2.approxPolyDP(contour, SIMPLIFY_EPSILON, False)
    simplified_xy = simplified.reshape((-1, 2))

    result = [(int(round(y)), int(round(x))) for x, y in simplified_xy]

    # Zeker weten dat begin/einde blijven bestaan.
    if result[0] != path_yx[0]:
        result.insert(0, path_yx[0])

    if result[-1] != path_yx[-1]:
        result.append(path_yx[-1])

    return result


def find_path_between(cost: np.ndarray, start_xy: tuple[int, int], end_xy: tuple[int, int]) -> list[tuple[int, int]]:
    start_yx = (start_xy[1], start_xy[0])
    end_yx = (end_xy[1], end_xy[0])

    path, _ = route_through_array(
        cost,
        start_yx,
        end_yx,
        fully_connected=True,
        geometric=True,
    )

    path_yx = [(int(y), int(x)) for y, x in path]
    return simplify_path(path_yx)


def segment_key(a: str, b: str) -> str:
    return f"{a}_to_{b}".replace("_outpost", "")


def generate_network(
    locations: dict[str, dict[str, object]],
    sequence: list[str],
    cost: np.ndarray,
) -> tuple[list[dict[str, object]], list[dict[str, object]], list[list[tuple[int, int]]]]:
    node_rows: list[dict[str, object]] = []
    edge_rows: list[dict[str, object]] = []
    preview_paths: list[list[tuple[int, int]]] = []

    added_nodes: set[str] = set()
    added_edges: set[str] = set()
    handled_segments: set[tuple[str, str]] = set()

    image_height = cost.shape[0]

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

    def add_waypoint_node(node_key: str, x: int, y: int) -> None:
        if node_key in added_nodes:
            return

        node_rows.append({
            "node_key": node_key,
            "name": node_key.replace("_", " ").title(),
            "region_key": "vermund",
            "world_x": x,
            "world_y": y,
            "node_type": "waypoint",
            "danger_level": 1,
            "notes": "Automatisch gegenereerd uit kaartwegdetectie.",
            "source_key": "auto_road_extraction",
        })

        added_nodes.add(node_key)

    def add_edge(from_key: str, to_key: str, order: int) -> None:
        edge_key = f"auto_{order:04d}_{from_key}_to_{to_key}"

        if edge_key in added_edges:
            return

        edge_rows.append({
            "edge_key": edge_key,
            "from_node_key": from_key,
            "to_node_key": to_key,
            "distance_score": 1,
            "danger_level": 1,
            "road_type": "auto_road",
            "bidirectional": 1,
            "requires_flag": "",
            "notes": "Automatisch gegenereerde route-edge.",
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

        # React/Leaflet gebruikt world_y vanaf onder.
        # OpenCV/Python gebruikt image_y vanaf boven.
        # Daarom moeten we Y spiegelen voor pathfinding.
        start_xy = (
            int(from_loc["world_x"]),
            image_height - int(from_loc["world_y"]),
        )

        end_xy = (
            int(to_loc["world_x"]),
            image_height - int(to_loc["world_y"]),
        )

        print(f"Pad zoeken: {from_key} → {to_key}")

        path_yx = find_path_between(cost, start_xy, end_xy)
        preview_paths.append(path_yx)

        segment_base = segment_key(from_key, to_key)

        node_sequence: list[str] = [from_key]

        # Eerste en laatste punt zijn locaties; tussenpunten worden waypoints.
        inner_points = path_yx[1:-1]

        for point_index, (image_y, x) in enumerate(inner_points, start=1):
            node_key = f"auto_{segment_base}_{point_index:03d}"

            # Terug van image_y naar world_y voor React/Leaflet.
            world_y = image_height - image_y

            add_waypoint_node(node_key, x, world_y)
            node_sequence.append(node_key)

        node_sequence.append(to_key)

        for node_index in range(len(node_sequence) - 1):
            add_edge(node_sequence[node_index], node_sequence[node_index + 1], edge_counter)
            edge_counter += 1

    return node_rows, edge_rows, preview_paths

def save_preview(rgb: np.ndarray, road_mask: np.ndarray, paths: list[list[tuple[int, int]]]) -> None:
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)

    Image.fromarray((road_mask.astype(np.uint8) * 255)).save(ROAD_MASK_OUT)

    overlay = rgb.copy()

    # Wegmasker subtiel groen.
    overlay[road_mask] = (
        0.75 * overlay[road_mask] + 0.25 * np.array([0, 255, 80])
    ).astype(np.uint8)

    # Automatische route duidelijk geel.
    for path in paths:
        points_xy = np.array([[x, y] for y, x in path], dtype=np.int32)
        if len(points_xy) >= 2:
            cv2.polylines(
                overlay,
                [points_xy],
                isClosed=False,
                color=(255, 210, 40),
                thickness=5,
                lineType=cv2.LINE_AA,
            )

    Image.fromarray(overlay).save(PREVIEW_OUT)


def main() -> None:
    print("Automatische route-network generatie gestart...")

    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)

    rgb = load_map()
    road_mask = build_road_mask(rgb)
    cost = build_cost_array(road_mask)

    locations = get_locations()
    sequence = get_route_location_sequence()

    print("Route location sequence:")
    print(" → ".join(sequence))

    missing = [key for key in sequence if key not in locations]
    if missing:
        raise ValueError(f"Locaties ontbreken in locations_import_template.csv: {missing}")

    nodes, edges, preview_paths = generate_network(locations, sequence, cost)

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

    save_preview(rgb, road_mask, preview_paths)

    print("")
    print(f"Nodes geschreven: {NODES_OUT}")
    print(f"Edges geschreven: {EDGES_OUT}")
    print(f"Preview geschreven: {PREVIEW_OUT}")
    print(f"Road mask geschreven: {ROAD_MASK_OUT}")
    print("")
    print("Open:")
    print("http://localhost:5173/debug/auto_route_preview.png")
    print("")
    print("Automatische route-network generatie klaar.")


if __name__ == "__main__":
    main()