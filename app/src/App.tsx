import { useEffect, useMemo, useState } from "react";
import {
  ImageOverlay,
  MapContainer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L, { CRS } from "leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import "./App.css";

const APP_BASE_URL = import.meta.env.BASE_URL || "/";

function assetUrl(path: string) {
  const base = APP_BASE_URL.endsWith("/") ? APP_BASE_URL : `${APP_BASE_URL}/`;
  return `${base}${path.replace(/^\/+/, "")}`;
}

const dd2LocationIcon = L.divIcon({
  className: "dd2-location-marker",
  html: "",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

const dd2ActiveLocationIcon = L.divIcon({
  className: "dd2-location-marker dd2-location-marker-active",
  html: "",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -14],
});

const DD2_MAP_IMAGE_URL = assetUrl("maps/world-map.png");
const DD2_MAP_BOUNDS: [[number, number], [number, number]] = [
  [0, 0],
  [2048, 1757],
];

type JsonRecord = Record<string, unknown>;

type Location = {
  id?: number | string;
  slug?: string;
  location_slug?: string;
  location_key?: string;
  name?: string;
  region?: string;
  world_x?: number | string | null;
  world_y?: number | string | null;
  description?: string | null;
  short_description?: string | null;
  notes?: string | null;
};

type RouteStep = {
  id?: number | string;
  slug?: string;
  step_slug?: string;
  step_key?: string;
  title?: string;
  name?: string;
  description?: string | null;
  step_order?: number | string;
  order?: number | string;
  sort_order?: number | string;
  location_key?: string | null;
  location_slug?: string | null;
  map_anchor_key?: string | null;
  map_anchor_slug?: string | null;
  anchor_slug?: string | null;
  world_x?: number | string | null;
  world_y?: number | string | null;
};

type OpRoute = {
  id?: number | string;
  slug?: string;
  route_slug?: string;
  route_key?: string;
  title?: string;
  name?: string;
  profile_slug?: string;
  profile?: string;
  vocation?: string | null;
  steps?: RouteStep[];
};

type RouteNetworkNode = {
  node_id?: number | string;
  node_key: string;
  name?: string;
  region_key?: string | null;
  world_x?: number | string | null;
  world_y?: number | string | null;
  node_type?: string;
  danger_level?: number | string;
};

type RouteNetworkEdge = {
  edge_id?: number | string;
  edge_key?: string;
  from_node_key: string;
  to_node_key: string;
  distance_score?: number | string;
  danger_level?: number | string;
  road_type?: string;
  bidirectional?: number | string | boolean;
};

type RouteNetwork = {
  nodes: RouteNetworkNode[];
  edges: RouteNetworkEdge[];
};

type EntityMapPoint = {
  point_id?: number | string;
  point_key?: string;
  entity_type?: string;
  entity_key?: string;
  route_key?: string | null;
  step_key?: string | null;
  location_key?: string | null;
  location_name?: string | null;
  name?: string;
  world_x?: number | string | null;
  world_y?: number | string | null;
  relation_type?: string | null;
  accuracy_level?: string | null;
  accuracy_score?: number | string | null;
  route_priority?: number | string | null;
  is_primary?: number | string | boolean | null;
  is_verified?: number | string | boolean | null;
  spoiler_level?: number | string | null;
  notes?: string | null;
  source_key?: string | null;
};

type ContentData = {
  items: JsonRecord[];
  quests: JsonRecord[];
  locationItems: JsonRecord[];
  walkthroughsRaw: unknown;
  walkthroughRecords: JsonRecord[];
  itemDetails: JsonRecord[];
  questDetails: JsonRecord[];
  npcs: JsonRecord[];
  vendors: JsonRecord[];
  vocations: JsonRecord[];
  gameFlags: JsonRecord[];
  entityMapPoints: EntityMapPoint[];
};

type BrowserTab =
  "locations" | "items" | "quests" | "npcs" | "vendors" | "vocations" | "exact_points";

type MapLayerKey =
  | "route"
  | "locations"
  | "items"
  | "quests"
  | "npcs"
  | "vendors"
  | "vocations"
  | "exact_points"
  | "calibration";

type EntityLayerKey = "items" | "quests" | "npcs" | "vendors" | "vocations";

type EntityMarkerRecord = {
  id: string;
  layer: EntityLayerKey;
  title: string;
  subtitle: string | null;
  record: JsonRecord;
  locationSlug: string;
  location: Location | null;
  point?: EntityMapPoint;
  pointX: number;
  pointY: number;
  groupKey: string;
  offsetIndex: number;
  offsetTotal: number;
};

type ExactPointMarkerRecord = {
  id: string;
  point: EntityMapPoint;
  title: string;
  subtitle: string | null;
  locationSlug: string | null;
  location: Location | null;
  pointX: number;
  pointY: number;
};

type CalibrationCorrection = {
  location_key: string;
  name: string;
  old_x: number;
  old_y: number;
  corrected_x: number;
  corrected_y: number;
  locked: number;
  notes: string;
};

type CalibrationRunState = {
  status: "idle" | "running" | "success" | "error";
  message: string | null;
  details?: string[];
};

const CALIBRATION_STORAGE_KEY = "dd2_location_calibration_corrections_v1";

function createEntityIcon(layer: EntityLayerKey, label: string, active = false) {
  return L.divIcon({
    className: `dd2-entity-marker dd2-entity-marker-${layer} ${active ? "dd2-entity-marker-active" : ""}`,
    html: `<span>${label}</span>`,
    iconSize: active ? [28, 28] : [23, 23],
    iconAnchor: active ? [14, 14] : [11.5, 11.5],
    popupAnchor: [0, -12],
  });
}

const dd2EntityIcons: Record<EntityLayerKey, L.DivIcon> = {
  items: createEntityIcon("items", "I"),
  quests: createEntityIcon("quests", "Q"),
  npcs: createEntityIcon("npcs", "N"),
  vendors: createEntityIcon("vendors", "S"),
  vocations: createEntityIcon("vocations", "V"),
};

const dd2EntityActiveIcons: Record<EntityLayerKey, L.DivIcon> = {
  items: createEntityIcon("items", "I", true),
  quests: createEntityIcon("quests", "Q", true),
  npcs: createEntityIcon("npcs", "N", true),
  vendors: createEntityIcon("vendors", "S", true),
  vocations: createEntityIcon("vocations", "V", true),
};

const dd2ExactPointIcon = L.divIcon({
  className: "dd2-exact-point-marker",
  html: "<span>×</span>",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

const dd2CalibrationIcon = L.divIcon({
  className: "dd2-calibration-marker",
  html: "<span>✓</span>",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -10],
});

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function getText(
  record: JsonRecord | undefined | null,
  keys: string[],
): string | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && value !== "")
      return String(value);
  }
  return null;
}

function normalizeKey(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized.length > 0 ? normalized : null;
}

function normalizeRecords(
  data: unknown,
  preferredKeys: string[],
): JsonRecord[] {
  if (Array.isArray(data)) return data.filter(isRecord);
  if (isRecord(data)) {
    for (const key of preferredKeys) {
      const value = data[key];
      if (Array.isArray(value)) return value.filter(isRecord);
    }
  }
  return [];
}

function flattenRecords(
  value: unknown,
  result: JsonRecord[] = [],
): JsonRecord[] {
  if (Array.isArray(value)) {
    value.forEach((item) => flattenRecords(item, result));
    return result;
  }
  if (isRecord(value)) {
    result.push(value);
    Object.values(value).forEach((item) => flattenRecords(item, result));
  }
  return result;
}

function normalizeLocations(data: unknown): Location[] {
  return normalizeRecords(data, ["locations"]) as Location[];
}

function normalizeOpRoutes(data: unknown): OpRoute[] {
  return normalizeRecords(data, ["op_routes", "routes"]) as OpRoute[];
}

function normalizeRouteNetwork(data: unknown): RouteNetwork {
  if (
    isRecord(data) &&
    Array.isArray(data.nodes) &&
    Array.isArray(data.edges)
  ) {
    return {
      nodes: data.nodes.filter(isRecord) as RouteNetworkNode[],
      edges: data.edges.filter(isRecord) as RouteNetworkEdge[],
    };
  }
  return { nodes: [], edges: [] };
}

function getStepOrder(step: RouteStep): number {
  return (
    toNumber(step.step_order) ??
    toNumber(step.order) ??
    toNumber(step.sort_order) ??
    Number.POSITIVE_INFINITY
  );
}

function getRouteTitle(route: OpRoute): string {
  return (
    route.title ??
    route.name ??
    route.slug ??
    route.route_slug ??
    "Naamloze route"
  );
}

function getStepTitle(step: RouteStep): string {
  return (
    step.title ?? step.name ?? step.slug ?? step.step_slug ?? "Naamloze stap"
  );
}

function getStepSlug(step: RouteStep): string {
  return (
    normalizeKey(step.step_key) ??
    normalizeKey(step.slug) ??
    normalizeKey(step.step_slug) ??
    normalizeKey(step.title) ??
    normalizeKey(step.name) ??
    ""
  );
}

function getStepLocationSlug(step: RouteStep): string | null {
  return (
    normalizeKey(step.location_key) ??
    normalizeKey(step.location_slug) ??
    normalizeKey(step.map_anchor_key) ??
    normalizeKey(step.map_anchor_slug) ??
    normalizeKey(step.anchor_slug) ??
    null
  );
}

function getLocationSlug(location: Location): string | null {
  return (
    normalizeKey(location.location_key) ??
    normalizeKey(location.slug) ??
    normalizeKey(location.location_slug) ??
    normalizeKey(location.name) ??
    normalizeKey(location.id)
  );
}

