import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, useMap } from 'react-leaflet'
import L, { CRS } from 'leaflet'
import type { LatLngBoundsExpression } from 'leaflet'
import './App.css'

const dd2LocationIcon = L.divIcon({
  className: 'dd2-location-marker',
  html: '<span></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
})

const dd2ActiveLocationIcon = L.divIcon({
  className: 'dd2-location-marker dd2-location-marker-active',
  html: '<span></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -14],
})

type Location = {
  id?: number | string
  slug?: string
  location_slug?: string
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
  title?: string
  name?: string
  profile_slug?: string
  profile?: string
  vocation?: string | null
  steps?: RouteStep[]
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function normalizeLocations(data: unknown): Location[] {
  if (Array.isArray(data)) return data as Location[]

  if (
    typeof data === 'object' &&
    data !== null &&
    'locations' in data &&
    Array.isArray((data as { locations: unknown }).locations)
  ) {
    return (data as { locations: Location[] }).locations
  }

  return []
}

function normalizeOpRoutes(data: unknown): OpRoute[] {
  if (Array.isArray(data)) return data as OpRoute[]

  if (
    typeof data === 'object' &&
    data !== null &&
    'op_routes' in data &&
    Array.isArray((data as { op_routes: unknown }).op_routes)
  ) {
    return (data as { op_routes: OpRoute[] }).op_routes
  }

  if (
    typeof data === 'object' &&
    data !== null &&
    'routes' in data &&
    Array.isArray((data as { routes: unknown }).routes)
  ) {
    return (data as { routes: OpRoute[] }).routes
  }

  return []
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

function resolveStepLocationSlug(
  step: RouteStep,
  locationsBySlug: Map<string, Location>,
): string | null {
  const directSlug = normalizeKey(getStepLocationSlug(step))

  if (directSlug && locationsBySlug.has(directSlug)) {
    return directSlug
  }

  const stepSlug = getStepSlug(step)
  const stepTitle = normalizeKey(getStepTitle(step)) ?? ''
  const candidates = Array.from(locationsBySlug.keys())

  const searchText = [stepSlug, stepTitle].filter(Boolean).join(' ')

  if (searchText.length === 0) {
    return null
  }

  const matchedByLocationName = candidates.find((locationSlug) => {
    return searchText.includes(locationSlug)
  })

  if (matchedByLocationName) return matchedByLocationName

  const matchedByPartialName = candidates.find((locationSlug) => {
    const locationWords = locationSlug.split('_').filter((word) => word.length >= 4)

    return locationWords.some((word) => searchText.includes(word))
  })

  if (matchedByPartialName) return matchedByPartialName

  if (searchText.includes('borderwatch')) {
    return candidates.find((slug) => slug.includes('borderwatch')) ?? null
  }

  if (searchText.includes('melve')) {
    return candidates.find((slug) => slug.includes('melve')) ?? null
  }

  if (searchText.includes('vernworth')) {
    return candidates.find((slug) => slug.includes('vernworth')) ?? null
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

function getLocationSlug(location: Location): string | null {
  return (
    normalizeKey(location.slug) ??
    normalizeKey(location.location_slug) ??
    normalizeKey(location.name) ??
    normalizeKey(location.id)
  )
}

function getLocationAliases(location: Location): string[] {
  const aliases = [
    normalizeKey(location.slug),
    normalizeKey(location.location_slug),
    normalizeKey(location.name),
    normalizeKey(location.id),
  ].filter((value): value is string => value !== null)

  return Array.from(new Set(aliases))
}

function getLocationKey(location: Location): string {
  return getLocationSlug(location) ?? String(location.id ?? location.name ?? '')
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

    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 2,
    })
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

    map.flyTo([y, x], 2, {
      duration: 0.6,
    })
  }, [location, map])

  return null
}

