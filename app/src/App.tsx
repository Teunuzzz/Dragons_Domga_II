import { useEffect, useMemo, useState } from 'react'
import { ImageOverlay, MapContainer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L, { CRS } from 'leaflet'
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet'
import './App.css'

const dd2LocationIcon = L.divIcon({
  className: 'dd2-location-marker',
  html: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
})

const dd2ActiveLocationIcon = L.divIcon({
  className: 'dd2-location-marker dd2-location-marker-active',
  html: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -14],
})

const DD2_MAP_IMAGE_URL = '/maps/world-map.png'
const DD2_MAP_BOUNDS: [[number, number], [number, number]] = [
  [0, 0],
  [2048, 1757],
]

type JsonRecord = Record<string, unknown>

type Location = {
  id?: number | string
  slug?: string
  location_slug?: string
  location_key?: string
  name?: string
  region?: string
  world_x?: number | string | null
  world_y?: number | string | null
  description?: string | null
}

type RouteStep = {
  id?: number | string
  slug?: string
  step_slug?: string
  step_key?: string
  title?: string
  name?: string
  description?: string | null
  step_order?: number | string
  order?: number | string
  sort_order?: number | string
  location_key?: string | null
  location_slug?: string | null
  map_anchor_key?: string | null
  map_anchor_slug?: string | null
  anchor_slug?: string | null
  world_x?: number | string | null
  world_y?: number | string | null
}

type OpRoute = {
  id?: number | string
  slug?: string
  route_slug?: string
  route_key?: string
  title?: string
  name?: string
  profile_slug?: string
  profile?: string
  vocation?: string | null
  steps?: RouteStep[]
}

type RouteNetworkNode = {
  node_id?: number | string
  node_key: string
  name?: string
  region_key?: string | null
  world_x?: number | string | null
  world_y?: number | string | null
  node_type?: string
  danger_level?: number | string
}

type RouteNetworkEdge = {
  edge_id?: number | string
  edge_key?: string
  from_node_key: string
  to_node_key: string
  distance_score?: number | string
  danger_level?: number | string
  road_type?: string
  bidirectional?: number | string | boolean
}

type RouteNetwork = {
  nodes: RouteNetworkNode[]
  edges: RouteNetworkEdge[]
}

type ContentData = {
  items: JsonRecord[]
  quests: JsonRecord[]
  locationItems: JsonRecord[]
  walkthroughsRaw: unknown
  walkthroughRecords: JsonRecord[]
  itemDetails: JsonRecord[]
  questDetails: JsonRecord[]
  npcs: JsonRecord[]
  vendors: JsonRecord[]
  vocations: JsonRecord[]
  gameFlags: JsonRecord[]
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function getText(record: JsonRecord | undefined | null, keys: string[]): string | null {
  if (!record) return null
  for (const key of keys) {
    const value = record[key]
    if (value !== null && value !== undefined && value !== '') return String(value)
  }
  return null
}

function normalizeKey(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized.length > 0 ? normalized : null
}

function normalizeRecords(data: unknown, preferredKeys: string[]): JsonRecord[] {
  if (Array.isArray(data)) return data.filter(isRecord)
  if (isRecord(data)) {
    for (const key of preferredKeys) {
      const value = data[key]
      if (Array.isArray(value)) return value.filter(isRecord)
    }
  }
  return []
}

function flattenRecords(value: unknown, result: JsonRecord[] = []): JsonRecord[] {
  if (Array.isArray(value)) {
    value.forEach((item) => flattenRecords(item, result))
    return result
  }
  if (isRecord(value)) {
    result.push(value)
    Object.values(value).forEach((item) => flattenRecords(item, result))
  }
  return result
}

function normalizeLocations(data: unknown): Location[] {
  return normalizeRecords(data, ['locations']) as Location[]
}

function normalizeOpRoutes(data: unknown): OpRoute[] {
  return normalizeRecords(data, ['op_routes', 'routes']) as OpRoute[]
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
    }
  }
  return { nodes: [], edges: [] }
}

function getStepOrder(step: RouteStep): number {
  return (
    toNumber(step.step_order) ??
    toNumber(step.order) ??
    toNumber(step.sort_order) ??
    Number.POSITIVE_INFINITY
  )
}