function getLocationAliases(location: Location): string[] {
  const aliases = [
    normalizeKey(location.location_key),
    normalizeKey(location.slug),
    normalizeKey(location.location_slug),
    normalizeKey(location.name),
    normalizeKey(location.id),
  ].filter((value): value is string => value !== null);
  return Array.from(new Set(aliases));
}

function resolveStepLocationSlug(
  step: RouteStep,
  locationsBySlug: Map<string, Location>,
): string | null {
  const directSlug = normalizeKey(getStepLocationSlug(step));
  if (directSlug && locationsBySlug.has(directSlug)) return directSlug;

  const stepSlug = getStepSlug(step);
  const stepTitle = normalizeKey(getStepTitle(step)) ?? "";
  const candidates = Array.from(locationsBySlug.keys());
  const searchText = [stepSlug, stepTitle].filter(Boolean).join(" ");
  if (searchText.length === 0) return null;

  const matchedByLocationName = candidates.find((locationSlug) =>
    searchText.includes(locationSlug),
  );
  if (matchedByLocationName) return matchedByLocationName;

  const matchedByPartialName = candidates.find((locationSlug) => {
    const locationWords = locationSlug
      .split("_")
      .filter((word) => word.length >= 4);
    return locationWords.some((word) => searchText.includes(word));
  });
  if (matchedByPartialName) return matchedByPartialName;

  if (searchText.includes("borderwatch"))
    return candidates.find((slug) => slug.includes("borderwatch")) ?? null;
  if (searchText.includes("melve"))
    return candidates.find((slug) => slug.includes("melve")) ?? null;
  if (searchText.includes("vernworth"))
    return candidates.find((slug) => slug.includes("vernworth")) ?? null;
  if (searchText.includes("trevo"))
    return candidates.find((slug) => slug.includes("trevo")) ?? null;

  return null;
}

function getRecordKey(
  record: JsonRecord,
  type: "location" | "item" | "quest" | "npc" | "vocation" | "flag" | "vendor" | "point",
): string | null {
  return (
    normalizeKey(record[`${type}_key`]) ??
    normalizeKey(record[`${type}_slug`]) ??
    normalizeKey(record.point_key) ??
    normalizeKey(record.key) ??
    normalizeKey(record.slug) ??
    normalizeKey(record.name) ??
    normalizeKey(record.title) ??
    null
  );
}

function getRecordTitle(record: JsonRecord): string {
  return (
    getText(record, [
      "title",
      "name",
      "label",
      "checklist_text",
      "requirement_text",
      "reward_text",
      "objective_text",
      "stage_title",
      "choice_label",
      "description",
      "slug",
      "key",
      "item_key",
      "quest_key",
      "npc_key",
      "vocation_key",
      "flag_key",
    ]) ?? "Onbekend"
  );
}

function getRecordSubtitle(record: JsonRecord): string | null {
  return getText(record, [
    "description",
    "notes",
    "summary",
    "effect",
    "reward_text",
    "requirement_text",
    "objective_text",
    "source_note",
    "location_key",
    "category",
    "type",
    "source_key",
  ]);
}

function hasKeyContaining(record: JsonRecord, parts: string[]): boolean {
  return Object.keys(record).some((key) => {
    const normalized = normalizeKey(key) ?? "";
    return parts.some((part) => normalized.includes(part));
  });
}

function recordReferencesStep(record: JsonRecord, stepSlug: string): boolean {
  const normalizedStepSlug = normalizeKey(stepSlug);
  if (!normalizedStepSlug) return false;

  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = normalizeKey(key) ?? "";
    if (!normalizedKey.includes("step")) continue;
    if (normalizeKey(value) === normalizedStepSlug) return true;
  }

  return (
    normalizeKey(record.step_key) === normalizedStepSlug ||
    normalizeKey(record.step_slug) === normalizedStepSlug ||
    normalizeKey(record.slug) === normalizedStepSlug
  );
}

function findStepRecords(raw: unknown, stepSlug: string): JsonRecord[] {
  const records = flattenRecords(raw);
  const unique = new Map<string, JsonRecord>();
  records.forEach((record, index) => {
    if (recordReferencesStep(record, stepSlug)) {
      unique.set(JSON.stringify(record).slice(0, 300) + index, record);
    }
  });
  return Array.from(unique.values());
}

function collectLinkedKeys(
  records: JsonRecord[],
  entity: "item" | "quest" | "npc" | "vocation" | "flag" | "vendor",
): Set<string> {
  const linkedKeys = new Set<string>();
  const allRecords = flattenRecords(records);
  allRecords.forEach((record) => {
    Object.entries(record).forEach(([key, value]) => {
      const normalizedKey = normalizeKey(key) ?? "";
      if (!normalizedKey.includes(entity)) return;
      if (!normalizedKey.endsWith("key") && !normalizedKey.endsWith("slug"))
        return;
      const normalizedValue = normalizeKey(value);
      if (normalizedValue) linkedKeys.add(normalizedValue);
    });
  });
  return linkedKeys;
}

function findRecordsByKeys(
  records: JsonRecord[],
  type: "item" | "quest" | "npc" | "vocation" | "flag" | "vendor",
  keys: Set<string>,
): JsonRecord[] {
  if (keys.size === 0) return [];
  return records.filter((record) => {
    const recordKey = getRecordKey(record, type);
    return recordKey !== null && keys.has(recordKey);
  });
}

function uniqueRecords(records: JsonRecord[], maxCount = 12): JsonRecord[] {
  const seen = new Set<string>();
  const result: JsonRecord[] = [];
  for (const record of records) {
    const fingerprint = [
      getRecordTitle(record),
      getRecordSubtitle(record),
      JSON.stringify(record).slice(0, 120),
    ].join("|");
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    result.push(record);
    if (result.length >= maxCount) break;
  }
  return result;
}

function getRelatedCategory(
  records: JsonRecord[],
  category:
    "checklist" | "requirement" | "reward" | "item" | "quest" | "location",
): JsonRecord[] {
  const termsByCategory: Record<typeof category, string[]> = {
    checklist: ["checklist"],
    requirement: ["requirement", "requires"],
    reward: ["reward"],
    item: ["item"],
    quest: ["quest"],
    location: ["location"],
  };
  return uniqueRecords(
    records.filter((record) =>
      hasKeyContaining(record, termsByCategory[category]),
    ),
  );
}

function mergeRecordsByKey(
  coreRecords: JsonRecord[],
  detailRecords: JsonRecord[],
  type: "item" | "quest",
): JsonRecord[] {
  const merged = new Map<string, JsonRecord>();

  coreRecords.forEach((record, index) => {
    const key = getRecordKey(record, type) ?? `core_${index}`;
    merged.set(key, { ...record });
  });

  detailRecords.forEach((record, index) => {
    const key = getRecordKey(record, type) ?? `detail_${index}`;
    merged.set(key, { ...(merged.get(key) ?? {}), ...record });
  });

  return Array.from(merged.values());
}

function collectLocationSlugsFromValue(
  value: unknown,
  locationsBySlug: Map<string, Location>,
  result: Set<string>,
) {
  if (Array.isArray(value)) {
    value.forEach((item) =>
      collectLocationSlugsFromValue(item, locationsBySlug, result),
    );
    return;
  }

  if (!isRecord(value)) return;

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = normalizeKey(key) ?? "";
    if (
      normalizedKey.endsWith("location_key") ||
      normalizedKey === "location"
    ) {
      const locationSlug = normalizeKey(nestedValue);
      if (locationSlug && locationsBySlug.has(locationSlug))
        result.add(locationSlug);
    }

    if (Array.isArray(nestedValue) || isRecord(nestedValue)) {
      collectLocationSlugsFromValue(nestedValue, locationsBySlug, result);
    }
  }
}

function getRecordLocationSlugs(
  record: JsonRecord,
  locationsBySlug: Map<string, Location>,
): string[] {
  const result = new Set<string>();
  collectLocationSlugsFromValue(record, locationsBySlug, result);
  return Array.from(result);
}

function getLocationName(location: Location | undefined): string {
  return (
    location?.name ??
    location?.location_key ??
    location?.slug ??
    "Onbekende locatie"
  );
}

function getRecordsLinkedToLocation(
  records: JsonRecord[],
  locationSlug: string,
  locationsBySlug: Map<string, Location>,
  maxCount = 6,
): JsonRecord[] {
  return uniqueRecords(
    records.filter((record) =>
      getRecordLocationSlugs(record, locationsBySlug).includes(locationSlug),
    ),
    maxCount,
  );
}

function getRouteStepsLinkedToLocation(
  steps: RouteStep[],
  locationSlug: string,
  locationsBySlug: Map<string, Location>,
  maxCount = 6,
): RouteStep[] {
  return steps
    .filter(
      (step) => resolveStepLocationSlug(step, locationsBySlug) === locationSlug,
    )
    .sort((a, b) => getStepOrder(a) - getStepOrder(b))
    .slice(0, maxCount);
}

function getEntityLayerLabel(layer: EntityLayerKey): string {
  const labels: Record<EntityLayerKey, string> = {
    items: "Item",
    quests: "Quest",
    npcs: "NPC",
    vendors: "Vendor",
    vocations: "Vocation",
  };
  return labels[layer];
}

function getEntityPointKey(point: EntityMapPoint): string | null {
  return normalizeKey(point.point_key) ?? null;
}

function getEntityPointEntityType(point: EntityMapPoint): string | null {
  return normalizeKey(point.entity_type) ?? null;
}

