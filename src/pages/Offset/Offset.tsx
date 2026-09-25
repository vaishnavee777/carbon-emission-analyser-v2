import { useEffect, useState } from "react"
import { ArrowLeft, Sprout, TrendingDown, TreeDeciduous } from "lucide-react"
import { useNavigate } from "react-router"

import { api, type OffsetSuggestions } from "../../lib/api"
import { CategoryIcon } from "../../lib/categories"

const PERIODS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 365, label: "Year" },
]

function usd(value: number) {
  return value < 10 ? `$${value.toFixed(2)}` : `$${Math.round(value)}`
}

function kg(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(2)} t` : `${value.toFixed(1)} kg`
}

function Offset() {
  const navigate = useNavigate()
  const [days, setDays] = useState(30)
  const [data, setData] = useState<OffsetSuggestions | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .offsetSuggestions(days)
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setError(null)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [days])

  const periodLabel = days === 365 ? "this year" : `the last ${days} days`

  return (
    <div className="relative min-h-screen overflow-hidden px-5">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 top-16 h-64 w-64 rounded-full bg-purple-400/10 blur-3xl" />
        <div className="absolute -left-32 top-[45%] h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 pb-32">
        <header className="flex items-center gap-4 pt-8">
          <button
            onClick={() => navigate("/")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition hover:bg-white/10"
            aria-label="Go back"
          >
            <ArrowLeft size={19} />
          </button>
          <div>
            <p className="text-sm text-[var(--text-muted)]">Your impact</p>
            <h1 className="text-2xl font-semibold">Reduce &amp; offset</h1>
          </div>
        </header>

        <div className="mt-6 flex gap-2" role="tablist" aria-label="Period">
          {PERIODS.map((period) => (
            <button
              key={period.days}
              role="tab"
              aria-selected={days === period.days}
              onClick={() => setDays(period.days)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                days === period.days
                  ? "bg-[var(--lavender)]/20 text-[var(--lavender-light)]"
                  : "bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>

        {error && (
          <div role="alert" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {!data && !error && <p className="mt-8 text-sm text-[var(--text-muted)]">Calculating…</p>}

        {data && (
          <>
            {/* Footprint */}
            <section className="mt-6 rounded-[2rem] border border-white/10 bg-gradient-to-br from-[var(--card)] to-[var(--card-light)] p-6">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                Your footprint, {periodLabel}
              </p>
              <p className="mt-4 text-5xl font-semibold tracking-tight">
                {data.footprint_kg.toFixed(1)}
                <span className="ml-2 text-sm font-normal text-[var(--text-secondary)]">kg CO₂e</span>
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                At this rate: {kg(data.annualised_kg)} a year
              </p>

              <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/10 p-4">
                <TreeDeciduous size={28} className="shrink-0 text-[var(--success)]" />
                <p className="text-sm">
                  It would take <span className="font-semibold">{data.trees_to_absorb_a_year} trees</span>{" "}
                  a full year to absorb a year of emissions at this rate.
                </p>
              </div>

              {data.by_category.length > 0 && (
                <div className="mt-5 space-y-2">
                  {data.by_category.map((item) => (
                    <div key={item.category} className="flex items-center gap-3 text-sm">
                      <CategoryIcon category={item.category} size={15} className="shrink-0 text-[var(--lavender)]" />
                      <span className="w-24 shrink-0 text-[var(--text-secondary)]">{item.category}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[var(--lavender)]"
                          style={{ width: `${Math.max(2, item.share * 100)}%` }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right text-xs text-[var(--text-muted)]">
                        {Math.round(item.share * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Reduce */}
            <section className="mt-8">
              <div className="flex items-center gap-2">
                <TrendingDown size={18} className="text-[var(--success)]" />
                <p className="text-lg font-medium">Reduce first</p>
              </div>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Based on what you actually logged. Cutting emissions beats offsetting them.
              </p>

              <div className="mt-4 space-y-3">
                {data.reductions.length === 0 && (
                  <p className="rounded-2xl bg-white/5 p-4 text-sm text-[var(--text-secondary)]">
                    Nothing big to cut in this period. Log more activities for personalised tips.
                  </p>
                )}
                {data.reductions.map((reduction) => (
                  <div key={reduction.title} className="rounded-[1.5rem] border border-white/10 bg-[var(--bg-secondary)] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--lavender)]/10">
                        <CategoryIcon category={reduction.category} size={18} className="text-[var(--lavender)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{reduction.title}</p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">{reduction.detail}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between rounded-xl bg-[var(--success)]/10 px-3 py-2">
                      <span className="text-sm font-semibold text-[var(--success)]">
                        −{kg(reduction.saving_kg)}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        ≈ {kg(reduction.saving_kg_per_year)} a year
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Offset */}
            <section className="mt-8">
              <div className="flex items-center gap-2">
                <Sprout size={18} className="text-[var(--lavender)]" />
                <p className="text-lg font-medium">Then offset the rest</p>
              </div>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Offsetting the remaining {kg(data.remaining_kg)} would cost roughly:
              </p>

              <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[var(--bg-secondary)]">
                {data.offsets.map((offset, index) => (
                  <div
                    key={offset.type}
                    className={`flex items-start justify-between gap-3 p-4 ${index > 0 ? "border-t border-white/10" : ""}`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{offset.type}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                            offset.kind === "removal"
                              ? "bg-[var(--success)]/15 text-[var(--success)]"
                              : "bg-white/10 text-[var(--text-muted)]"
                          }`}
                        >
                          {offset.kind}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{offset.durability}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold">
                        {usd(offset.cost_usd[0])}–{usd(offset.cost_usd[1])}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        ${offset.price_usd_per_t[0]}–{offset.price_usd_per_t[1]}/t
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">
                Prices are indicative ranges and change over time. <b>Removal</b> credits take CO₂
                out of the air, while <b>avoidance</b> credits prevent new emissions. Look for
                credits certified by Gold Standard or Verra.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export default Offset
