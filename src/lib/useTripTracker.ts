import { useCallback, useEffect, useRef, useState } from "react"

import type { TripSummary } from "./api"
import {
  addFix,
  addMotionWindow,
  createMotionSampler,
  newTrip,
  summarise,
  type TripState,
} from "./trip"

const STORAGE_KEY = "carbon-active-trip"
const PERSIST_EVERY_MS = 10000

export interface TripSnapshot {
  startedAt: number
  distanceKm: number
  speedKmh: number
  accuracyM: number | null
  fixes: number
}

type MotionPermission = { requestPermission?: () => Promise<"granted" | "denied"> }

function loadStored(): TripState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as TripState) : null
  } catch {
    return null
  }
}

function persist(state: TripState | null) {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable; the trip just won't survive a reload.
  }
}

function snapshotOf(state: TripState): TripSnapshot {
  return {
    startedAt: state.startedAt,
    distanceKm: state.distanceM / 1000,
    speedKmh: state.currentSpeedKmh,
    accuracyM: state.lastAccuracy,
    fixes: state.speedsKmh.length,
  }
}

function geolocationMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location access is blocked. Allow it in your browser settings to track trips."
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Can't get a GPS fix right now. Try moving somewhere with a clearer view of the sky."
  }
  return "GPS is taking a while to respond. Still trying…"
}

export function useTripTracker() {
  const [restored] = useState(loadStored)
  const stateRef = useRef<TripState | null>(restored)
  const [tracking, setTracking] = useState(restored !== null)
  const [snapshot, setSnapshot] = useState<TripSnapshot | null>(
    restored ? snapshotOf(restored) : null,
  )
  const [now, setNow] = useState(() => Date.now())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tracking) return

    const lastPersist = { at: 0 }
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const state = stateRef.current
        if (!state) return
        addFix(state, {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          t: position.timestamp,
          speed: position.coords.speed,
        })
        setError(null)
        setSnapshot(snapshotOf(state))
        if (position.timestamp - lastPersist.at > PERSIST_EVERY_MS) {
          persist(state)
          lastPersist.at = position.timestamp
        }
      },
      (err) => setError(geolocationMessage(err)),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 },
    )

    const onMotion = createMotionSampler((walkingLike) => {
      if (stateRef.current) addMotionWindow(stateRef.current, walkingLike)
    })
    window.addEventListener("devicemotion", onMotion)

    // Browsers pause GPS when the screen locks, so keep it on while tracking.
    let wakeLock: WakeLockSentinel | null = null
    const requestWakeLock = () => {
      navigator.wakeLock
        ?.request("screen")
        .then((lock) => {
          wakeLock = lock
        })
        .catch(() => {})
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") requestWakeLock()
    }
    requestWakeLock()
    document.addEventListener("visibilitychange", onVisible)

    const timer = setInterval(() => setNow(Date.now()), 1000)

    return () => {
      navigator.geolocation.clearWatch(watchId)
      window.removeEventListener("devicemotion", onMotion)
      document.removeEventListener("visibilitychange", onVisible)
      wakeLock?.release().catch(() => {})
      clearInterval(timer)
      persist(stateRef.current)
    }
  }, [tracking])

  const start = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setError("This device doesn't support location tracking.")
      return
    }

    // iOS only lets us read motion sensors after asking, and only from a tap.
    const motion = (window.DeviceMotionEvent as unknown as MotionPermission | undefined)
    if (motion?.requestPermission) {
      await motion.requestPermission().catch(() => "denied")
    }

    const state = newTrip()
    stateRef.current = state
    persist(state)
    setSnapshot(snapshotOf(state))
    setNow(Date.now())
    setError(null)
    setTracking(true)
  }, [])

  const finish = useCallback((): TripSummary | null => {
    const state = stateRef.current
    stateRef.current = null
    persist(null)
    setTracking(false)
    setSnapshot(null)
    return state ? summarise(state) : null
  }, [])

  const cancel = useCallback(() => {
    finish()
    setError(null)
  }, [finish])

  return {
    tracking,
    snapshot,
    elapsedS: snapshot ? Math.max(0, Math.floor((now - snapshot.startedAt) / 1000)) : 0,
    error,
    start,
    finish,
    cancel,
  }
}