function getEntityPointEntityKey(point: EntityMapPoint): string | null {
  return normalizeKey(point.entity_key) ?? null;
}

function getEntityPointLocationSlug(point: EntityMapPoint): string | null {
  return normalizeKey(point.location_key) ?? null;
}

function getEntityPointPosition(point: EntityMapPoint): { x: number; y: number } | null {
  const x = toNumber(point.world_x);
  const y = toNumber(point.world_y);
  if (x === null || y === null) return null;
  return { x, y };
}

function getEntityPointTitle(point: EntityMapPoint): string {
  return point.name ?? point.point_key ?? point.entity_key ?? "Exact punt";
}

function getEntityPointSubtitle(point: EntityMapPoint): string | null {
  const accuracy = point.accuracy_level ? `Accuratesse: ${point.accuracy_level}` : null;
  const notes = point.notes ? String(point.notes) : null;
  return [accuracy, notes].filter(Boolean).join(" — ") || null;
}

function getEntityMarkerPosition(marker: EntityMarkerRecord): LatLngExpression {
  const x = marker.pointX;
  const y = marker.pointY;
  if (marker.offsetTotal <= 1) return [y, x];

  const angle = (Math.PI * 2 * marker.offsetIndex) / marker.offsetTotal;
  const radius = Math.min(36, 12 + marker.offsetTotal * 2);
  return [Math.round(y + Math.sin(angle) * radius), Math.round(x + Math.cos(angle) * radius)];
}

function getExactPointMarkerPosition(marker: ExactPointMarkerRecord): LatLngExpression {
  return [marker.pointY, marker.pointX];
}

function buildEntityMarkers(
  configs: {
    layer: EntityLayerKey;
    type: "item" | "quest" | "npc" | "vendor" | "vocation";
    records: JsonRecord[];
  }[],
  locationsBySlug: Map<string, Location>,
  entityMapPoints: EntityMapPoint[],
): EntityMarkerRecord[] {
  const baseMarkers: Omit<EntityMarkerRecord, "offsetIndex" | "offsetTotal">[] = [];
  const exactPointsByEntity = new Map<string, EntityMapPoint[]>();

  entityMapPoints.forEach((point) => {
    const entityType = getEntityPointEntityType(point);
    const entityKey = getEntityPointEntityKey(point);
    if (!entityType || !entityKey) return;
    const position = getEntityPointPosition(point);
    if (!position) return;
    const key = `${entityType}:${entityKey}`;
    const points = exactPointsByEntity.get(key) ?? [];
    points.push(point);
    exactPointsByEntity.set(key, points);
  });

  configs.forEach(({ layer, type, records }) => {
    records.forEach((record, recordIndex) => {
      const recordKey = getRecordKey(record, type) ?? `${layer}_${recordIndex}`;
      const exactPoints = exactPointsByEntity.get(`${type}:${recordKey}`) ?? [];

      if (exactPoints.length > 0) {
        exactPoints.forEach((point, pointIndex) => {
          const position = getEntityPointPosition(point);
          if (!position) return;
          const locationSlug = getEntityPointLocationSlug(point) ?? "";
          const location = locationSlug ? (locationsBySlug.get(locationSlug) ?? null) : null;
          baseMarkers.push({
            id: `${layer}-${recordKey}-${getEntityPointKey(point) ?? pointIndex}`,
            layer,
            title: getRecordTitle(record),
            subtitle: getEntityPointSubtitle(point) ?? getRecordSubtitle(record),
            record,
            locationSlug,
            location,
            point,
            pointX: position.x,
            pointY: position.y,
            groupKey: `${Math.round(position.x)}:${Math.round(position.y)}`,
          });
        });
        return;
      }

      const linkedLocationSlugs = getRecordLocationSlugs(record, locationsBySlug);
      linkedLocationSlugs.forEach((locationSlug, locationIndex) => {
        const location = locationsBySlug.get(locationSlug);
        const x = toNumber(location?.world_x);
        const y = toNumber(location?.world_y);
        if (!location || x === null || y === null) return;
        baseMarkers.push({
          id: `${layer}-${recordKey}-${locationSlug}-${locationIndex}`,
          layer,
          title: getRecordTitle(record),
          subtitle: getRecordSubtitle(record),
          record,
          locationSlug,
          location,
          pointX: x,
          pointY: y,
          groupKey: locationSlug,
        });
      });
    });
  });

  const groupedByPosition = new Map<string, typeof baseMarkers>();
  baseMarkers.forEach((marker) => {
    const group = groupedByPosition.get(marker.groupKey) ?? [];
    group.push(marker);
    groupedByPosition.set(marker.groupKey, group);
  });

  return baseMarkers.map((marker) => {
    const group = groupedByPosition.get(marker.groupKey) ?? [marker];
    return {
      ...marker,
      offsetIndex: group.findIndex((item) => item.id === marker.id),
      offsetTotal: group.length,
    };
  });
}

function buildExactPointMarkers(
  entityMapPoints: EntityMapPoint[],
  locationsBySlug: Map<string, Location>,
): ExactPointMarkerRecord[] {
  return entityMapPoints
    .filter((point) => {
      const type = getEntityPointEntityType(point);
      return type === "route_step" || type === "quest_objective";
    })
    .map((point, index) => {
      const position = getEntityPointPosition(point);
      if (!position) return null;
      const locationSlug = getEntityPointLocationSlug(point);
      const location = locationSlug ? (locationsBySlug.get(locationSlug) ?? null) : null;
      return {
        id: getEntityPointKey(point) ?? `exact-point-${index}`,
        point,
        title: getEntityPointTitle(point),
        subtitle: getEntityPointSubtitle(point),
        locationSlug,
        location,
        pointX: position.x,
        pointY: position.y,
      } satisfies ExactPointMarkerRecord;
    })
    .filter((marker): marker is ExactPointMarkerRecord => marker !== null);
}

function csvEscape(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function buildLocationCsvLine(params: {
  locationKey: string;
  name: string;
  categoryKey: string;
  regionKey: string;
  x: number;
  y: number;
  locationType: string;
}) {
  const row = [
    params.locationKey,
    params.name,
    params.categoryKey,
    params.regionKey,
    params.x,
    params.y,
    params.locationType,
    1,
    0,
    0,
    "",
    "Gekalibreerd via app-kalibratiehulp.",
    "own_calibration",
  ];
  return row.map(csvEscape).join(",");
}

function buildCalibrationCorrectionCsvLine(correction: CalibrationCorrection) {
  const row = [
    correction.location_key,
    correction.corrected_x,
    correction.corrected_y,
    correction.locked,
    correction.notes,
  ];
  return row.map(csvEscape).join(",");
}

function buildCalibrationCorrectionCsv(corrections: CalibrationCorrection[]) {
  const header = "location_key,corrected_x,corrected_y,locked,notes";
  return [header, ...corrections.map(buildCalibrationCorrectionCsvLine)].join("\n");
}

function applyCalibrationCorrectionsToLocations(
  locations: Location[],
  corrections: CalibrationCorrection[],
): Location[] {
  if (corrections.length === 0) return locations;
  const correctionsByKey = new Map(
    corrections.map((correction) => [normalizeKey(correction.location_key), correction]),
  );

  return locations.map((location) => {
    const locationSlug = getLocationSlug(location);
    const correction = locationSlug ? correctionsByKey.get(locationSlug) : null;
    if (!correction) return location;
    return {
      ...location,
      world_x: correction.corrected_x,
      world_y: correction.corrected_y,
      notes: `${location.notes ?? ""} Pending kalibratiecorrectie: x ${correction.corrected_x}, y ${correction.corrected_y}.`.trim(),
    };
  });
}

async function fetchJsonRequired(path: string): Promise<unknown> {
  const response = await fetch(path);
  if (!response.ok)
    throw new Error(`Kon ${path} niet laden: ${response.status}`);
  return response.json();
}

async function fetchJsonOptional(path: string): Promise<unknown> {
  const response = await fetch(path);
  if (!response.ok) return null;
  return response.json();
}

function FitMapToMarkers({ locations }: { locations: Location[] }) {
  const map = useMap();

  useEffect(() => {
    const points = locations
      .map((location) => {
        const x = toNumber(location.world_x);
        const y = toNumber(location.world_y);
        if (x === null || y === null) return null;
        return [y, x] as [number, number];
      })
      .filter((point): point is [number, number] => point !== null);

    if (points.length === 0) return;
    const bounds: LatLngBoundsExpression = points;
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 2 });
  }, [locations, map]);

  return null;
}

function FlyToPoint({ point }: { point: { x: number; y: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (!point) return;
    map.flyTo([point.y, point.x], 2, { duration: 0.6 });
  }, [point, map]);

  return null;
}

function CalibrationClickCapture({
  enabled,
  onPick,
}: {
  enabled: boolean;
  onPick: (point: { x: number; y: number }) => void;
}) {
  useMapEvents({
    click: (event) => {
      if (!enabled) return;
      onPick({
        x: Math.round(event.latlng.lng),
        y: Math.round(event.latlng.lat),
      });
    },
  });

  return null;
}

function isEdgeBidirectional(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string")
    return value === "1" || value.toLowerCase() === "true";
  return true;
}