function getRouteTitle(route: OpRoute): string {
  return route.title ?? route.name ?? route.slug ?? route.route_slug ?? 'Naamloze route'
}

function getStepTitle(step: RouteStep): string {
  return step.title ?? step.name ?? step.slug ?? step.step_slug ?? 'Naamloze stap'
}

function getStepSlug(step: RouteStep): string {
  return (
    normalizeKey(step.step_key) ??
    normalizeKey(step.slug) ??
    normalizeKey(step.step_slug) ??
    normalizeKey(step.title) ??
    normalizeKey(step.name) ??
    ''
  )
}

function getStepLocationSlug(step: RouteStep): string | null {
  return (
    normalizeKey(step.location_key) ??
    normalizeKey(step.location_slug) ??
    normalizeKey(step.map_anchor_key) ??
    normalizeKey(step.map_anchor_slug) ??
    normalizeKey(step.anchor_slug) ??
    null
  )
}

function getLocationSlug(location: Location): string | null {
  return (
    normalizeKey(location.location_key) ??
    normalizeKey(location.slug) ??
    normalizeKey(location.location_slug) ??
    normalizeKey(location.name) ??
    normalizeKey(location.id)
  )
}

function getLocationAliases(location: Location): string[] {
  const aliases = [
    normalizeKey(location.location_key),
    normalizeKey(location.slug),
    normalizeKey(location.location_slug),
    normalizeKey(location.name),
    normalizeKey(location.id),
  ].filter((value): value is string => value !== null)
  return Array.from(new Set(aliases))
}

function resolveStepLocationSlug(
  step: RouteStep,
  locationsBySlug: Map<string, Location>,
): string | null {
  const directSlug = normalizeKey(getStepLocationSlug(step))
  if (directSlug && locationsBySlug.has(directSlug)) return directSlug

  const stepSlug = getStepSlug(step)
  const stepTitle = normalizeKey(getStepTitle(step)) ?? ''
  const candidates = Array.from(locationsBySlug.keys())
  const searchText = [stepSlug, stepTitle].filter(Boolean).join(' ')
  if (searchText.length === 0) return null

  const matchedByLocationName = candidates.find((locationSlug) => searchText.includes(locationSlug))
  if (matchedByLocationName) return matchedByLocationName

  const matchedByPartialName = candidates.find((locationSlug) => {
    const locationWords = locationSlug.split('_').filter((word) => word.length >= 4)
    return locationWords.some((word) => searchText.includes(word))
  })
  if (matchedByPartialName) return matchedByPartialName

  if (searchText.includes('borderwatch')) return candidates.find((slug) => slug.includes('borderwatch')) ?? null
  if (searchText.includes('melve')) return candidates.find((slug) => slug.includes('melve')) ?? null
  if (searchText.includes('vernworth')) return candidates.find((slug) => slug.includes('vernworth')) ?? null
  if (searchText.includes('trevo')) return candidates.find((slug) => slug.includes('trevo')) ?? null

  return null
}

function getRecordKey(record: JsonRecord, type: 'item' | 'quest' | 'npc' | 'vocation' | 'flag' | 'vendor'): string | null {
  return (
    normalizeKey(record[`${type}_key`]) ??
    normalizeKey(record[`${type}_slug`]) ??
    normalizeKey(record.key) ??
    normalizeKey(record.slug) ??
    normalizeKey(record.name) ??
    normalizeKey(record.title) ??
    null
  )
}

function getRecordTitle(record: JsonRecord): string {
  return getText(record, [
    'title',
    'name',
    'label',
    'checklist_text',
    'requirement_text',
    'reward_text',
    'objective_text',
    'stage_title',
    'choice_label',
    'description',
    'slug',
    'key',
    'item_key',
    'quest_key',
    'npc_key',
    'vocation_key',
    'flag_key',
  ]) ?? 'Onbekend'
}

function getRecordSubtitle(record: JsonRecord): string | null {
  return getText(record, [
    'description',
    'notes',
    'summary',
    'effect',
    'reward_text',
    'requirement_text',
    'objective_text',
    'source_note',
    'location_key',
    'category',
    'type',
    'source_key',
  ])
}

