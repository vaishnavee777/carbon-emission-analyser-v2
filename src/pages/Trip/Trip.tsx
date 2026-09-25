import { useState } from "react"
import { ArrowLeft, Check, LocateFixed, MapPin, ShieldCheck } from "lucide-react"
import { useNavigate } from "react-router"

import { useApp } from "../../context/useApp"
import { api, type TripResult } from "../../lib/api"
import { useTripTracker } from "../../lib/useTripTracker"

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

function accuracyLabel(accuracy: number | null) {
  if (accuracy === null) return "Waiting for GPS…"
  if (accuracy <= 15) return `Strong GPS (±${Math.round(accuracy)} m)`
  if (accuracy <= 60) return `OK GPS (±${Math.round(accuracy)} m)`
  return `Weak GPS (±${Math.round(accuracy)} m). Readings ignored until it improves`
}

const card = "rounded-[1.5rem] border border-white/10 bg-[var(--bg-secondary)] p-5"
const primaryButton =
  "w-full rounded-2xl bg-[var(--lavender-light)] px-6 py-4 text-sm font-semibold text-[var(--bg-deep)] shadow-lg shadow-purple-950/30 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
const secondaryButton =
  "w-full rounded-2xl border border-white/10 bg-[var(--bg-secondary)] px-6 py-4 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-white/10 disabled:opacity-60"

function Trip() {
  const navigate = useNavigate()
  const { refreshActivities } = useApp()
  const tracker = useTripTracker()

  const [result, setResult] = useState<TripResult | null>(null)
  const [selected, setSelected] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function endTrip() {
    const summary = tracker.finish()
    if (!summary) return
    setBusy(true)
    setMessage(null)
    try {
      const trip = await api.createTrip(summary)
      setResult(trip)
      setSelected(trip.detected.activity)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't save the trip.")
    } finally {
      setBusy(false)
    }
  }

  async function logTrip() {
    if (!result) return
    setBusy(true)
    try {
      await api.confirmTrip(result.id, selected)
      await refreshActivities()
      navigate("/")
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't log the trip.")
      setBusy(false)
    }
  }

  async function discard() {
    if (result) await api.discardTrip(result.id).catch(() => {})
    setResult(null)
    setMessage(null)
  }

  const chosen = result?.options.find((option) => option.activity === selected)

  return (
    <div className="relative min-h-screen overflow-hidden px-5">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 top-20 h-64 w-64 rounded-full bg-purple-400/10 blur-3xl" />
        <div className="absolute -left-32 top-[45%] h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 pb-32">
        <header className="flex items-center gap-4 pt-8">
          <button
            onClick={() => navigate("/log")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition hover:bg-white/10"
            aria-label="Go back"
          >
            <ArrowLeft size={19} />
          </button>
          <div>
            <p className="text-sm text-[var(--text-muted)]">Transport</p>
            <h1 className="text-2xl font-semibold">Track a trip</h1>
          </div>
        </header>

        {/* Idle */}
        {!tracker.tracking && !result && (
          <section className="mt-8 space-y-4">
            <div className={card}>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--lavender)]/15">
                <MapPin size={22} className="text-[var(--lavender)]" />
              </div>
              <p className="mt-4 text-lg font-medium">Let your phone log the journey</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Tap start when you set off and end when you arrive. We measure the distance and
                work out whether you walked, cycled, drove, or took the bus or train.
              </p>
            </div>

            <div className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 text-xs text-[var(--text-secondary)]">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--success)]" />
              <p>
                Your route never leaves this phone. Only the distance and speed summary is sent.
                Keep the app open during the trip; the screen stays on so GPS keeps working.
              </p>
            </div>

            {(message || tracker.error) && (
              <div role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
                {message ?? tracker.error}
              </div>
            )}

            <button onClick={tracker.start} disabled={busy} className={primaryButton}>
              {busy ? "Saving trip…" : "Start trip"}
            </button>
          </section>
        )}

        {/* Tracking */}
        {tracker.tracking && tracker.snapshot && (
          <section className="mt-8 space-y-4">
            <div className={`${card} text-center`}>
              <div className="mx-auto flex w-fit items-center gap-2 rounded-full bg-[var(--success)]/15 px-3 py-1 text-xs font-medium text-[var(--success)]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--success)]" />
                Tracking
              </div>
              <p className="mt-6 text-6xl font-semibold tracking-tight">
                {tracker.snapshot.distanceKm.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">km travelled</p>

              <div className="mt-6 grid grid-cols-2 gap-3 text-left">
                <div className="rounded-2xl bg-white/5 p-3">
                  <p className="text-xs text-[var(--text-muted)]">Time</p>
                  <p className="mt-1 text-lg font-semibold">{formatDuration(tracker.elapsedS)}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-3">
                  <p className="text-xs text-[var(--text-muted)]">Speed</p>
                  <p className="mt-1 text-lg font-semibold">
                    {Math.round(tracker.snapshot.speedKmh)}
                    <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">km/h</span>
                  </p>
                </div>
              </div>

              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)]">
                <LocateFixed size={13} />
                {accuracyLabel(tracker.snapshot.accuracyM)}
              </p>
            </div>

            {tracker.error && (
              <p role="status" className="text-center text-sm text-[var(--warning)]">
                {tracker.error}
              </p>
            )}

            <button onClick={endTrip} className={primaryButton}>
              End trip
            </button>
            <button onClick={tracker.cancel} className={secondaryButton}>
              Cancel without saving
            </button>
          </section>
        )}

        {/* Result */}
        {result && (
          <section className="mt-8 space-y-4">
            <div className={card}>
              <p className="text-sm text-[var(--text-muted)]">
                {result.distance_km.toFixed(1)} km in {Math.round(result.duration_min)} min
              </p>
              <p className="mt-2 text-2xl font-semibold">
                Looks like {result.detected.activity}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {result.detected.reason}
                {result.detected.confidence < 0.7 && ". Tap the right one if we got it wrong."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="How did you travel?">
              {result.options.map((option) => {
                const isSelected = option.activity === selected
                return (
                  <button
                    key={option.activity}
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelected(option.activity)}
                    className={`rounded-2xl border p-3 text-left transition ${
                      isSelected
                        ? "border-[var(--lavender)] bg-[var(--lavender)]/15"
                        : "border-white/10 bg-[var(--bg-secondary)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{option.activity}</span>
                      {isSelected && <Check size={15} className="shrink-0 text-[var(--lavender)]" />}
                    </div>
                    <span className="mt-1 block text-xs text-[var(--text-muted)]">
                      {option.estimated_kg.toFixed(2)} kg CO₂e
                    </span>
                  </button>
                )
              })}
            </div>

            {message && (
              <div role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
                {message}
              </div>
            )}

            <button onClick={logTrip} disabled={busy} className={primaryButton}>
              {busy ? "Logging…" : `Log trip · ${chosen?.estimated_kg.toFixed(2) ?? "0.00"} kg`}
            </button>
            <button onClick={discard} disabled={busy} className={secondaryButton}>
              Discard
            </button>
          </section>
        )}
      </div>
    </div>
  )
}

export default Trip
