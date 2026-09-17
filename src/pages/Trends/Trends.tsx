import { useMemo } from "react"

import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Car,
  Zap,
  Utensils,
  ShoppingBag,
} from "lucide-react"

import { useNavigate } from "react-router"

import { useApp } from "../../context/useApp"

const categoryIcons = {
  Transportation: Car,
  Electricity: Zap,
  Food: Utensils,
  Shopping: ShoppingBag,
}

function Trends() {
  const navigate = useNavigate()

  const {
    activities,
    weeklyEmissions: current,
    previousWeekEmissions: previous,
  } = useApp()

  /*
   * Calculate the percentage change
   * between this week and last week.
   */
  const percentageChange =
    previous === 0
      ? current > 0
        ? 100
        : 0
      : ((current - previous) / previous) * 100

  const increased = percentageChange > 0

  /*
   * Calculate emissions for each category.
   */
  const categoryTotals = useMemo(() => {
    return activities.reduce<
      Record<string, number>
    >((totals, activity) => {
      totals[activity.category] =
        (totals[activity.category] ?? 0) +
        activity.emissions

      return totals
    }, {})
  }, [activities])

  const categories = Object.entries(
    categoryTotals,
  ).map(([category, value]) => ({
    category,
    value,
  }))

  /*
   * Create the last seven days of data.
   */
  const weeklyData = useMemo(() => {
    const today = new Date()

    const days = Array.from(
      { length: 7 },
      (_, index) => {
        const date = new Date(today)

        date.setDate(
          today.getDate() - (6 - index),
        )

        return date
      },
    )

    return days.map((date) => {
      const dateKey =
        `${date.getFullYear()}-${String(
          date.getMonth() + 1,
        ).padStart(2, "0")}-${String(
          date.getDate(),
        ).padStart(2, "0")}`

      const emissions = activities
        .filter((activity) => {
          const activityDate =
            new Date(activity.date)

          const activityDateKey =
            `${activityDate.getFullYear()}-${String(
              activityDate.getMonth() + 1,
            ).padStart(2, "0")}-${String(
              activityDate.getDate(),
            ).padStart(2, "0")}`

          return activityDateKey === dateKey
        })
        .reduce(
          (total, activity) =>
            total + activity.emissions,
          0,
        )

      return {
        week: date.toLocaleDateString(
          "en-US",
          {
            weekday: "short",
          },
        ),
        emissions: Number(
          emissions.toFixed(2),
        ),
      }
    })
  }, [activities])

  /*
   * Find the highest daily emission.
   * Used to scale the bars.
   */
  const maxEmission = Math.max(
    ...weeklyData.map(
      (day) => day.emissions,
    ),
    0,
  )

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

      {/* Main content */}

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
              Your progress
            </p>

            <h1 className="text-2xl font-semibold">
              Trends
            </h1>

          </div>

        </header>

        {/* Main comparison */}

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-[var(--card)] to-[var(--card-light)] p-6 shadow-2xl shadow-black/20">

          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            This week
          </p>

          <div className="mt-4 flex items-end gap-2">

            <span className="text-5xl font-semibold">
              {current.toFixed(1)}
            </span>

            <span className="mb-1 text-sm text-[var(--text-secondary)]">
              kg CO₂e
            </span>

          </div>

          <div className="mt-5 flex items-center gap-2">

            {increased ? (
              <ArrowUpRight
                size={18}
                className="text-[var(--warning)]"
              />
            ) : (
              <ArrowDownRight
                size={18}
                className="text-[var(--success)]"
              />
            )}

            <span
              className={
                increased
                  ? "text-sm font-medium text-[var(--warning)]"
                  : "text-sm font-medium text-[var(--success)]"
              }
            >
              {increased ? "+" : ""}
              {percentageChange.toFixed(1)}%
            </span>

            <span className="text-sm text-[var(--text-muted)]">
              compared with last week
            </span>

          </div>

        </section>

        {/* Weekly pattern */}

        <section className="mt-8">

          <div>

            <p className="text-lg font-medium">
              Weekly pattern
            </p>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Your daily emissions
            </p>

          </div>

          <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)] p-4 shadow-lg shadow-black/10">

            <div className="flex h-52 items-end justify-between gap-2">

              {weeklyData.map((day) => {

                /*
                 * If there are no emissions yet,
                 * give the bar a very small height
                 * so the chart remains visible.
                 */
                const height =
                  maxEmission === 0
                    ? 2
                    : Math.max(
                        (day.emissions /
                          maxEmission) *
                          100,
                        day.emissions > 0
                          ? 4
                          : 2,
                      )

                return (
                  <div
                    key={day.week}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                  >

                    <div className="flex h-full w-full items-end justify-center">

                      <div
                        className="w-full max-w-[22px] rounded-t-full bg-[var(--lavender)]/70 transition-all duration-500"
                        style={{
                          height: `${height}%`,
                        }}
                        title={`${day.emissions} kg CO₂e`}
                      />

                    </div>

                    <span className="text-[10px] text-[var(--text-muted)]">
                      {day.week}
                    </span>

                  </div>
                )
              })}

            </div>

          </div>

        </section>

        {/* Category breakdown */}

        <section className="mt-8">

          <p className="text-lg font-medium">
            This week's impact
          </p>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Your main sources of emissions
          </p>

          <div className="mt-4 space-y-3">

            {categories.length === 0 ? (

              <div className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">

                <p className="text-sm text-[var(--text-muted)]">
                  No activities logged yet.
                </p>

              </div>

            ) : (

              categories.map((item) => {

                const Icon =
                  categoryIcons[
                    item.category as keyof typeof categoryIcons
                  ] ?? Car

                const percentage =
                  current === 0
                    ? 0
                    : (item.value /
                        current) *
                      100

                return (
                  <div
                    key={item.category}
                    className="rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-4"
                  >

                    <div className="flex items-center justify-between">

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--lavender)]/10">

                          <Icon
                            size={18}
                            className="text-[var(--lavender)]"
                          />

                        </div>

                        <div>

                          <p className="text-sm font-medium">
                            {item.category}
                          </p>

                          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                            {percentage.toFixed(0)}%
                            {" "}
                            of total
                          </p>

                        </div>

                      </div>

                      <p className="text-sm font-semibold">

                        {item.value.toFixed(1)}

                        <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">
                          kg
                        </span>

                      </p>

                    </div>

                    {/* Progress bar */}

                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">

                      <div
                        className="h-full rounded-full bg-[var(--lavender)]/60 transition-all duration-700"
                        style={{
                          width: `${Math.min(
                            percentage,
                            100,
                          )}%`,
                        }}
                      />

                    </div>

                  </div>
                )
              })

            )}

          </div>

        </section>

        {/* Insight */}

        <section className="mt-8 rounded-[1.75rem] border border-white/10 bg-[var(--bg-secondary)] p-5">

          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--lavender)]">
            Your progress
          </p>

          <h2 className="mt-3 text-xl font-semibold">

            {increased
              ? "Your emissions increased this week."
              : "Your emissions decreased this week."}

          </h2>

          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">

            {increased
              ? "Take a look at your main contributors and see where small changes could reduce your footprint."
              : "That's a great step. Keep building on the habits that helped lower your footprint."}

          </p>

        </section>

      </div>

    </div>
  )
}

export default Trends