function hasKeyContaining(record: JsonRecord, parts: string[]): boolean {
  return Object.keys(record).some((key) => {
    const normalized = normalizeKey(key) ?? ''
    return parts.some((part) => normalized.includes(part))
  })
}

function recordReferencesStep(record: JsonRecord, stepSlug: string): boolean {
  const normalizedStepSlug = normalizeKey(stepSlug)
  if (!normalizedStepSlug) return false

  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = normalizeKey(key) ?? ''
    if (!normalizedKey.includes('step')) continue
    if (normalizeKey(value) === normalizedStepSlug) return true
  }

  return (
    normalizeKey(record.step_key) === normalizedStepSlug ||
    normalizeKey(record.step_slug) === normalizedStepSlug ||
    normalizeKey(record.slug) === normalizedStepSlug
  )
}

function findStepRecords(raw: unknown, stepSlug: string): JsonRecord[] {
  const records = flattenRecords(raw)
  const unique = new Map<string, JsonRecord>()
  records.forEach((record, index) => {
    if (recordReferencesStep(record, stepSlug)) {
      unique.set(JSON.stringify(record).slice(0, 300) + index, record)
    }
  })
  return Array.from(unique.values())
}

function collectLinkedKeys(records: JsonRecord[], entity: 'item' | 'quest' | 'npc' | 'vocation' | 'flag' | 'vendor'): Set<string> {
  const linkedKeys = new Set<string>()
  const allRecords = flattenRecords(records)
  allRecords.forEach((record) => {
    Object.entries(record).forEach(([key, value]) => {
      const normalizedKey = normalizeKey(key) ?? ''
      if (!normalizedKey.includes(entity)) return
      if (!normalizedKey.endsWith('key') && !normalizedKey.endsWith('slug')) return
      const normalizedValue = normalizeKey(value)
      if (normalizedValue) linkedKeys.add(normalizedValue)
    })
  })
  return linkedKeys
}

function findRecordsByKeys(records: JsonRecord[], type: 'item' | 'quest' | 'npc' | 'vocation' | 'flag' | 'vendor', keys: Set<string>): JsonRecord[] {
  if (keys.size === 0) return []
  return records.filter((record) => {
    const recordKey = getRecordKey(record, type)
    return recordKey !== null && keys.has(recordKey)
  })
}

function uniqueRecords(records: JsonRecord[], maxCount = 12): JsonRecord[] {
  const seen = new Set<string>()
  const result: JsonRecord[] = []
  for (const record of records) {
    const fingerprint = [getRecordTitle(record), getRecordSubtitle(record), JSON.stringify(record).slice(0, 120)].join('|')
    if (seen.has(fingerprint)) continue
    seen.add(fingerprint)
    result.push(record)
    if (result.length >= maxCount) break
  }
  return result
}

function getRelatedCategory(records: JsonRecord[], category: 'checklist' | 'requirement' | 'reward' | 'item' | 'quest' | 'location'): JsonRecord[] {
  const termsByCategory: Record<typeof category, string[]> = {
    checklist: ['checklist'],
    requirement: ['requirement', 'requires'],
    reward: ['reward'],
    item: ['item'],
    quest: ['quest'],
    location: ['location'],
  }
  return uniqueRecords(records.filter((record) => hasKeyContaining(record, termsByCategory[category])))
}

async function fetchJsonRequired(path: string): Promise<unknown> {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`Kon ${path} niet laden: ${response.status}`)
  return response.json()
}

async function fetchJsonOptional(path: string): Promise<unknown> {
  const response = await fetch(path)
  if (!response.ok) return null
  return response.json()
}

function FitMapToMarkers({ locations }: { locations: Location[] }) {
  const map = useMap()

  useEffect(() => {
    const points = locations
      .map((location) => {
        const x = toNumber(location.world_x)
        const y = toNumber(location.world_y)
        if (x === null || y === null) return null
        return [y, x] as [number, number]
      })
      .filter((point): point is [number, number] => point !== null)

    if (points.length === 0) return
    const bounds: LatLngBoundsExpression = points
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 2 })
  }, [locations, map])

  return null
}

