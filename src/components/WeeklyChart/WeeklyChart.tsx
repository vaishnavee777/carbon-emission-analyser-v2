import { useMemo } from "react"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

import { useApp } from "../../context/useApp"

function WeeklyChart() {
  const { activities } = useApp()

  const weeklyData = useMemo(() => {
    const today = new Date()

    /*
     * Create the last 7 days.
     *
     * We start from 6 days ago and move
     * forward until today.
     */
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
      /*
       * Convert the date into YYYY-MM-DD.
       *
       * We use this to compare activities
       * recorded on the same day.
       */
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

  return (
    <div className="mt-4 h-52 w-full rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)] p-4 shadow-lg shadow-black/10">

      <ResponsiveContainer
        width="100%"
        height="100%"
      >

        <LineChart
          data={weeklyData}
          margin={{
            top: 10,
            right: 4,
            left: -28,
            bottom: 0,
          }}
        >

          <XAxis
            dataKey="week"
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "#9688aa",
              fontSize: 11,
            }}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "#9688aa",
              fontSize: 10,
            }}
          />

          <Tooltip
            contentStyle={{
              background: "#49366d",
              border:
                "1px solid rgba(255,255,255,0.1)",
              borderRadius: "14px",
              color: "#faf7ff",
            }}
            labelStyle={{
              color: "#c6bad8",
            }}
            formatter={(value) => [
              `${Number(value).toFixed(1)} kg`,
              "CO₂e",
            ]}
          />

          <Line
            type="monotone"
            dataKey="emissions"
            stroke="#cdb8e8"
            strokeWidth={3}
            dot={false}
            activeDot={{
              r: 5,
            }}
          />

        </LineChart>

      </ResponsiveContainer>

    </div>
  )
}

export default WeeklyChart