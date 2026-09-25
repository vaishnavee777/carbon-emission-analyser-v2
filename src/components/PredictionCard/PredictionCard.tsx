import { useEffect, useState } from "react"
import { BrainCircuit, Leaf } from "lucide-react"

import { api, type Forecast } from "../../lib/api"

function formatEnergy(kwh: number) {
  const wh = kwh * 1000
  return wh >= 1 ? `${wh.toFixed(2)} Wh` : `${(wh * 1000).toFixed(2)} mWh`
}

function formatMass(kg: number) {
  const grams = kg * 1000
  return grams >= 1 ? `${grams.toFixed(2)} g` : `${(grams * 1000).toFixed(2)} mg`
}

function PredictionCard({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<Forecast | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .forecast(7)
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
  }, [refreshKey])

  const max = Math.max(1e-6, ...(data?.forecast.map((p) => p.predicted_emissions) ?? []))

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2">
        <BrainCircuit size={18} className="text-[var(--lavender)]" />
        <p className="text-lg font-medium">Next 7 days</p>
      </div>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Forecast by an energy-aware neural network
      </p>

      <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-[var(--bg-secondary)] p-5">
        {error && (
          <p className="text-sm text-red-200">Couldn't load forecast: {error}</p>
        )}

        {!data && !error && (
          <p className="text-sm text-[var(--text-muted)]">Forecasting…</p>
        )}

        {data && (
          <>
            <p className="text-3xl font-semibold">
              {data.total_predicted_kg.toFixed(1)}
              <span className="ml-1 text-sm font-normal text-[var(--text-muted)]">
                kg CO₂e expected
              </span>
            </p>

            <div className="mt-5 flex h-20 items-end gap-2">
              {data.forecast.map((point) => (
                <div key={point.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-md bg-[var(--lavender)]/60"
                    style={{ height: `${Math.max(6, (point.predicted_emissions / max) * 64)}px` }}
                    title={`${point.predicted_emissions.toFixed(2)} kg`}
                  />
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {new Date(`${point.date}T00:00`).toLocaleDateString(undefined, { weekday: "narrow" })}
                  </span>
                </div>
              ))}
            </div>

            {data.grid_adjustment.source !== "static" &&
              data.grid_adjustment.electricity_share > 0 && (
                <p className="mt-4 text-xs text-[var(--text-secondary)]">
                  Electricity is {(data.grid_adjustment.electricity_share * 100).toFixed(0)}% of
                  your footprint. Adjusted for today's grid ({Math.round(data.grid_adjustment.current_g_per_kwh)}{" "}
                  vs {Math.round(data.grid_adjustment.historical_g_per_kwh)} g/kWh in your history):{" "}
                  {data.grid_adjustment.multiplier >= 1 ? "+" : ""}
                  {((data.grid_adjustment.multiplier - 1) * 100).toFixed(1)}%.
                </p>
              )}

            <div className="mt-5 flex items-start gap-2 rounded-xl bg-white/5 p-3 text-xs text-[var(--text-secondary)]">
              <Leaf size={14} className="mt-0.5 shrink-0 text-[var(--success)]" />
              <p>
                This model has {data.model.parameters} parameters and stopped training after{" "}
                {data.model.epochs_run} of {data.model.max_epochs} epochs. Training used{" "}
                {formatEnergy(data.model.training_energy_kwh)} and emitted{" "}
                {formatMass(data.model.training_emissions_kg)} CO₂e. This forecast took{" "}
                {data.inference_ms.toFixed(1)} ms.
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default PredictionCard