function findRouteNetworkPath(
  fromNodeKey: string,
  toNodeKey: string,
  routeNetwork: RouteNetwork,
): string[] {
  if (fromNodeKey === toNodeKey) return [fromNodeKey];

  const nodeKeys = new Set(routeNetwork.nodes.map((node) => node.node_key));
  if (!nodeKeys.has(fromNodeKey) || !nodeKeys.has(toNodeKey)) return [];

  const graph = new Map<string, { to: string; cost: number }[]>();
  for (const node of routeNetwork.nodes) graph.set(node.node_key, []);

  for (const edge of routeNetwork.edges) {
    const cost = toNumber(edge.distance_score) ?? 1;
    graph.get(edge.from_node_key)?.push({ to: edge.to_node_key, cost });
    if (isEdgeBidirectional(edge.bidirectional)) {
      graph.get(edge.to_node_key)?.push({ to: edge.from_node_key, cost });
    }
  }

  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set(nodeKeys);

  for (const nodeKey of nodeKeys) {
    distances.set(nodeKey, Number.POSITIVE_INFINITY);
    previous.set(nodeKey, null);
  }
  distances.set(fromNodeKey, 0);

  while (unvisited.size > 0) {
    let currentNode: string | null = null;
    let currentDistance = Number.POSITIVE_INFINITY;

    for (const nodeKey of unvisited) {
      const distance = distances.get(nodeKey) ?? Number.POSITIVE_INFINITY;
      if (distance < currentDistance) {
        currentDistance = distance;
        currentNode = nodeKey;
      }
    }

    if (currentNode === null) break;
    if (currentNode === toNodeKey) break;
    unvisited.delete(currentNode);

    for (const neighbor of graph.get(currentNode) ?? []) {
      if (!unvisited.has(neighbor.to)) continue;
      const nextDistance = currentDistance + neighbor.cost;
      if (
        nextDistance < (distances.get(neighbor.to) ?? Number.POSITIVE_INFINITY)
      ) {
        distances.set(neighbor.to, nextDistance);
        previous.set(neighbor.to, currentNode);
      }
    }
  }

  const path: string[] = [];
  let current: string | null = toNodeKey;
  while (current !== null) {
    path.unshift(current);
    current = previous.get(current) ?? null;
  }

  return path[0] === fromNodeKey ? path : [];
}

function RoutePolyline({
  routes,
  locationsBySlug,
  routeNetwork,
}: {
  routes: OpRoute[];
  locationsBySlug: Map<string, Location>;
  routeNetwork: RouteNetwork;
}) {
  const routePoints = useMemo(() => {
    const firstRoute = routes[0];
    if (!firstRoute?.steps) return [];

    const networkNodesByKey = new Map(
      routeNetwork.nodes.map((node) => [node.node_key, node]),
    );
    const steps = [...firstRoute.steps].sort(
      (a, b) => getStepOrder(a) - getStepOrder(b),
    );
    const stepNodeKeys: string[] = [];

    for (const step of steps) {
      const stepLocationSlug = resolveStepLocationSlug(step, locationsBySlug);
      if (!stepLocationSlug) continue;
      const previousNodeKey = stepNodeKeys[stepNodeKeys.length - 1];
      if (previousNodeKey === stepLocationSlug) continue;
      stepNodeKeys.push(stepLocationSlug);
    }

    if (stepNodeKeys.length < 2) return [];

    const networkPathNodeKeys: string[] = [];
    for (let index = 0; index < stepNodeKeys.length - 1; index += 1) {
      const fromNodeKey = stepNodeKeys[index];
      const toNodeKey = stepNodeKeys[index + 1];
      const pathSegment = findRouteNetworkPath(
        fromNodeKey,
        toNodeKey,
        routeNetwork,
      );

      if (pathSegment.length > 0) {
        const segmentToAdd =
          networkPathNodeKeys.length > 0 &&
          networkPathNodeKeys[networkPathNodeKeys.length - 1] === pathSegment[0]
            ? pathSegment.slice(1)
            : pathSegment;
        networkPathNodeKeys.push(...segmentToAdd);
      } else {
        if (
          networkPathNodeKeys.length === 0 ||
          networkPathNodeKeys[networkPathNodeKeys.length - 1] !== fromNodeKey
        ) {
          networkPathNodeKeys.push(fromNodeKey);
        }
        networkPathNodeKeys.push(toNodeKey);
      }
    }

    const points: LatLngExpression[] = [];
    for (const nodeKey of networkPathNodeKeys) {
      const networkNode = networkNodesByKey.get(nodeKey);
      const fallbackLocation = locationsBySlug.get(nodeKey);
      const x = toNumber(networkNode?.world_x ?? fallbackLocation?.world_x);
      const y = toNumber(networkNode?.world_y ?? fallbackLocation?.world_y);
      if (x === null || y === null) continue;
      points.push([y, x]);
    }

    return points;
  }, [routes, locationsBySlug, routeNetwork]);

  if (routePoints.length < 2) return null;
  return <Polyline positions={routePoints} className="dd2-route-polyline" />;
}

