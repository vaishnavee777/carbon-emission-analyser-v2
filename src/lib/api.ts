export interface User {
  id: number
  name: string
  email: string | null
  created_at: string
}

export const UNAUTHORIZED_EVENT = "auth:unauthorized"

export interface ApiActivity {
  id: number
  user_id: number
  category: string
  activity: string
  quantity: number
  unit: string
  emissions: number
  activity_date: string
}

export interface EmissionFactor {
  id: number
  category: string
  activity: string
  unit: string
  factor: number
}

export interface ModelInfo {
  parameters: number
  epochs_run: number
  max_epochs: number
  val_mae_kg: number
  val_r2: number
  training_duration_s: number
  training_energy_kwh: number
  training_emissions_kg: number
}

export interface GridAdjustment {
  electricity_share: number
  historical_g_per_kwh: number
  current_g_per_kwh: number
  source: GridSource
  zone: string
  multiplier: number
}

export interface Forecast {
  forecast: {
    date: string
    behavioural_emissions: number
    predicted_emissions: number
  }[]
  total_predicted_kg: number
  inference_ms: number
  grid_adjustment: GridAdjustment
  model: ModelInfo
}

export type GridSource = "live" | "cached" | "historical" | "static"

export interface GridIntensityAt {
  zone: string
  g_per_kwh: number
  source: GridSource
  measured_at: string | null
  is_estimated: boolean
}

export interface TripSummary {
  started_at: string
  ended_at: string
  distance_km: number
  median_speed_kmh: number
  p95_speed_kmh: number
  speed_cv: number
  stop_fraction: number
  walking_motion_fraction: number | null
  sample_count: number
}

export interface TripOption {
  activity: string
  factor: number
  estimated_kg: number
}

export interface TripResult {
  id: number
  distance_km: number
  duration_min: number
  detected: { activity: string; confidence: number; reason: string }
  options: TripOption[]
}

export interface OffsetSuggestions {
  period_days: number
  footprint_kg: number
  annualised_kg: number
  trees_to_absorb_a_year: number
  by_category: { category: string; kg: number; share: number }[]
  reductions: {
    category: string
    title: string
    detail: string
    saving_kg: number
    saving_kg_per_year: number
  }[]
  remaining_kg: number
  offsets: {
    type: string
    kind: "removal" | "avoidance"
    durability: string
    price_usd_per_t: [number, number]
    cost_usd: [number, number]
  }[]
}

export interface GridIntensity {
  zone: string
  g_per_kwh: number
  source: GridSource
  provider: string | null
  measured_at: string | null
  is_estimated: boolean
  live_configured: boolean
  static_g_per_kwh: number
  level: "low" | "moderate" | "high" | null
  average_24h: number | null
  min_24h: number | null
  max_24h: number | null
  history: { measured_at: string; g_per_kwh: number }[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  const data = await response.json().catch(() => ({}))
  if (response.status === 401 && !path.startsWith("/auth/")) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }
  if (!response.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((d: { msg?: string }) => d.msg?.replace(/^Value error, /, "")).join(" ")
      : data.detail
    throw new Error(detail || `Request failed (${response.status})`)
  }
  return data as T
}

export const api = {
  me: () => request<User>("/auth/me"),

  login: (email: string, password: string) =>
    request<User>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string) =>
    request<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  logout: () => request<void>("/auth/logout", { method: "POST" }),

  activities: () =>
    request<ApiActivity[]>("/activities/"),

  createActivity: (body: {
    category: string
    activity: string
    quantity: number
    unit: string
    activity_date?: string
  }) =>
    request<ApiActivity>("/activities/", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  emissionFactors: () =>
    request<EmissionFactor[]>("/emission-factors/"),

  forecast: (days = 7) =>
    request<Forecast>(`/predictions/forecast?days=${days}`),

  gridIntensity: () =>
    request<GridIntensity>("/grid/intensity"),

  gridIntensityAt: (isoTime: string) =>
    request<GridIntensityAt>(`/grid/intensity/at?time=${encodeURIComponent(isoTime)}`),

  createTrip: (summary: TripSummary) =>
    request<TripResult>("/trips/", {
      method: "POST",
      body: JSON.stringify(summary),
    }),

  confirmTrip: (id: number, activity: string) =>
    request<{ activity_id: number; activity: string; distance_km: number; emissions: number }>(
      `/trips/${id}/confirm`,
      { method: "POST", body: JSON.stringify({ activity }) },
    ),

  discardTrip: (id: number) =>
    request<void>(`/trips/${id}`, { method: "DELETE" }),

  offsetSuggestions: (days: number) =>
    request<OffsetSuggestions>(`/offsets/suggestions?days=${days}`),

  vapidPublicKey: () =>
    request<{ public_key: string }>("/notifications/vapid-public-key"),

  subscribe: (body: unknown) =>
    request("/notifications/subscribe", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  unsubscribe: (endpoint: string) =>
    request("/notifications/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint }),
    }),

  testNotification: () =>
    request("/notifications/test", { method: "POST" }),
}