function FlyToActiveLocation({ location }: { location: Location | null }) {
  const map = useMap()

  useEffect(() => {
    if (!location) return
    const x = toNumber(location.world_x)
    const y = toNumber(location.world_y)
    if (x === null || y === null) return
    map.flyTo([y, x], 2, { duration: 0.6 })
  }, [location, map])

  return null
}

function isEdgeBidirectional(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true'
  return true
}

function findRouteNetworkPath(fromNodeKey: string, toNodeKey: string, routeNetwork: RouteNetwork): string[] {
  if (fromNodeKey === toNodeKey) return [fromNodeKey]

  const nodeKeys = new Set(routeNetwork.nodes.map((node) => node.node_key))
  if (!nodeKeys.has(fromNodeKey) || !nodeKeys.has(toNodeKey)) return []

  const graph = new Map<string, { to: string; cost: number }[]>()
  for (const node of routeNetwork.nodes) graph.set(node.node_key, [])

  for (const edge of routeNetwork.edges) {
    const cost = toNumber(edge.distance_score) ?? 1
    graph.get(edge.from_node_key)?.push({ to: edge.to_node_key, cost })
    if (isEdgeBidirectional(edge.bidirectional)) {
      graph.get(edge.to_node_key)?.push({ to: edge.from_node_key, cost })
    }
  }

  const distances = new Map<string, number>()
  const previous = new Map<string, string | null>()
  const unvisited = new Set(nodeKeys)

  for (const nodeKey of nodeKeys) {
    distances.set(nodeKey, Number.POSITIVE_INFINITY)
    previous.set(nodeKey, null)
  }
  distances.set(fromNodeKey, 0)

  while (unvisited.size > 0) {
    let currentNode: string | null = null
    let currentDistance = Number.POSITIVE_INFINITY

    for (const nodeKey of unvisited) {
      const distance = distances.get(nodeKey) ?? Number.POSITIVE_INFINITY
      if (distance < currentDistance) {
        currentDistance = distance
        currentNode = nodeKey
      }
    }

    if (currentNode === null) break
    if (currentNode === toNodeKey) break
    unvisited.delete(currentNode)

    for (const neighbor of graph.get(currentNode) ?? []) {
      if (!unvisited.has(neighbor.to)) continue
      const nextDistance = currentDistance + neighbor.cost
      if (nextDistance < (distances.get(neighbor.to) ?? Number.POSITIVE_INFINITY)) {
        distances.set(neighbor.to, nextDistance)
        previous.set(neighbor.to, currentNode)
      }
    }
  }

  const path: string[] = []
  let current: string | null = toNodeKey
  while (current !== null) {
    path.unshift(current)
    current = previous.get(current) ?? null
  }

  return path[0] === fromNodeKey ? path : []
}

function RoutePolyline({ routes, locationsBySlug, routeNetwork }: { routes: OpRoute[]; locationsBySlug: Map<string, Location>; routeNetwork: RouteNetwork }) {
  const routePoints = useMemo(() => {
    const firstRoute = routes[0]
    if (!firstRoute?.steps) return []

    const networkNodesByKey = new Map(routeNetwork.nodes.map((node) => [node.node_key, node]))
    const steps = [...firstRoute.steps].sort((a, b) => getStepOrder(a) - getStepOrder(b))
    const stepNodeKeys: string[] = []

    for (const step of steps) {
      const stepLocationSlug = resolveStepLocationSlug(step, locationsBySlug)
      if (!stepLocationSlug) continue
      const previousNodeKey = stepNodeKeys[stepNodeKeys.length - 1]
      if (previousNodeKey === stepLocationSlug) continue
      stepNodeKeys.push(stepLocationSlug)
    }

    if (stepNodeKeys.length < 2) return []

    const networkPathNodeKeys: string[] = []
    for (let index = 0; index < stepNodeKeys.length - 1; index += 1) {
      const fromNodeKey = stepNodeKeys[index]
      const toNodeKey = stepNodeKeys[index + 1]
      const pathSegment = findRouteNetworkPath(fromNodeKey, toNodeKey, routeNetwork)

      if (pathSegment.length > 0) {
        const segmentToAdd = networkPathNodeKeys.length > 0 && networkPathNodeKeys[networkPathNodeKeys.length - 1] === pathSegment[0]
          ? pathSegment.slice(1)
          : pathSegment
        networkPathNodeKeys.push(...segmentToAdd)
      } else {
        if (networkPathNodeKeys.length === 0 || networkPathNodeKeys[networkPathNodeKeys.length - 1] !== fromNodeKey) {
          networkPathNodeKeys.push(fromNodeKey)
        }
        networkPathNodeKeys.push(toNodeKey)
      }
    }

    const points: LatLngExpression[] = []
    for (const nodeKey of networkPathNodeKeys) {
      const networkNode = networkNodesByKey.get(nodeKey)
      const fallbackLocation = locationsBySlug.get(nodeKey)
      const x = toNumber(networkNode?.world_x ?? fallbackLocation?.world_x)
      const y = toNumber(networkNode?.world_y ?? fallbackLocation?.world_y)
      if (x === null || y === null) continue
      points.push([y, x])
    }

    return points
  }, [routes, locationsBySlug, routeNetwork])

  if (routePoints.length < 2) return null
  return <Polyline positions={routePoints} className="dd2-route-polyline" />
}