function RelatedList({
  title,
  records,
  emptyText,
}: {
  title: string;
  records: JsonRecord[];
  emptyText?: string;
}) {
  return (
    <section className="detail-section">
      <h4>{title}</h4>
      {records.length === 0 ? (
        <p className="muted">
          {emptyText ?? "Nog geen gekoppelde data voor deze stap."}
        </p>
      ) : (
        <ul className="detail-list">
          {records.map((record, index) => (
            <li key={`${title}-${index}`}>
              <strong>{getRecordTitle(record)}</strong>
              {getRecordSubtitle(record) && (
                <small>{getRecordSubtitle(record)}</small>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ContentBrowser({
  title,
  records,
  type,
  locationsBySlug,
  onSelectLocation,
}: {
  title: string;
  records: JsonRecord[];
  type: "location" | "item" | "quest" | "npc" | "vocation" | "vendor" | "flag" | "point";
  locationsBySlug: Map<string, Location>;
  onSelectLocation: (locationSlug: string) => void;
}) {
  return (
    <details className="browser-section" open>
      <summary>
        {title} <span>{records.length}</span>
      </summary>
      <ul className="compact-list">
        {records.slice(0, 30).map((record, index) => {
          const linkedLocationSlugs = getRecordLocationSlugs(
            record,
            locationsBySlug,
          );
          return (
            <li key={`${type}-${getRecordKey(record, type) ?? index}`}>
              <strong>{getRecordTitle(record)}</strong>
              {getRecordSubtitle(record) && (
                <small>{getRecordSubtitle(record)}</small>
              )}
              {linkedLocationSlugs.length > 0 && (
                <div
                  className="location-chip-row"
                  aria-label="Gekoppelde locaties"
                >
                  {linkedLocationSlugs.map((locationSlug) => (
                    <button
                      key={locationSlug}
                      type="button"
                      className="location-chip"
                      onClick={() => onSelectLocation(locationSlug)}
                    >
                      {getLocationName(locationsBySlug.get(locationSlug))}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {records.length > 30 && (
        <p className="muted">
          + {records.length - 30} extra records niet getoond in deze preview.
        </p>
      )}
    </details>
  );
}

function ExactPointList({
  title,
  points,
  onSelectPoint,
}: {
  title: string;
  points: EntityMapPoint[];
  onSelectPoint: (point: EntityMapPoint) => void;
}) {
  return (
    <section className="detail-section">
      <h4>{title}</h4>
      {points.length === 0 ? (
        <p className="muted">Nog geen exact kaartpunt voor deze stap.</p>
      ) : (
        <ul className="detail-list exact-point-list">
          {points.map((point, index) => {
            const position = getEntityPointPosition(point);
            return (
              <li key={`${getEntityPointKey(point) ?? index}`}>
                <button type="button" className="exact-point-button" onClick={() => onSelectPoint(point)}>
                  <strong>{getEntityPointTitle(point)}</strong>
                  {getEntityPointSubtitle(point) && <small>{getEntityPointSubtitle(point)}</small>}
                  {position && <small>x {position.x}, y {position.y}</small>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function LocationChipList({
  title,
  locationSlugs,
  locationsBySlug,
  onSelectLocation,
}: {
  title: string;
  locationSlugs: string[];
  locationsBySlug: Map<string, Location>;
  onSelectLocation: (locationSlug: string) => void;
}) {
  return (
    <section className="detail-section">
      <h4>{title}</h4>
      {locationSlugs.length === 0 ? (
        <p className="muted">Nog geen gekoppelde locaties.</p>
      ) : (
        <div className="location-chip-row">
          {locationSlugs.map((locationSlug) => (
            <button
              key={locationSlug}
              type="button"
              className="location-chip"
              onClick={() => onSelectLocation(locationSlug)}
            >
              {getLocationName(locationsBySlug.get(locationSlug))}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function DataCard({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`data-card ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <span>{label}</span>
      <strong>{count}</strong>
    </button>
  );
}

function BrowserTabs({
  activeTab,
  onChange,
}: {
  activeTab: BrowserTab;
  onChange: (tab: BrowserTab) => void;
}) {
  const tabs: { key: BrowserTab; label: string }[] = [
    { key: "locations", label: "Locaties" },
    { key: "items", label: "Items" },
    { key: "quests", label: "Quests" },
    { key: "npcs", label: "NPCs" },
    { key: "vendors", label: "Vendors" },
    { key: "vocations", label: "Vocations" },
    { key: "exact_points", label: "Exacte punten" },
  ];

  return (
    <div
      className="browser-tabs"
      role="tablist"
      aria-label="Databrowser categorieën"
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`browser-tab ${activeTab === tab.key ? "active" : ""}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

const MAP_LAYER_CONFIG: { key: MapLayerKey; label: string; description: string }[] = [
  { key: "route", label: "Route", description: "OP-route polyline" },
  { key: "locations", label: "Locaties", description: "Basislocaties" },
  { key: "items", label: "Items", description: "Loot en itembronnen" },
  { key: "quests", label: "Quests", description: "Quest-starts en objectives" },
  { key: "npcs", label: "NPCs", description: "Personages" },
  { key: "vendors", label: "Vendors", description: "Shops en diensten" },
  { key: "vocations", label: "Vocations", description: "Unlocks en trainers" },
  { key: "exact_points", label: "Exacte punten", description: "Route- en objective-punten" },
  { key: "calibration", label: "Kalibratie", description: "Correctiepunten" },
];

function MapLayerPanel({
  layers,
  counts,
  onToggle,
  onSolo,
}: {
  layers: Record<MapLayerKey, boolean>;
  counts: Record<MapLayerKey, number>;
  onToggle: (key: MapLayerKey) => void;
  onSolo: (key: MapLayerKey) => void;
}) {
  return (
    <section className="panel map-layer-panel">
      <h2>Kaartlagen</h2>
      <p className="muted">Zet markerlagen aan of uit om de kaart overzichtelijk te houden.</p>
      <div className="map-layer-list">
        {MAP_LAYER_CONFIG.map((layer) => (
          <label key={layer.key} className={`map-layer-row ${layers[layer.key] ? "active" : ""}`}>
            <input
              type="checkbox"
              checked={layers[layer.key]}
              onChange={() => onToggle(layer.key)}
            />
            <span className={`map-layer-dot map-layer-dot-${layer.key}`} aria-hidden="true" />
            <span className="map-layer-copy">
              <strong>{layer.label}</strong>
              <small>{layer.description}</small>
            </span>
            <span className="map-layer-count">{counts[layer.key]}</span>
            <button
              type="button"
              className="map-layer-solo"
              onClick={(event) => {
                event.preventDefault();
                onSolo(layer.key);
              }}
            >
              solo
            </button>
          </label>
        ))}
      </div>
    </section>
  );
}

function PopupLinkedSection({
  title,
  records,
}: {
  title: string;
  records: { title: string; subtitle?: string | null }[];
}) {
  if (records.length === 0) return null;
  return (
    <div className="popup-linked-section">
      <strong>{title}</strong>
      <ul>
        {records.map((record, index) => (
          <li key={`${title}-${index}`}>
            {record.title}
            {record.subtitle && <small>{record.subtitle}</small>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function App() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [opRoutes, setOpRoutes] = useState<OpRoute[]>([]);
  const [routeNetwork, setRouteNetwork] = useState<RouteNetwork>({
    nodes: [],
    edges: [],
  });
  const [contentData, setContentData] = useState<ContentData>({
    items: [],
    quests: [],
    locationItems: [],
    walkthroughsRaw: null,
    walkthroughRecords: [],
    itemDetails: [],
    questDetails: [],
    npcs: [],
    vendors: [],
    vocations: [],
    gameFlags: [],
    entityMapPoints: [],
  });
  const [activeBrowserTab, setActiveBrowserTab] = useState<BrowserTab>("items");
  const [mapLayers, setMapLayers] = useState<Record<MapLayerKey, boolean>>({
    route: true,
    locations: true,
    items: true,
    quests: true,
    npcs: false,
    vendors: false,
    vocations: false,
    exact_points: true,
    calibration: true,
  });
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [calibrationLocationKey, setCalibrationLocationKey] = useState("");
  const [calibrationLocationName, setCalibrationLocationName] = useState("");
  const [calibrationCategoryKey, setCalibrationCategoryKey] =
    useState("settlement");
  const [calibrationRegionKey, setCalibrationRegionKey] = useState("vermund");
  const [calibrationLocationType, setCalibrationLocationType] =
    useState("point_of_interest");
  const [lastCalibrationPoint, setLastCalibrationPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [calibrationCorrections, setCalibrationCorrections] = useState<
    CalibrationCorrection[]
  >([]);
  const [calibrationRun, setCalibrationRun] = useState<CalibrationRunState>({
    status: "idle",
    message: null,
  });
  const [activeLocationSlug, setActiveLocationSlug] = useState<string | null>(
    null,
  );
  const [activeStepSlug, setActiveStepSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CALIBRATION_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setCalibrationCorrections(
          parsed.filter(isRecord).map((record) => ({
            location_key: String(record.location_key ?? ""),
            name: String(record.name ?? record.location_key ?? ""),
            old_x: toNumber(record.old_x) ?? 0,
            old_y: toNumber(record.old_y) ?? 0,
            corrected_x: toNumber(record.corrected_x) ?? 0,
            corrected_y: toNumber(record.corrected_y) ?? 0,
            locked: toNumber(record.locked) ?? 1,
            notes: String(record.notes ?? "Handmatig gecorrigeerd in app."),
          })).filter((correction) => correction.location_key.length > 0),
        );
      }
    } catch {
      window.localStorage.removeItem(CALIBRATION_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      CALIBRATION_STORAGE_KEY,
      JSON.stringify(calibrationCorrections),
    );
  }, [calibrationCorrections]);

  useEffect(() => {
    async function loadData() {
      try {
        const [
          locationsJson,
          routesJson,
          routeNetworkJson,
          itemsJson,
          questsJson,
          locationItemsJson,
          walkthroughsJson,
          itemDetailsJson,
          questDetailsJson,
          npcsJson,
          vendorsJson,
          vocationsJson,
          gameFlagsJson,
          entityMapPointsJson,
        ] = await Promise.all([
          fetchJsonRequired(assetUrl("/data/locations.json")),
          fetchJsonRequired(assetUrl("/data/op_routes.json")),
          fetchJsonRequired(assetUrl("/data/route_network.json")),
          fetchJsonOptional(assetUrl("/data/items.json")),
          fetchJsonOptional(assetUrl("/data/quests.json")),
          fetchJsonOptional(assetUrl("/data/location_items.json")),
          fetchJsonOptional(assetUrl("/data/walkthroughs.json")),
          fetchJsonOptional(assetUrl("/data/item_details.json")),
          fetchJsonOptional(assetUrl("/data/quest_details.json")),
          fetchJsonOptional(assetUrl("/data/npcs.json")),
          fetchJsonOptional(assetUrl("/data/vendors.json")),
          fetchJsonOptional(assetUrl("/data/vocations.json")),
          fetchJsonOptional(assetUrl("/data/game_flags.json")),
          fetchJsonOptional(assetUrl("/data/entity_map_points.json")),
        ]);

        setLocations(normalizeLocations(locationsJson));
        setOpRoutes(normalizeOpRoutes(routesJson));
        setRouteNetwork(normalizeRouteNetwork(routeNetworkJson));
        setContentData({
          items: normalizeRecords(itemsJson, ["items"]),
          quests: normalizeRecords(questsJson, ["quests"]),
          locationItems: normalizeRecords(locationItemsJson, [
            "location_items",
          ]),
          walkthroughsRaw: walkthroughsJson,
          walkthroughRecords: flattenRecords(walkthroughsJson),
          itemDetails: normalizeRecords(itemDetailsJson, [
            "item_details",
            "items",
          ]),
          questDetails: normalizeRecords(questDetailsJson, [
            "quest_details",
            "quests",
          ]),
          npcs: normalizeRecords(npcsJson, ["npcs"]),
          vendors: normalizeRecords(vendorsJson, ["vendors"]),
          vocations: normalizeRecords(vocationsJson, ["vocations"]),
          gameFlags: normalizeRecords(gameFlagsJson, ["game_flags", "flags"]),
          entityMapPoints: normalizeRecords(entityMapPointsJson, ["entity_map_points", "points"]) as EntityMapPoint[],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Onbekende fout");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const displayLocations = useMemo(() => {
    return applyCalibrationCorrectionsToLocations(
      locations,
      calibrationCorrections,
    );
  }, [locations, calibrationCorrections]);

  const markerLocations = useMemo(() => {
    return displayLocations.filter(
      (location) =>
        toNumber(location.world_x) !== null &&
        toNumber(location.world_y) !== null,
    );
  }, [displayLocations]);

  const locationsBySlug = useMemo(() => {
    const map = new Map<string, Location>();
    displayLocations.forEach((location) => {
      getLocationAliases(location).forEach((alias) => map.set(alias, location));
    });
    return map;
  }, [displayLocations]);

  const activeLocation = activeLocationSlug
    ? (locationsBySlug.get(activeLocationSlug) ?? null)
    : null;

  const allRouteSteps = useMemo(() => {
    return opRoutes.flatMap((route) => route.steps ?? []);
  }, [opRoutes]);

  const activeStep = useMemo(() => {
    if (!activeStepSlug) return null;
    return (
      allRouteSteps.find((step) => getStepSlug(step) === activeStepSlug) ?? null
    );
  }, [activeStepSlug, allRouteSteps]);

  const activeStepRecords = useMemo(() => {
    if (!activeStepSlug) return [];
    return findStepRecords(contentData.walkthroughsRaw, activeStepSlug);
  }, [activeStepSlug, contentData.walkthroughsRaw]);

  const itemBrowserRecords = useMemo(() => {
    return mergeRecordsByKey(
      contentData.items,
      contentData.itemDetails,
      "item",
    );
  }, [contentData.items, contentData.itemDetails]);

  const questBrowserRecords = useMemo(() => {
    return mergeRecordsByKey(
      contentData.quests,
      contentData.questDetails,
      "quest",
    );
  }, [contentData.quests, contentData.questDetails]);

  const entityMarkers = useMemo(() => {
    return buildEntityMarkers(
      [
        { layer: "items", type: "item", records: itemBrowserRecords },
        { layer: "quests", type: "quest", records: questBrowserRecords },
        { layer: "npcs", type: "npc", records: contentData.npcs },
        { layer: "vendors", type: "vendor", records: contentData.vendors },
        { layer: "vocations", type: "vocation", records: contentData.vocations },
      ],
      locationsBySlug,
      contentData.entityMapPoints,
    );
  }, [
    contentData.entityMapPoints,
    contentData.npcs,
    contentData.vendors,
    contentData.vocations,
    itemBrowserRecords,
    locationsBySlug,
    questBrowserRecords,
  ]);

  const exactPointMarkers = useMemo(() => {
    return buildExactPointMarkers(contentData.entityMapPoints, locationsBySlug);
  }, [contentData.entityMapPoints, locationsBySlug]);

  const activeStepExactPoints = useMemo(() => {
    if (!activeStepSlug) return [];
    return contentData.entityMapPoints.filter((point) => {
      const type = getEntityPointEntityType(point);
      if (type !== "route_step") return false;
      return (
        normalizeKey(point.step_key) === activeStepSlug ||
        getEntityPointEntityKey(point) === activeStepSlug
      );
    });
  }, [activeStepSlug, contentData.entityMapPoints]);

  const activeStepFocusPoint = useMemo(() => {
    const exactPoint = activeStepExactPoints[0];
    const exactPosition = exactPoint ? getEntityPointPosition(exactPoint) : null;
    if (exactPosition) return exactPosition;
    if (!activeLocation) return null;
    const x = toNumber(activeLocation.world_x);
    const y = toNumber(activeLocation.world_y);
    if (x === null || y === null) return null;
    return { x, y };
  }, [activeLocation, activeStepExactPoints]);

  const mapLayerCounts = useMemo(() => {
    const counts: Record<MapLayerKey, number> = {
      route: opRoutes.length,
      locations: markerLocations.length,
      items: 0,
      quests: 0,
      npcs: 0,
      vendors: 0,
      vocations: 0,
      exact_points: exactPointMarkers.length,
      calibration: calibrationCorrections.length,
    };
    entityMarkers.forEach((marker) => {
      counts[marker.layer] += 1;
    });
    return counts;
  }, [calibrationCorrections.length, entityMarkers, exactPointMarkers.length, markerLocations.length, opRoutes.length]);

  function toggleMapLayer(layer: MapLayerKey) {
    setMapLayers((current) => ({ ...current, [layer]: !current[layer] }));
  }

  function soloMapLayer(layer: MapLayerKey) {
    setMapLayers({
      route: layer === "route",
      locations: layer === "locations",
      items: layer === "items",
      quests: layer === "quests",
      npcs: layer === "npcs",
      vendors: layer === "vendors",
      vocations: layer === "vocations",
      exact_points: layer === "exact_points",
      calibration: layer === "calibration",
    });
  }

  const relatedItems = useMemo(() => {
    const keys = collectLinkedKeys(activeStepRecords, "item");
    return uniqueRecords(findRecordsByKeys(itemBrowserRecords, "item", keys));
  }, [activeStepRecords, itemBrowserRecords]);

  const relatedQuests = useMemo(() => {
    const keys = collectLinkedKeys(activeStepRecords, "quest");
    return uniqueRecords(findRecordsByKeys(questBrowserRecords, "quest", keys));
  }, [activeStepRecords, questBrowserRecords]);

  const relatedNpcs = useMemo(() => {
    const keys = collectLinkedKeys(activeStepRecords, "npc");
    return uniqueRecords(findRecordsByKeys(contentData.npcs, "npc", keys));
  }, [activeStepRecords, contentData.npcs]);

  const relatedVocations = useMemo(() => {
    const keys = collectLinkedKeys(activeStepRecords, "vocation");
    return uniqueRecords(
      findRecordsByKeys(contentData.vocations, "vocation", keys),
    );
  }, [activeStepRecords, contentData.vocations]);

  const checklistRecords = getRelatedCategory(activeStepRecords, "checklist");
  const requirementRecords = getRelatedCategory(
    activeStepRecords,
    "requirement",
  );
  const rewardRecords = getRelatedCategory(activeStepRecords, "reward");

  const activeStepLocationSlugs = useMemo(() => {
    if (!activeStep) return [];
    const directLocationSlug = resolveStepLocationSlug(
      activeStep,
      locationsBySlug,
    );
    const linkedLocationSlugs = activeStepRecords.flatMap((record) =>
      getRecordLocationSlugs(record, locationsBySlug),
    );
    return Array.from(
      new Set(
        [directLocationSlug, ...linkedLocationSlugs].filter(
          (value): value is string => value !== null,
        ),
      ),
    );
  }, [activeStep, activeStepRecords, locationsBySlug]);

  const calibrationCsvLine = useMemo(() => {
    if (
      !lastCalibrationPoint ||
      !calibrationLocationKey ||
      !calibrationLocationName
    )
      return null;
    return buildLocationCsvLine({
      locationKey: calibrationLocationKey,
      name: calibrationLocationName,
      categoryKey: calibrationCategoryKey,
      regionKey: calibrationRegionKey,
      x: lastCalibrationPoint.x,
      y: lastCalibrationPoint.y,
      locationType: calibrationLocationType,
    });
  }, [
    calibrationCategoryKey,
    calibrationLocationKey,
    calibrationLocationName,
    calibrationLocationType,
    calibrationRegionKey,
    lastCalibrationPoint,
  ]);

  const calibrationCorrectionsCsv = useMemo(() => {
    if (calibrationCorrections.length === 0) return null;
    return buildCalibrationCorrectionCsv(calibrationCorrections);
  }, [calibrationCorrections]);

  function recordCalibrationCorrection(
    location: Location,
    point: { x: number; y: number },
  ) {
    const locationKey = getLocationSlug(location);
    const oldX = toNumber(location.world_x);
    const oldY = toNumber(location.world_y);
    if (!locationKey || oldX === null || oldY === null) return;

    const correction: CalibrationCorrection = {
      location_key: locationKey,
      name: getLocationName(location),
      old_x: oldX,
      old_y: oldY,
      corrected_x: point.x,
      corrected_y: point.y,
      locked: 1,
      notes: `Gesleept in app van x ${oldX}, y ${oldY} naar x ${point.x}, y ${point.y}.`,
    };

    setCalibrationCorrections((current) => {
      const next = current.filter(
        (item) => normalizeKey(item.location_key) !== locationKey,
      );
      next.push(correction);
      return next.sort((a, b) => a.location_key.localeCompare(b.location_key));
    });
    setActiveLocationSlug(locationKey);
  }

  function removeCalibrationCorrection(locationKey: string) {
    const normalizedLocationKey = normalizeKey(locationKey);
    setCalibrationCorrections((current) =>
      current.filter(
        (item) => normalizeKey(item.location_key) !== normalizedLocationKey,
      ),
    );
  }

  async function writeCorrectionsAndRecalculate() {
    if (calibrationCorrections.length === 0) {
      setCalibrationRun({
        status: "error",
        message: "Sleep eerst minimaal één correctiepunt.",
      });
      return;
    }

    setCalibrationRun({
      status: "running",
      message: "Correcties worden opgeslagen en alle locaties worden gewogen herberekend...",
    });

    try {
      const response = await fetch(assetUrl("__dd2/calibration/recalculate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corrections: calibrationCorrections,
          method: "weighted",
          runPipeline: true,
        }),
      });
      const payload = await response.json().catch(() => null) as
        | { ok?: boolean; message?: string; details?: string[]; error?: string }
        | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || payload?.message || `Kalibratie-server gaf HTTP ${response.status}`);
      }

      setCalibrationCorrections([]);
      window.localStorage.removeItem(CALIBRATION_STORAGE_KEY);
      setCalibrationRun({
        status: "success",
        message: payload.message || "Locaties herberekend. De app wordt opnieuw geladen...",
        details: payload.details,
      });

      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      setCalibrationRun({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Automatisch herberekenen is mislukt. Draai anders de tool handmatig.",
      });
    }
  }

  const browserContent = useMemo(() => {
    const locationRecords = displayLocations.map((location) => ({
      ...location,
    })) as JsonRecord[];
    const contentByTab: Record<
      BrowserTab,
      {
        title: string;
        records: JsonRecord[];
        type: "location" | "item" | "quest" | "npc" | "vendor" | "vocation" | "point";
      }
    > = {
      locations: {
        title: "Locaties",
        records: locationRecords,
        type: "location",
      },
      items: { title: "Items", records: itemBrowserRecords, type: "item" },
      quests: { title: "Quests", records: questBrowserRecords, type: "quest" },
      npcs: { title: "NPCs", records: contentData.npcs, type: "npc" },
      vendors: {
        title: "Vendors",
        records: contentData.vendors,
        type: "vendor",
      },
      vocations: {
        title: "Vocations",
        records: contentData.vocations,
        type: "vocation",
      },
      exact_points: {
        title: "Exacte kaartpunten",
        records: contentData.entityMapPoints as JsonRecord[],
        type: "point",
      },
    };
    return contentByTab[activeBrowserTab];
  }, [
    activeBrowserTab,
    contentData.entityMapPoints,
    contentData.npcs,
    contentData.vendors,
    contentData.vocations,
    itemBrowserRecords,
    displayLocations,
    questBrowserRecords,
  ]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>Dragon&apos;s Dogma II Companion</h1>
        <p className="subtitle">OP-route, loot, kaart en voortgang</p>

        <section className="panel">
          <h2>Data</h2>
          {loading && <p>Data laden...</p>}
          {error && <p className="error">{error}</p>}
          {!loading && !error && (
            <>
              <div className="data-grid">
                <DataCard
                  label="Locaties"
                  count={locations.length}
                  active={activeBrowserTab === "locations"}
                  onClick={() => setActiveBrowserTab("locations")}
                />
                <DataCard
                  label="Items"
                  count={contentData.items.length}
                  active={activeBrowserTab === "items"}
                  onClick={() => setActiveBrowserTab("items")}
                />
                <DataCard
                  label="Quests"
                  count={contentData.quests.length}
                  active={activeBrowserTab === "quests"}
                  onClick={() => setActiveBrowserTab("quests")}
                />
                <DataCard
                  label="NPCs"
                  count={contentData.npcs.length}
                  active={activeBrowserTab === "npcs"}
                  onClick={() => setActiveBrowserTab("npcs")}
                />
                <DataCard
                  label="Vendors"
                  count={contentData.vendors.length}
                  active={activeBrowserTab === "vendors"}
                  onClick={() => setActiveBrowserTab("vendors")}
                />
                <DataCard
                  label="Vocations"
                  count={contentData.vocations.length}
                  active={activeBrowserTab === "vocations"}
                  onClick={() => setActiveBrowserTab("vocations")}
                />
              </div>
              <p className="muted">
                Klik op een datategel om de Databrowser te wisselen.
              </p>
            </>
          )}
        </section>

        <MapLayerPanel
          layers={mapLayers}
          counts={mapLayerCounts}
          onToggle={toggleMapLayer}
          onSolo={soloMapLayer}
        />

        <section className="panel calibration-panel">
          <h2>Kalibratiehulp</h2>
          <p className="muted">
            Zet kalibratie aan en sleep bestaande markers naar de juiste plek.
            Gebruik de automatische knop om correcties weg te schrijven en alle locaties opnieuw te berekenen.
            Dit werkt lokaal via Vite; op GitHub Pages blijft CSV kopiëren de fallback.
          </p>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={calibrationMode}
              onChange={(event) => setCalibrationMode(event.target.checked)}
            />
            Kalibratiemodus: markers slepen en kaartklik gebruiken
          </label>
          <p className="muted">
            Sleep bijvoorbeeld Bakbattahl of Sacred Arbor. De markerpositie wordt
            tijdelijk onthouden in deze browser. De knop hieronder schrijft ze lokaal weg en herberekent met gewogen verhoudingen tussen kalibratiepunten.
          </p>

          {calibrationCorrections.length > 0 && (
            <section className="calibration-corrections">
              <h3>Gesleepte correctiepunten</h3>
              <ul className="calibration-correction-list">
                {calibrationCorrections.map((correction) => (
                  <li key={correction.location_key}>
                    <strong>{correction.name}</strong>
                    <small>
                      x {correction.old_x}, y {correction.old_y} → x {" "}
                      {correction.corrected_x}, y {correction.corrected_y}
                    </small>
                    <button
                      type="button"
                      className="small-danger-button"
                      onClick={() =>
                        removeCalibrationCorrection(correction.location_key)
                      }
                    >
                      Verwijder
                    </button>
                  </li>
                ))}
              </ul>
              {calibrationCorrectionsCsv && (
                <>
                  <pre className="csv-preview">
                    <code>{calibrationCorrectionsCsv}</code>
                  </pre>
                  <button
                    type="button"
                    className="primary-button calibration-run-button"
                    disabled={calibrationRun.status === "running"}
                    onClick={writeCorrectionsAndRecalculate}
                  >
                    {calibrationRun.status === "running"
                      ? "Bezig met wegschrijven..."
                      : "Schrijf weg + herbereken alles"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      navigator.clipboard?.writeText(calibrationCorrectionsCsv)
                    }
                  >
                    Kopieer correctie-CSV
                  </button>
                  <button
                    type="button"
                    className="secondary-button muted-button"
                    onClick={() => setCalibrationCorrections([])}
                  >
                    Wis tijdelijke correcties
                  </button>
                  {calibrationRun.message && (
                    <div className={`calibration-run-status calibration-run-status-${calibrationRun.status}`}>
                      <strong>{calibrationRun.message}</strong>
                      {calibrationRun.details && calibrationRun.details.length > 0 && (
                        <ul>
                          {calibrationRun.details.slice(0, 8).map((detail) => (
                            <li key={detail}>{detail}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          <details className="manual-calibration-details">
            <summary>Nieuwe locatie handmatig prikken</summary>
            <p className="muted">
              Gebruik dit alleen voor een volledig nieuwe locatie. Voor bestaande
              berekende punten is slepen beter.
            </p>
            <div className="calibration-form">
              <label>
                location_key
                <input
                  value={calibrationLocationKey}
                  onChange={(event) =>
                    setCalibrationLocationKey(event.target.value)
                  }
                  placeholder="checkpoint_rest_town"
                />
              </label>
              <label>
                name
                <input
                  value={calibrationLocationName}
                  onChange={(event) =>
                    setCalibrationLocationName(event.target.value)
                  }
                  placeholder="Checkpoint Rest Town"
                />
              </label>
              <label>
                category_key
                <select
                  value={calibrationCategoryKey}
                  onChange={(event) =>
                    setCalibrationCategoryKey(event.target.value)
                  }
                >
                  <option value="settlement">settlement</option>
                  <option value="dungeon">dungeon</option>
                  <option value="quest">quest</option>
                  <option value="camp">camp</option>
                  <option value="important_loot">important_loot</option>
                  <option value="merchant">merchant</option>
                  <option value="portcrystal">portcrystal</option>
                  <option value="golden_beetle">golden_beetle</option>
                </select>
              </label>
              <label>
                region_key
                <select
                  value={calibrationRegionKey}
                  onChange={(event) =>
                    setCalibrationRegionKey(event.target.value)
                  }
                >
                  <option value="vermund">vermund</option>
                  <option value="battahl">battahl</option>
                  <option value="volcanic_island">volcanic_island</option>
                  <option value="seafloor_shrine_area">
                    seafloor_shrine_area
                  </option>
                </select>
              </label>
              <label>
                location_type
                <input
                  value={calibrationLocationType}
                  onChange={(event) =>
                    setCalibrationLocationType(event.target.value)
                  }
                  placeholder="settlement"
                />
              </label>
            </div>
            {lastCalibrationPoint ? (
              <p className="muted">
                Laatste klik: x {lastCalibrationPoint.x}, y {" "}
                {lastCalibrationPoint.y}
              </p>
            ) : (
              <p className="muted">Nog geen kaartklik vastgelegd.</p>
            )}
            {calibrationCsvLine && (
              <>
                <pre className="csv-preview">
                  <code>{calibrationCsvLine}</code>
                </pre>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    navigator.clipboard?.writeText(calibrationCsvLine)
                  }
                >
                  Kopieer nieuwe locatie-CSV-regel
                </button>
              </>
            )}
          </details>
        </section>

        <section className="panel">
          <h2>Locations</h2>
          {!loading && !error && (
            <>
              <p>{locations.length} locaties geladen.</p>
              <p>{markerLocations.length} locaties met kaartcoördinaten.</p>
              <ul className="location-list">
                {displayLocations.map((location) => {
                  const locationSlug = getLocationSlug(location);
                  const isActive =
                    locationSlug !== null &&
                    locationSlug === activeLocationSlug;
                  return (
                    <li
                      key={locationSlug ?? String(location.id ?? location.name)}
                      className={`location-list-item ${isActive ? "active" : ""}`}
                      onClick={() => {
                        if (locationSlug) setActiveLocationSlug(locationSlug);
                      }}
                    >
                      <strong>{location.name ?? location.slug}</strong>
                      {location.region && <span>{location.region}</span>}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        <section className="panel">
          <h2>OP-routes</h2>
          {!loading && !error && (
            <>
              <p>{opRoutes.length} route(s) geladen.</p>
              <div className="route-list">
                {opRoutes.map((route) => {
                  const steps = [...(route.steps ?? [])].sort(
                    (a, b) => getStepOrder(a) - getStepOrder(b),
                  );
                  const routeMeta = [
                    route.profile_slug ?? route.profile,
                    route.vocation,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <article
                      key={route.slug ?? route.route_slug ?? route.title}
                      className="route-card"
                    >
                      <h3>{getRouteTitle(route)}</h3>
                      {routeMeta && <p className="muted">{routeMeta}</p>}
                      <ul className="step-list">
                        {steps.map((step) => {
                          const stepSlug = getStepSlug(step);
                          const stepLocationSlug = resolveStepLocationSlug(
                            step,
                            locationsBySlug,
                          );
                          const isActive = stepSlug === activeStepSlug;
                          return (
                            <li key={stepSlug}>
                              <button
                                type="button"
                                className={`step-button ${isActive ? "active" : ""}`}
                                onClick={() => {
                                  setActiveStepSlug(stepSlug);
                                  if (stepLocationSlug)
                                    setActiveLocationSlug(stepLocationSlug);
                                }}
                              >
                                <span className="step-order">
                                  {Number.isFinite(getStepOrder(step))
                                    ? getStepOrder(step)
                                    : "-"}
                                </span>
                                <span className="step-content">
                                  <strong>{getStepTitle(step)}</strong>
                                  {stepLocationSlug && (
                                    <small>{stepLocationSlug}</small>
                                  )}
                                  {step.description && (
                                    <small>{step.description}</small>
                                  )}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <section className="panel detail-panel">
          <h2>Route-stap details</h2>
          {!activeStep ? (
            <p className="muted">
              Klik links op een route-stap om checklist, rewards, requirements,
              items en quests te zien.
            </p>
          ) : (
            <>
              <h3>{getStepTitle(activeStep)}</h3>
              {activeStep.description && <p>{activeStep.description}</p>}
              <p className="muted">
                {activeStepRecords.length} gekoppelde walkthrough-records
                gevonden.
              </p>
              <RelatedList title="Checklist" records={checklistRecords} />
              <RelatedList title="Requirements" records={requirementRecords} />
              <RelatedList title="Rewards" records={rewardRecords} />
              <LocationChipList
                title="Locaties"
                locationSlugs={activeStepLocationSlugs}
                locationsBySlug={locationsBySlug}
                onSelectLocation={setActiveLocationSlug}
              />
              <ExactPointList
                title="Exacte routepunten"
                points={activeStepExactPoints}
                onSelectPoint={(point) => {
                  const locationSlug = getEntityPointLocationSlug(point);
                  if (locationSlug) setActiveLocationSlug(locationSlug);
                }}
              />
              <RelatedList title="Items" records={relatedItems} />
              <RelatedList title="Quests" records={relatedQuests} />
              <RelatedList title="NPCs" records={relatedNpcs} />
              <RelatedList title="Vocations" records={relatedVocations} />
            </>
          )}
        </section>

        <section className="panel">
          <h2>Databrowser</h2>
          <BrowserTabs
            activeTab={activeBrowserTab}
            onChange={setActiveBrowserTab}
          />
          <ContentBrowser
            title={browserContent.title}
            records={browserContent.records}
            type={browserContent.type}
            locationsBySlug={locationsBySlug}
            onSelectLocation={setActiveLocationSlug}
          />
        </section>
      </aside>

      <main className="map-section">
        <MapContainer
          crs={CRS.Simple}
          bounds={DD2_MAP_BOUNDS}
          maxBounds={DD2_MAP_BOUNDS}
          minZoom={-2}
          maxZoom={4}
          className="dd2-map"
        >
          <ImageOverlay url={DD2_MAP_IMAGE_URL} bounds={DD2_MAP_BOUNDS} />
          <FitMapToMarkers locations={markerLocations} />
          <FlyToPoint point={activeStepFocusPoint} />
          {mapLayers.route && (
            <RoutePolyline
              routes={opRoutes}
              locationsBySlug={locationsBySlug}
              routeNetwork={routeNetwork}
            />
          )}
          <CalibrationClickCapture
            enabled={calibrationMode}
            onPick={setLastCalibrationPoint}
          />

          {(mapLayers.locations || calibrationMode) && markerLocations.map((location) => {
            const x = toNumber(location.world_x);
            const y = toNumber(location.world_y);
            if (x === null || y === null) return null;
            const locationSlug = getLocationSlug(location);
            const isActive =
              locationSlug !== null && locationSlug === activeLocationSlug;
            const linkedItems = locationSlug
              ? getRecordsLinkedToLocation(itemBrowserRecords, locationSlug, locationsBySlug, 5)
              : [];
            const linkedQuests = locationSlug
              ? getRecordsLinkedToLocation(questBrowserRecords, locationSlug, locationsBySlug, 5)
              : [];
            const linkedNpcs = locationSlug
              ? getRecordsLinkedToLocation(contentData.npcs, locationSlug, locationsBySlug, 5)
              : [];
            const linkedVendors = locationSlug
              ? getRecordsLinkedToLocation(contentData.vendors, locationSlug, locationsBySlug, 5)
              : [];
            const linkedVocations = locationSlug
              ? getRecordsLinkedToLocation(contentData.vocations, locationSlug, locationsBySlug, 5)
              : [];
            const linkedRouteSteps = locationSlug
              ? getRouteStepsLinkedToLocation(allRouteSteps, locationSlug, locationsBySlug, 5)
              : [];
            return (
              <Marker
                key={locationSlug ?? String(location.id ?? location.name)}
                position={[y, x]}
                icon={isActive ? dd2ActiveLocationIcon : dd2LocationIcon}
                draggable={calibrationMode}
                eventHandlers={{
                  click: () => {
                    if (locationSlug) setActiveLocationSlug(locationSlug);
                  },
                  dragend: (event) => {
                    if (!calibrationMode) return;
                    const marker = event.target as L.Marker;
                    const latLng = marker.getLatLng();
                    recordCalibrationCorrection(location, {
                      x: Math.round(latLng.lng),
                      y: Math.round(latLng.lat),
                    });
                  },
                }}
              >
                <Popup className="dd2-rich-popup">
                  <strong>{location.name ?? location.slug}</strong>
                  {location.region && <p>{location.region}</p>}
                  {location.description && <p>{location.description}</p>}
                  {location.notes && <p className="popup-muted">{location.notes}</p>}
                  <p className="popup-coordinates">
                    x: {x}, y: {y}
                  </p>
                  <PopupLinkedSection
                    title="Route-stappen"
                    records={linkedRouteSteps.map((step) => ({
                      title: `${Number.isFinite(getStepOrder(step)) ? getStepOrder(step) : "-"} · ${getStepTitle(step)}`,
                      subtitle: step.description,
                    }))}
                  />
                  <PopupLinkedSection
                    title="Items"
                    records={linkedItems.map((record) => ({
                      title: getRecordTitle(record),
                      subtitle: getRecordSubtitle(record),
                    }))}
                  />
                  <PopupLinkedSection
                    title="Quests"
                    records={linkedQuests.map((record) => ({
                      title: getRecordTitle(record),
                      subtitle: getRecordSubtitle(record),
                    }))}
                  />
                  <PopupLinkedSection
                    title="NPCs"
                    records={linkedNpcs.map((record) => ({
                      title: getRecordTitle(record),
                      subtitle: getRecordSubtitle(record),
                    }))}
                  />
                  <PopupLinkedSection
                    title="Vendors"
                    records={linkedVendors.map((record) => ({
                      title: getRecordTitle(record),
                      subtitle: getRecordSubtitle(record),
                    }))}
                  />
                  <PopupLinkedSection
                    title="Vocations"
                    records={linkedVocations.map((record) => ({
                      title: getRecordTitle(record),
                      subtitle: getRecordSubtitle(record),
                    }))}
                  />
                  {calibrationMode && (
                    <p className="popup-muted">
                      Kalibratiemodus actief: sleep deze marker naar de juiste plek om een correctiepunt te maken.
                    </p>
                  )}
                </Popup>
              </Marker>
            );
          })}

          {entityMarkers
            .filter((marker) => mapLayers[marker.layer])
            .map((marker) => {
              const isActive = marker.locationSlug === activeLocationSlug;
              return (
                <Marker
                  key={marker.id}
                  position={getEntityMarkerPosition(marker)}
                  icon={isActive ? dd2EntityActiveIcons[marker.layer] : dd2EntityIcons[marker.layer]}
                  zIndexOffset={isActive ? 900 : 300}
                  eventHandlers={{
                    click: () => {
                      setActiveLocationSlug(marker.locationSlug);
                      setActiveBrowserTab(marker.layer);
                    },
                  }}
                >
                  <Popup className="dd2-rich-popup">
                    <span className={`popup-layer-badge popup-layer-badge-${marker.layer}`}>
                      {getEntityLayerLabel(marker.layer)}
                    </span>
                    <strong>{marker.title}</strong>
                    {marker.subtitle && <p>{marker.subtitle}</p>}
                    {marker.point && (
                      <p className="popup-muted">
                        Exact punt: {getEntityPointTitle(marker.point)}
                      </p>
                    )}
                    {marker.location && (
                      <p className="popup-muted">
                        Locatie: {getLocationName(marker.location)}
                      </p>
                    )}
                    <p className="popup-coordinates">
                      x: {marker.pointX}, y: {marker.pointY}
                    </p>
                  </Popup>
                </Marker>
              );
            })}

          {mapLayers.exact_points && exactPointMarkers.map((marker) => (
            <Marker
              key={`exact-point-${marker.id}`}
              position={getExactPointMarkerPosition(marker)}
              icon={dd2ExactPointIcon}
              zIndexOffset={850}
              eventHandlers={{
                click: () => {
                  if (marker.locationSlug) setActiveLocationSlug(marker.locationSlug);
                  const type = getEntityPointEntityType(marker.point);
                  if (type === "route_step") {
                    const stepKey = normalizeKey(marker.point.step_key) ?? getEntityPointEntityKey(marker.point);
                    if (stepKey) setActiveStepSlug(stepKey);
                  }
                  setActiveBrowserTab("exact_points");
                },
              }}
            >
              <Popup className="dd2-rich-popup">
                <span className="popup-layer-badge popup-layer-badge-exact_points">Exact punt</span>
                <strong>{marker.title}</strong>
                {marker.subtitle && <p>{marker.subtitle}</p>}
                {marker.location && <p className="popup-muted">Locatie: {getLocationName(marker.location)}</p>}
                <p className="popup-coordinates">x: {marker.pointX}, y: {marker.pointY}</p>
              </Popup>
            </Marker>
          ))}

          {mapLayers.calibration && calibrationCorrections.map((correction) => (
            <Marker
              key={`calibration-${correction.location_key}`}
              position={[correction.corrected_y, correction.corrected_x]}
              icon={dd2CalibrationIcon}
              zIndexOffset={1000}
            >
              <Popup className="dd2-rich-popup">
                <span className="popup-layer-badge popup-layer-badge-calibration">Kalibratie</span>
                <strong>{correction.name}</strong>
                <p className="popup-muted">{correction.notes}</p>
                <p className="popup-coordinates">
                  oud: x {correction.old_x}, y {correction.old_y}<br />
                  nieuw: x {correction.corrected_x}, y {correction.corrected_y}
                </p>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </main>
    </div>
  );
}

export default App;
