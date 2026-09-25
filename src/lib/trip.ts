import type { TripSummary } from "./api"

export interface Fix {
  lat: number
  lon: number
  accuracy: number
  t: number
  speed: number | null
}

export interface TripState {
  startedAt: number
  anchor: Fix | null
  last: Fix | null
  distanceM: number
  speedsKmh: number[]
  motionWindows: number
  walkingWindows: number
  lastAccuracy: number | null
  currentSpeedKmh: number
}

const MAX_ACCURACY_M = 60
const MAX_PLAUSIBLE_KMH = 1000
const STOPPED_BELOW_KMH = 2
const MAX_SAMPLES = 20000

export function newTrip(now = Date.now()): TripState {
  return {
    startedAt: now,
    anchor: null,
    last: null,
    distanceM: 0,
    speedsKmh: [],
    motionWindows: 0,
    walkingWindows: 0,
    lastAccuracy: null,
    currentSpeedKmh: 0,
  }
}

export function haversineM(a: Fix, b: Fix) {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Mutates `state`: long trips produce thousands of fixes, so avoid copying.
export function addFix(state: TripState, fix: Fix) {
  state.lastAccuracy = fix.accuracy
  if (fix.accuracy > MAX_ACCURACY_M) return

  if (state.last) {
    const dt = (fix.t - state.last.t) / 1000
    if (dt <= 0) return
    const measured =
      fix.speed !== null && fix.speed >= 0
        ? fix.speed * 3.6
        : (haversineM(state.last, fix) / dt) * 3.6
    if (measured > MAX_PLAUSIBLE_KMH) return
    state.currentSpeedKmh = measured
    if (state.speedsKmh.length < MAX_SAMPLES) state.speedsKmh.push(measured)
  }

  // Only count distance once we've clearly moved beyond GPS noise, so standing still doesn't add up.
  if (!state.anchor) {
    state.anchor = fix
  } else {
    const moved = haversineM(state.anchor, fix)
    const noise = Math.max(10, (state.anchor.accuracy + fix.accuracy) / 2)
    if (moved >= noise) {
      state.distanceM += moved
      state.anchor = fix
    }
  }

  state.last = fix
}

export function addMotionWindow(state: TripState, walkingLike: boolean) {
  state.motionWindows += 1
  if (walkingLike) state.walkingWindows += 1
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))
  return sorted[index]
}

export function summarise(state: TripState, endedAt = Date.now()): TripSummary {
  const moving = state.speedsKmh.filter((s) => s >= STOPPED_BELOW_KMH).sort((a, b) => a - b)
  const mean = moving.length ? moving.reduce((sum, s) => sum + s, 0) / moving.length : 0
  const variance = moving.length
    ? moving.reduce((sum, s) => sum + (s - mean) ** 2, 0) / moving.length
    : 0

  return {
    started_at: new Date(state.startedAt).toISOString(),
    ended_at: new Date(endedAt).toISOString(),
    distance_km: Number((state.distanceM / 1000).toFixed(3)),
    median_speed_kmh: Number(percentile(moving, 0.5).toFixed(2)),
    p95_speed_kmh: Number(percentile(moving, 0.95).toFixed(2)),
    speed_cv: mean > 0 ? Number((Math.sqrt(variance) / mean).toFixed(3)) : 0,
    stop_fraction: state.speedsKmh.length
      ? Number((1 - moving.length / state.speedsKmh.length).toFixed(3))
      : 0,
    walking_motion_fraction: state.motionWindows
      ? Number((state.walkingWindows / state.motionWindows).toFixed(3))
      : null,
    sample_count: state.speedsKmh.length,
  }
}

// Accelerometer: walking gives a strong rhythmic bounce; riding in a vehicle is much smoother.
const WINDOW_MS = 2000
const WALKING_STD_MS2 = 1.2

export function createMotionSampler(onWindow: (walkingLike: boolean) => void) {
  let samples: number[] = []
  let windowStart = performance.now()

  return (event: DeviceMotionEvent) => {
    const a = event.accelerationIncludingGravity
    if (!a || a.x === null || a.y === null || a.z === null) return
    samples.push(Math.hypot(a.x, a.y, a.z))

    const now = performance.now()
    if (now - windowStart >= WINDOW_MS && samples.length >= 10) {
      const mean = samples.reduce((sum, v) => sum + v, 0) / samples.length
      const std = Math.sqrt(samples.reduce((sum, v) => sum + (v - mean) ** 2, 0) / samples.length)
      onWindow(std >= WALKING_STD_MS2)
      samples = []
      windowStart = now
    }
  }
}
