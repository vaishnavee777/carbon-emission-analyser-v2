import { useEffect, useState } from "react"
import { PlugZap } from "lucide-react"

import { api, type GridIntensity } from "../../lib/api"

const REFRESH_MS = 5 * 60 * 1000

const LEVELS = {
  low: {
    label: "Cleaner than usual",
    color: "var(--success)",
    tip: "Good time to run the washing machine, charge devices or use heavy appliances.",
  },
  moderate: {
    label: "About average",
    color: "var(--lavender)",
    tip: "Grid is near its 24-hour average.",
  },
  high: {
    label: "Dirtier than usual",
    color: "var(--warning)",
    tip: "If you can, shift heavy appliance use to later.",
  },
}

function minutesAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes} min ago`
  return `${Math.round(minutes / 60)} h ago`
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  const min = Math.min(...points)
  const range = Math.max(...points) - min || 1
  const coords = points.map((value, index) => {
    const x = (index / (points.length - 1)) * 100
    const y = 28 - ((value - min) / range) * 24
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <svg viewBox="-2 0 104 32" className="mt-4 h-10 w-full" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        opacity={0.8}
      />
    </svg>
  )
}

function GridCard() {
  const [grid, setGrid] = useState<GridIntensity | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      api
        .gridIntensity()
        .then((data) => {
          if (!cancelled) {
            setGrid(data)
            setError(null)
          }
        })
        .catch((err: Error) => {
          if (!cancelled) setError(err.message)
        })

    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  if (error) {
    return (
      <p className="mt-6 text-sm text-red-200">Couldn't load grid data: {error}</p>
    )
  }

  if (!grid) return null

  const level = grid.level ? LEVELS[grid.level] : null
  const accent = level?.color ?? "var(--lavender)"
  const isStatic = grid.source === "static"

  return (
    <section className="mt-6 rounded-[1.5rem] border border-white/10 bg-[var(--bg-secondary)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <PlugZap size={16} style={{ color: accent }} />
            <p className="text-sm font-medium">Your grid right now</p>
          </div>
          <p className="mt-3 text-3xl font-semibold">
            {Math.round(grid.g_per_kwh)}
            <span className="ml-1 text-sm font-normal text-[var(--text-muted)]">
              g CO₂/kWh
            </span>
          </p>
        </div>

        {level && (
          <span
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{ color: accent, backgroundColor: "rgba(255,255,255,0.06)" }}
          >
            {level.label}
          </span>
        )}
      </div>

      {grid.history.length > 1 && (
        <Sparkline points={grid.history.map((point) => point.g_per_kwh)} color={accent} />
      )}

      {level && (
        <p className="mt-3 text-xs text-[var(--text-secondary)]">{level.tip}</p>
      )}

      <p className="mt-3 text-[11px] text-[var(--text-muted)]">
        {isStatic
          ? grid.live_configured
            ? "Live data unavailable. Using the standard emission factor."
            : "Standard emission factor. Add an Electricity Maps API key for live data."
          : `${grid.source === "live" ? "Live" : "Cached"} · ${grid.provider} · ${grid.zone}${
              grid.is_estimated ? " · estimated" : ""
            }${grid.measured_at ? ` · ${minutesAgo(grid.measured_at)}` : ""}`}
      </p>
    </section>
  )
}

export default GridCard
