import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Check, ChevronRight, MapPin } from "lucide-react"
import { useNavigate } from "react-router"

import { useApp } from "../../context/useApp"
import { api, type EmissionFactor, type GridIntensity, type GridIntensityAt } from "../../lib/api"
import { CategoryIcon } from "../../lib/categories"

// Value for <input type="datetime-local">, in the device's local time.
function toLocalInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function isGridElectricity(category: string, activity: string) {
  return category === "Electricity" && activity === "Grid Electricity"
}

function LogActivity() {
  const navigate = useNavigate()
  const { refreshActivities } = useApp()

  const [factors, setFactors] = useState<EmissionFactor[]>([])
  const [grid, setGrid] = useState<GridIntensity | null>(null)
  const [when, setWhen] = useState<"now" | "earlier">("now")
  const [earlierValue, setEarlierValue] = useState(() => toLocalInput(new Date(Date.now() - 3600000)))
  const [gridAt, setGridAt] = useState<GridIntensityAt | null>(null)
  const [category, setCategory] = useState("")
  const [activity, setActivity] = useState("")
  const [quantity, setQuantity] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    api
      .emissionFactors()
      .then((data) => {
        setFactors(data)
        if (data.length > 0) {
          setCategory(data[0].category)
          setActivity(data[0].activity)
        }
      })
      .catch((err: Error) => setError(err.message))

    api.gridIntensity().then(setGrid).catch(() => setGrid(null))
  }, [])

  const earlierDate = useMemo(() => new Date(earlierValue), [earlierValue])
  const earlierValid = !Number.isNaN(earlierDate.getTime())
  const needsGridAt = when === "earlier" && earlierValid && isGridElectricity(category, activity)

  useEffect(() => {
    if (!needsGridAt) return
    let cancelled = false
    const timer = setTimeout(() => {
      api
        .gridIntensityAt(earlierDate.toISOString())
        .then((result) => {
          if (!cancelled) setGridAt(result)
        })
        .catch(() => {
          if (!cancelled) setGridAt(null)
        })
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [needsGridAt, earlierDate])

  // Which grid reading applies: the hour it happened, or right now.
  const gridForLog = useMemo(() => {
    if (when === "now") return grid
    return needsGridAt && gridAt
      ? { g_per_kwh: gridAt.g_per_kwh, source: gridAt.source, measured_at: gridAt.measured_at }
      : null
  }, [when, grid, needsGridAt, gridAt])

  const categories = useMemo(() => {
    const grouped = new Map<string, EmissionFactor[]>()
    for (const factor of factors) {
      grouped.set(factor.category, [...(grouped.get(factor.category) ?? []), factor])
    }
    return [...grouped].map(([name, items]) => ({
      name,
      activities: items.map((item) => {
        const useGrid =
          gridForLog !== null &&
          gridForLog.source !== "static" &&
          isGridElectricity(item.category, item.activity) &&
          item.unit === "kWh"
        let note = ""
        if (useGrid) {
          note = gridForLog.source === "historical" ? " · grid then" : " · live"
        }
        return {
          name: item.activity,
          unit: item.unit,
          factor: useGrid ? Number((gridForLog.g_per_kwh / 1000).toFixed(3)) : item.factor,
          note,
        }
      }),
    }))
  }, [factors, gridForLog])

  const selectedCategory = categories.find(
    (item) => item.name === category
  )

  const availableActivities =
    selectedCategory?.activities ?? []

  const selectedActivity =
    availableActivities.find(
      (item) => item.name === activity
    )

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory)

    const categoryData = categories.find(
      (item) => item.name === newCategory
    )

    if (categoryData) {
      setActivity(categoryData.activities[0].name)
    }

    setError("")
  }

  const handleSubmit = async () => {
    setError("")
    setSuccess(false)

    if (!quantity || Number(quantity) <= 0) {
      setError("Please enter a valid quantity.")
      return
    }

    if (!selectedActivity) {
      setError("Please select an activity.")
      return
    }

    if (when === "earlier" && !earlierValid) {
      setError("Pick a date and time.")
      return
    }

    setLoading(true)

    try {
      await api.createActivity({
        category,
        activity,
        quantity: Number(quantity),
        unit: selectedActivity.unit,
        activity_date: when === "earlier" ? earlierDate.toISOString() : undefined,
      })

      await refreshActivities()

      setSuccess(true)
      setQuantity("")

      setTimeout(() => {
        navigate("/")
      }, 1000)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-5">

      {/* Background atmosphere */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div className="absolute -right-24 top-20 h-64 w-64 rounded-full bg-purple-400/10 blur-3xl" />

        <div className="absolute -left-32 top-[45%] h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl" />

        <div className="absolute right-8 top-24 text-xs text-purple-200/30">
          ✦
        </div>

        <div className="absolute left-12 top-40 text-[8px] text-purple-200/30">
          ✦
        </div>

      </div>

      <div className="relative z-10 pb-32">

        {/* Header */}
        <header className="flex items-center gap-4 pt-8">

          <button
            onClick={() => navigate("/")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition hover:bg-white/10"
            aria-label="Go back"
          >
            <ArrowLeft size={19} />
          </button>

          <div>
            <p className="text-sm text-[var(--text-muted)]">
              Track your impact
            </p>

            <h1 className="text-2xl font-semibold">
              Log activity
            </h1>
          </div>

        </header>

        {/* Category */}
        <section className="mt-8">

          <p className="text-lg font-medium">
            What did you do?
          </p>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Choose a category
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">

            {categories.map((item) => {

              const selected =
                category === item.name

              return (
                <button
                  key={item.name}
                  onClick={() =>
                    handleCategoryChange(item.name)
                  }
                  className={`rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-[var(--lavender)] bg-[var(--lavender)]/15"
                      : "border-white/10 bg-[var(--bg-secondary)]"
                  }`}
                >

                  <div className="flex items-center justify-between">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--lavender)]/10">
                      <CategoryIcon
                        category={item.name}
                        size={19}
                        className="text-[var(--lavender)]"
                      />
                    </div>

                    {selected && (
                      <Check
                        size={17}
                        className="text-[var(--lavender)]"
                      />
                    )}

                  </div>

                  <p className="mt-3 text-sm font-medium">
                    {item.name}
                  </p>

                </button>
              )
            })}

          </div>

        </section>

        {category === "Transport" && (
          <button
            onClick={() => navigate("/trip")}
            className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-[var(--lavender)]/30 bg-[var(--lavender)]/10 p-4 text-left transition hover:bg-[var(--lavender)]/15"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--lavender)]/15">
              <MapPin size={19} className="text-[var(--lavender)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Track a trip with GPS</p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                We'll measure the distance and detect how you travelled
              </p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-[var(--text-muted)]" />
          </button>
        )}

        {/* Activity */}
        <section className="mt-8">

          <p className="text-lg font-medium">
            Activity
          </p>

          <div className="mt-4 space-y-2">

            {availableActivities.map((item) => {

              const selected =
                activity === item.name

              return (
                <button
                  key={item.name}
                  onClick={() =>
                    setActivity(item.name)
                  }
                  className={`flex w-full items-center justify-between rounded-2xl border p-4 transition ${
                    selected
                      ? "border-[var(--lavender)] bg-[var(--lavender)]/15"
                      : "border-white/10 bg-[var(--bg-secondary)]"
                  }`}
                >

                  <span className="text-sm font-medium">
                    {item.name}
                  </span>

                  <span className="text-xs text-[var(--text-muted)]">
                    {item.factor} kg per {item.unit}
                    {item.note}
                  </span>

                </button>
              )
            })}

          </div>

        </section>

        {/* Quantity */}
        <section className="mt-8">

          <p className="text-lg font-medium">
            How much?
          </p>

          <div className="mt-4 rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">

            <div className="flex items-center gap-3">

              <input
                type="number"
                min="0"
                step="0.1"
                value={quantity}
                onChange={(event) =>
                  setQuantity(event.target.value)
                }
                placeholder="0"
                className="w-full bg-transparent text-4xl font-semibold outline-none placeholder:text-white/20"
              />

              <span className="whitespace-nowrap text-sm text-[var(--text-muted)]">
                {selectedActivity?.unit}
              </span>

            </div>

          </div>

        </section>

        {/* When */}
        <section className="mt-8">

          <p className="text-lg font-medium">
            When?
          </p>

          <div className="mt-4 flex gap-2" role="radiogroup" aria-label="When did this happen?">
            {(["now", "earlier"] as const).map((option) => (
              <button
                key={option}
                role="radio"
                aria-checked={when === option}
                onClick={() => setWhen(option)}
                className={`flex-1 rounded-2xl border p-3 text-sm font-medium transition ${
                  when === option
                    ? "border-[var(--lavender)] bg-[var(--lavender)]/15"
                    : "border-white/10 bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                }`}
              >
                {option === "now" ? "Just now" : "Earlier"}
              </button>
            ))}
          </div>

          {when === "earlier" && (
            <label className="mt-3 block">
              <span className="sr-only">Date and time</span>
              <input
                type="datetime-local"
                value={earlierValue}
                max={toLocalInput(new Date())}
                onChange={(event) => setEarlierValue(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[var(--bg-secondary)] px-4 py-3 text-base text-[var(--text-primary)] outline-none focus:border-[var(--lavender)]"
              />
            </label>
          )}

          {when === "earlier" && isGridElectricity(category, activity) && (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {gridAt?.source === "historical"
                ? `The grid was at ${Math.round(gridAt.g_per_kwh)} g CO₂/kWh then${
                    grid && grid.source !== "static"
                      ? ` (${Math.round(grid.g_per_kwh)} right now)`
                      : ""
                  }.`
                : "No grid data for that time, so the standard factor is used."}
            </p>
          )}

        </section>

        {/* Error */}
        {error && (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mt-5 rounded-2xl border border-green-400/20 bg-green-400/10 p-4 text-sm text-green-200">
            Activity saved successfully!
          </div>
        )}

        {/* Submit */}
        <div className="mt-8">

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex w-full items-center justify-center rounded-2xl bg-[var(--lavender-light)] px-6 py-4 text-sm font-semibold text-[var(--bg-deep)] shadow-lg shadow-purple-950/30 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Saving..."
              : "Save activity"}
          </button>

        </div>

      </div>

    </div>
  )
}

export default LogActivity