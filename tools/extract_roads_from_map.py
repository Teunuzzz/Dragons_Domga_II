from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from skimage.morphology import skeletonize, remove_small_objects


ROOT_DIR = Path(__file__).resolve().parents[1]

MAP_PATH = ROOT_DIR / "app" / "public" / "maps" / "world-map.png"
DEBUG_DIR = ROOT_DIR / "app" / "public" / "debug"

ROAD_MASK_PATH = DEBUG_DIR / "road_mask_preview.png"
ROAD_SKELETON_PATH = DEBUG_DIR / "road_skeleton_preview.png"
ROAD_OVERLAY_PATH = DEBUG_DIR / "road_overlay_preview.png"


def ensure_dirs() -> None:
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)


def load_image() -> np.ndarray:
    if not MAP_PATH.exists():
        raise FileNotFoundError(f"Kaart niet gevonden: {MAP_PATH}")

    image = Image.open(MAP_PATH).convert("RGB")
    return np.array(image)


def build_road_mask(rgb: np.ndarray) -> np.ndarray:
    """
    Eerste automatische wegdetectie.

    De wegen op de DD2-kaart zijn meestal:
    - relatief licht
    - laag tot middelmatig verzadigd
    - beige/witachtig
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

    # Basis: lichte lijnen met beperkte verzadiging.
    light_low_saturation = (v > 130) & (s < 95)

    # Beige/witte kaartwegen.
    beige_white = (l > 135) & (a > 112) & (a < 150) & (b > 115) & (b < 170)

    # Extra vangnet voor dunne witte wegen.
    bright_gray = gray > 155

    mask = (light_low_saturation & beige_white) | (bright_gray & (s < 110))

    # Kaart-rand minder hard meenemen.
    height, width = mask.shape
    border = 18
    mask[:border, :] = False
    mask[-border:, :] = False
    mask[:, :border] = False
    mask[:, -border:] = False

    mask_u8 = (mask.astype(np.uint8)) * 255

    # Ruis verminderen en wegen iets verbinden.
    kernel_small = np.ones((2, 2), np.uint8)
    kernel_medium = np.ones((3, 3), np.uint8)

    mask_u8 = cv2.morphologyEx(mask_u8, cv2.MORPH_OPEN, kernel_small, iterations=1)
    mask_u8 = cv2.morphologyEx(mask_u8, cv2.MORPH_CLOSE, kernel_medium, iterations=1)

    mask_bool = mask_u8 > 0

    # Kleine vlekjes verwijderen.
    mask_bool = remove_small_objects(mask_bool, min_size=40)

    return mask_bool


def build_skeleton(mask_bool: np.ndarray) -> np.ndarray:
    skeleton_bool = skeletonize(mask_bool)
    return skeleton_bool


def save_debug_images(rgb: np.ndarray, mask_bool: np.ndarray, skeleton_bool: np.ndarray) -> None:
    mask_u8 = (mask_bool.astype(np.uint8)) * 255
    skeleton_u8 = (skeleton_bool.astype(np.uint8)) * 255

    Image.fromarray(mask_u8).save(ROAD_MASK_PATH)
    Image.fromarray(skeleton_u8).save(ROAD_SKELETON_PATH)

    overlay = rgb.copy()

    # Herkende wegpixels rood.
    overlay[mask_bool] = (
        0.65 * overlay[mask_bool] + 0.35 * np.array([255, 0, 0])
    ).astype(np.uint8)

    # Skeletonpixels felgroen.
    overlay[skeleton_bool] = np.array([0, 255, 80], dtype=np.uint8)

    Image.fromarray(overlay).save(ROAD_OVERLAY_PATH)


def main() -> None:
    print("Road extraction gestart...")
    print(f"Kaart: {MAP_PATH}")

    ensure_dirs()

    rgb = load_image()
    mask_bool = build_road_mask(rgb)
    skeleton_bool = build_skeleton(mask_bool)

    save_debug_images(rgb, mask_bool, skeleton_bool)

    print("")
    print("Debug-bestanden geschreven:")
    print(f"- {ROAD_MASK_PATH}")
    print(f"- {ROAD_SKELETON_PATH}")
    print(f"- {ROAD_OVERLAY_PATH}")
    print("")
    print("Open daarna in de browser:")
    print("http://localhost:5173/debug/road_overlay_preview.png")
    print("http://localhost:5173/debug/road_mask_preview.png")
    print("http://localhost:5173/debug/road_skeleton_preview.png")
    print("")
    print("Road extraction klaar.")


if __name__ == "__main__":
    main()