function RelatedList({ title, records, emptyText }: { title: string; records: JsonRecord[]; emptyText?: string }) {
  return (
    <section className="detail-section">
      <h4>{title}</h4>
      {records.length === 0 ? (
        <p className="muted">{emptyText ?? 'Nog geen gekoppelde data voor deze stap.'}</p>
      ) : (
        <ul className="detail-list">
          {records.map((record, index) => (
            <li key={`${title}-${index}`}>
              <strong>{getRecordTitle(record)}</strong>
              {getRecordSubtitle(record) && <small>{getRecordSubtitle(record)}</small>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ContentBrowser({ title, records, type }: { title: string; records: JsonRecord[]; type: 'item' | 'quest' | 'npc' | 'vocation' | 'vendor' | 'flag' }) {
  return (
    <details className="browser-section">
      <summary>{title} <span>{records.length}</span></summary>
      <ul className="compact-list">
        {records.slice(0, 20).map((record, index) => (
          <li key={`${type}-${getRecordKey(record, type) ?? index}`}>
            <strong>{getRecordTitle(record)}</strong>
            {getRecordSubtitle(record) && <small>{getRecordSubtitle(record)}</small>}
          </li>
        ))}
      </ul>
      {records.length > 20 && <p className="muted">+ {records.length - 20} extra records niet getoond in deze preview.</p>}
    </details>
  )
}

function App() {
  const [locations, setLocations] = useState<Location[]>([])
  const [opRoutes, setOpRoutes] = useState<OpRoute[]>([])
  const [routeNetwork, setRouteNetwork] = useState<RouteNetwork>({ nodes: [], edges: [] })
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
  })
  const [activeLocationSlug, setActiveLocationSlug] = useState<string | null>(null)
  const [activeStepSlug, setActiveStepSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        ] = await Promise.all([
          fetchJsonRequired('/data/locations.json'),
          fetchJsonRequired('/data/op_routes.json'),
          fetchJsonRequired('/data/route_network.json'),
          fetchJsonOptional('/data/items.json'),
          fetchJsonOptional('/data/quests.json'),
          fetchJsonOptional('/data/location_items.json'),
          fetchJsonOptional('/data/walkthroughs.json'),
          fetchJsonOptional('/data/item_details.json'),
          fetchJsonOptional('/data/quest_details.json'),
          fetchJsonOptional('/data/npcs.json'),
          fetchJsonOptional('/data/vendors.json'),
          fetchJsonOptional('/data/vocations.json'),
          fetchJsonOptional('/data/game_flags.json'),
        ])

        setLocations(normalizeLocations(locationsJson))
        setOpRoutes(normalizeOpRoutes(routesJson))
        setRouteNetwork(normalizeRouteNetwork(routeNetworkJson))
        setContentData({
          items: normalizeRecords(itemsJson, ['items']),
          quests: normalizeRecords(questsJson, ['quests']),
          locationItems: normalizeRecords(locationItemsJson, ['location_items']),
          walkthroughsRaw: walkthroughsJson,
          walkthroughRecords: flattenRecords(walkthroughsJson),
          itemDetails: normalizeRecords(itemDetailsJson, ['item_details', 'items']),
          questDetails: normalizeRecords(questDetailsJson, ['quest_details', 'quests']),
          npcs: normalizeRecords(npcsJson, ['npcs']),
          vendors: normalizeRecords(vendorsJson, ['vendors']),
          vocations: normalizeRecords(vocationsJson, ['vocations']),
          gameFlags: normalizeRecords(gameFlagsJson, ['game_flags', 'flags']),
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Onbekende fout')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const markerLocations = useMemo(() => {
    return locations.filter((location) => toNumber(location.world_x) !== null && toNumber(location.world_y) !== null)
  }, [locations])

  const locationsBySlug = useMemo(() => {
    const map = new Map<string, Location>()
    markerLocations.forEach((location) => {
      getLocationAliases(location).forEach((alias) => map.set(alias, location))
    })
    return map
  }, [markerLocations])

  const activeLocation = activeLocationSlug ? locationsBySlug.get(activeLocationSlug) ?? null : null

  const allRouteSteps = useMemo(() => {
    return opRoutes.flatMap((route) => route.steps ?? [])
  }, [opRoutes])

  const activeStep = useMemo(() => {
    if (!activeStepSlug) return null
    return allRouteSteps.find((step) => getStepSlug(step) === activeStepSlug) ?? null
  }, [activeStepSlug, allRouteSteps])

  const activeStepRecords = useMemo(() => {
    if (!activeStepSlug) return []
    return findStepRecords(contentData.walkthroughsRaw, activeStepSlug)
  }, [activeStepSlug, contentData.walkthroughsRaw])

  const relatedItems = useMemo(() => {
    const keys = collectLinkedKeys(activeStepRecords, 'item')
    return uniqueRecords([
      ...findRecordsByKeys(contentData.items, 'item', keys),
      ...findRecordsByKeys(contentData.itemDetails, 'item', keys),
    ])
  }, [activeStepRecords, contentData.items, contentData.itemDetails])

  const relatedQuests = useMemo(() => {
    const keys = collectLinkedKeys(activeStepRecords, 'quest')
    return uniqueRecords([
      ...findRecordsByKeys(contentData.quests, 'quest', keys),
      ...findRecordsByKeys(contentData.questDetails, 'quest', keys),
    ])
  }, [activeStepRecords, contentData.quests, contentData.questDetails])

  const relatedNpcs = useMemo(() => {
    const keys = collectLinkedKeys(activeStepRecords, 'npc')
    return uniqueRecords(findRecordsByKeys(contentData.npcs, 'npc', keys))
  }, [activeStepRecords, contentData.npcs])

  const relatedVocations = useMemo(() => {
    const keys = collectLinkedKeys(activeStepRecords, 'vocation')
    return uniqueRecords(findRecordsByKeys(contentData.vocations, 'vocation', keys))
  }, [activeStepRecords, contentData.vocations])

  const checklistRecords = getRelatedCategory(activeStepRecords, 'checklist')
  const requirementRecords = getRelatedCategory(activeStepRecords, 'requirement')
  const rewardRecords = getRelatedCategory(activeStepRecords, 'reward')

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
            <div className="data-grid">
              <span>Locaties <strong>{locations.length}</strong></span>
              <span>Items <strong>{contentData.items.length}</strong></span>
              <span>Quests <strong>{contentData.quests.length}</strong></span>
              <span>NPCs <strong>{contentData.npcs.length}</strong></span>
              <span>Vendors <strong>{contentData.vendors.length}</strong></span>
              <span>Vocations <strong>{contentData.vocations.length}</strong></span>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Locations</h2>
          {!loading && !error && (
            <>
              <p>{locations.length} locaties geladen.</p>
              <p>{markerLocations.length} locaties met kaartcoördinaten.</p>
              <ul className="location-list">
                {locations.map((location) => {
                  const locationSlug = getLocationSlug(location)
                  const isActive = locationSlug !== null && locationSlug === activeLocationSlug
                  return (
                    <li
                      key={locationSlug ?? String(location.id ?? location.name)}
                      className={`location-list-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        if (locationSlug) setActiveLocationSlug(locationSlug)
                      }}
                    >
                      <strong>{location.name ?? location.slug}</strong>
                      {location.region && <span>{location.region}</span>}
                    </li>
                  )
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
                  const steps = [...(route.steps ?? [])].sort((a, b) => getStepOrder(a) - getStepOrder(b))
                  const routeMeta = [route.profile_slug ?? route.profile, route.vocation].filter(Boolean).join(' · ')
                  return (
                    <article key={route.slug ?? route.route_slug ?? route.title} className="route-card">
                      <h3>{getRouteTitle(route)}</h3>
                      {routeMeta && <p className="muted">{routeMeta}</p>}
                      <ul className="step-list">
                        {steps.map((step) => {
                          const stepSlug = getStepSlug(step)
                          const stepLocationSlug = resolveStepLocationSlug(step, locationsBySlug)
                          const isActive = stepSlug === activeStepSlug
                          return (
                            <li key={stepSlug}>
                              <button
                                type="button"
                                className={`step-button ${isActive ? 'active' : ''}`}
                                onClick={() => {
                                  setActiveStepSlug(stepSlug)
                                  if (stepLocationSlug) setActiveLocationSlug(stepLocationSlug)
                                }}
                              >
                                <span className="step-order">{Number.isFinite(getStepOrder(step)) ? getStepOrder(step) : '-'}</span>
                                <span className="step-content">
                                  <strong>{getStepTitle(step)}</strong>
                                  {stepLocationSlug && <small>{stepLocationSlug}</small>}
                                  {step.description && <small>{step.description}</small>}
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </article>
                  )
                })}
              </div>
            </>
          )}
        </section>

        <section className="panel detail-panel">
          <h2>Route-stap details</h2>
          {!activeStep ? (
            <p className="muted">Klik links op een route-stap om checklist, rewards, requirements, items en quests te zien.</p>
          ) : (
            <>
              <h3>{getStepTitle(activeStep)}</h3>
              {activeStep.description && <p>{activeStep.description}</p>}
              <p className="muted">{activeStepRecords.length} gekoppelde walkthrough-records gevonden.</p>
              <RelatedList title="Checklist" records={checklistRecords} />
              <RelatedList title="Requirements" records={requirementRecords} />
              <RelatedList title="Rewards" records={rewardRecords} />
              <RelatedList title="Items" records={relatedItems} />
              <RelatedList title="Quests" records={relatedQuests} />
              <RelatedList title="NPCs" records={relatedNpcs} />
              <RelatedList title="Vocations" records={relatedVocations} />
            </>
          )}
        </section>

        <section className="panel">
          <h2>Databrowser</h2>
          <ContentBrowser title="Items" records={contentData.items} type="item" />
          <ContentBrowser title="Quests" records={contentData.quests} type="quest" />
          <ContentBrowser title="NPCs" records={contentData.npcs} type="npc" />
          <ContentBrowser title="Vendors" records={contentData.vendors} type="vendor" />
          <ContentBrowser title="Vocations" records={contentData.vocations} type="vocation" />
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
          <FlyToActiveLocation location={activeLocation} />
          <RoutePolyline routes={opRoutes} locationsBySlug={locationsBySlug} routeNetwork={routeNetwork} />

          {markerLocations.map((location) => {
            const x = toNumber(location.world_x)
            const y = toNumber(location.world_y)
            if (x === null || y === null) return null
            const locationSlug = getLocationSlug(location)
            const isActive = locationSlug !== null && locationSlug === activeLocationSlug
            return (
              <Marker
                key={locationSlug ?? String(location.id ?? location.name)}
                position={[y, x]}
                icon={isActive ? dd2ActiveLocationIcon : dd2LocationIcon}
                eventHandlers={{
                  click: () => {
                    if (locationSlug) setActiveLocationSlug(locationSlug)
                  },
                }}
              >
                <Popup>
                  <strong>{location.name ?? location.slug}</strong>
                  {location.region && <p>{location.region}</p>}
                  {location.description && <p>{location.description}</p>}
                  <p>x: {x}, y: {y}</p>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </main>
    </div>
  )
}

export default App