function App() {
  const [locations, setLocations] = useState<Location[]>([])
  const [opRoutes, setOpRoutes] = useState<OpRoute[]>([])
  const [activeLocationSlug, setActiveLocationSlug] = useState<string | null>(null)
  const [activeStepSlug, setActiveStepSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [locationsResponse, routesResponse] = await Promise.all([
          fetch('/data/locations.json'),
          fetch('/data/op_routes.json'),
        ])

        if (!locationsResponse.ok) {
          throw new Error(`Kon locations.json niet laden: ${locationsResponse.status}`)
        }

        if (!routesResponse.ok) {
          throw new Error(`Kon op_routes.json niet laden: ${routesResponse.status}`)
        }

        const locationsJson = await locationsResponse.json()
        const routesJson = await routesResponse.json()

        setLocations(normalizeLocations(locationsJson))
        setOpRoutes(normalizeOpRoutes(routesJson))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Onbekende fout')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const markerLocations = useMemo(() => {
    return locations.filter((location) => {
      return toNumber(location.world_x) !== null && toNumber(location.world_y) !== null
    })
  }, [locations])

const locationsBySlug = useMemo(() => {
  const map = new Map<string, Location>()

  markerLocations.forEach((location) => {
    getLocationAliases(location).forEach((alias) => {
      map.set(alias, location)
    })
  })

  return map
}, [markerLocations])

  const activeLocation = activeLocationSlug
    ? locationsBySlug.get(activeLocationSlug) ?? null
    : null

  return (
    <main className="app-shell">
      <section className="sidebar">
        <h1>Dragon&apos;s Dogma II Companion</h1>
        <p className="subtitle">OP-route, loot, kaart en voortgang</p>

        <div className="panel">
          <h2>Locations</h2>

          {loading && <p>Data laden...</p>}
          {error && <p className="error">{error}</p>}

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
                      className={isActive ? 'location-list-item active' : 'location-list-item'}
                      key={location.slug ?? location.id ?? location.name}
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
        </div>

        <div className="panel">
          <h2>OP-routes</h2>

          {loading && <p>Routes laden...</p>}

          {!loading && !error && (
            <>
              <p>{opRoutes.length} route(s) geladen.</p>

              <div className="route-list">
                {opRoutes.map((route) => {
                  const steps = [...(route.steps ?? [])].sort(
                    (a, b) => getStepOrder(a) - getStepOrder(b),
                  )

                  const routeMeta = [route.profile_slug ?? route.profile, route.vocation]
                    .filter(Boolean)
                    .join(' · ')

                  return (
                    <article
                      className="route-card"
                      key={route.slug ?? route.route_slug ?? route.id ?? getRouteTitle(route)}
                    >
                      <h3>{getRouteTitle(route)}</h3>

                      {routeMeta && <p className="muted">{routeMeta}</p>}

                      <ol className="step-list">
                        {steps.map((step) => {
                          const stepSlug = getStepSlug(step)
                          const stepLocationSlug = resolveStepLocationSlug(step, locationsBySlug)
                          const isActive = stepSlug === activeStepSlug

                          return (
                            <li key={step.slug ?? step.step_slug ?? step.id ?? getStepTitle(step)}>
                              <button
                                className={isActive ? 'step-button active' : 'step-button'}
                                type="button"
                                onClick={() => {
  setActiveStepSlug(stepSlug)

  if (stepLocationSlug) {
    setActiveLocationSlug(stepLocationSlug)
  }
}}
                              >
                                <span className="step-order">
                                  {Number.isFinite(getStepOrder(step)) ? getStepOrder(step) : '-'}
                                </span>

                                <span className="step-content">
                                  <strong>{getStepTitle(step)}</strong>
                                  {stepLocationSlug && <small>{stepLocationSlug}</small>}
                                  {step.description && <small>{step.description}</small>}
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ol>
                    </article>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="map-section">
        <MapContainer
          className="dd2-map"
          crs={CRS.Simple}
          center={[0, 0]}
          zoom={0}
          minZoom={-5}
          maxZoom={5}
          scrollWheelZoom
        >
          <FitMapToMarkers locations={markerLocations} />
          <FlyToActiveLocation location={activeLocation} />

          {markerLocations.map((location) => {
            const x = toNumber(location.world_x)
            const y = toNumber(location.world_y)

            if (x === null || y === null) return null

            const locationSlug = getLocationSlug(location)
            const isActive = locationSlug !== null && locationSlug === activeLocationSlug

            return (
              <Marker
                key={getLocationKey(location) ?? `${x}-${y}`}
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
                  <p>
                    x: {x}, y: {y}
                  </p>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </section>
    </main>
  )
}

export default App