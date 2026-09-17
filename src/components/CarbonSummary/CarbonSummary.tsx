import { ArrowUpRight, ArrowDownRight } from "lucide-react"

interface CarbonSummaryProps {
  current: number
  previous: number
}

function CarbonSummary({
  current,
  previous,
}: CarbonSummaryProps) {

  const percentageChange =
    ((current - previous) / previous) * 100

  const increased = percentageChange > 0

  return (
    <section className="relative mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[var(--card)] to-[var(--card-light)] p-6 shadow-2xl shadow-black/20">

      {/* Decorative glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[var(--lavender)]/10 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-purple-300/10 blur-3xl" />

      <div className="relative">

        {/* Label */}
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          This week
        </p>

        {/* Main number */}
        <div className="mt-5 flex items-end gap-2">

          <span className="text-5xl font-semibold tracking-tight">
            {current.toFixed(1)}
          </span>

          <span className="mb-1 text-sm text-[var(--text-secondary)]">
            kg CO₂e
          </span>

        </div>

        {/* Comparison */}
        <div className="mt-5 flex items-center gap-2">

          {increased ? (
            <ArrowUpRight
              size={17}
              className="text-[var(--warning)]"
            />
          ) : (
            <ArrowDownRight
              size={17}
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
            from last week
          </span>

        </div>

      </div>

    </section>
  )
}

export default CarbonSummary