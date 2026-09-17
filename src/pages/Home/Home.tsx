import PageHeader from "../../components/PageHeader/PageHeader"
import CarbonSummary from "../../components/CarbonSummary/CarbonSummary"
import WeeklyChart from "../../components/WeeklyChart/WeeklyChart"
import CategoryCard from "../../components/CategoryCard/CategoryCard"

import { useApp } from "../../context/useApp"

function Home() {
  const {
    activities,
    weeklyEmissions,
    previousWeekEmissions,
  } = useApp()

  
  const categoryTotals = activities.reduce<
    Record<string, number>
  >((totals, activity) => {
    totals[activity.category] =
      (totals[activity.category] ?? 0) +
      activity.emissions

    return totals
  }, {})

  
  const categoryIcons: Record<string, string> = {
    Transportation: "car",
    Electricity: "zap",
    Food: "utensils",
    Shopping: "shopping-bag",
  }

  const categories = Object.entries(
    categoryTotals,
  ).map(([category, value]) => ({
    category,
    value,
    icon: categoryIcons[category] ?? "car",
  }))

  return (
    <div className="relative min-h-screen overflow-hidden px-5">

      {/* Atmospheric background */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div className="absolute -right-24 top-16 h-64 w-64 rounded-full bg-purple-400/10 blur-3xl" />

        <div className="absolute -left-32 top-[40%] h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl" />

        {/* Decorative stars */}

        <div className="absolute right-10 top-28 text-xs text-purple-200/40">
          ✦
        </div>

        <div className="absolute left-8 top-48 text-[8px] text-purple-200/30">
          ✦
        </div>

        <div className="absolute right-24 top-[35%] text-[6px] text-white/30">
          ✦
        </div>

        <div className="absolute left-20 top-[65%] text-[7px] text-purple-200/30">
          ✦
        </div>

      </div>

      {/* Main content */}

      <div className="relative z-10">

        {/* Header */}

        <PageHeader
          eyebrow="Good evening"
          title="Your footprint"
        />

        {/* Carbon summary */}

        <CarbonSummary
          current={weeklyEmissions}
          previous={previousWeekEmissions}
        />

        {/* Weekly chart */}

        <section className="mt-8">

          <div className="flex items-end justify-between">

            <div>

              <p className="text-lg font-medium">
                Your week
              </p>

              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Daily carbon footprint
              </p>

            </div>

          </div>

          <WeeklyChart />

        </section>

        {/* Main contributors */}

        <section className="mt-8">

          <p className="text-lg font-medium">
            Main contributors
          </p>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Where your footprint comes from
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">

            {categories.map((item) => (
              <CategoryCard
                key={item.category}
                category={item.category}
                value={item.value}
                icon={item.icon}
              />
            ))}

          </div>

        </section>

        {/* Log activity button */}

        <div className="mt-6 pb-32">

          <button
            onClick={() => {
              window.location.href = "/log"
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--lavender-light)] px-6 py-4 text-sm font-semibold text-[var(--bg-deep)] shadow-lg shadow-purple-950/30 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >

            <span className="text-lg">
              +
            </span>

            Log activity

          </button>

        </div>

      </div>

    </div>
  )
}

export default Home