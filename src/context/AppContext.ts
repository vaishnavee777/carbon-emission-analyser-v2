import { createContext } from "react"

export interface Activity {
  id: string
  category: string
  activity: string
  quantity: number
  unit: string
  emissions: number
  date: string
}

export interface AppSettings {
  units: "metric" | "imperial"
  dailyReminder: boolean
  weeklySummary: boolean
  reminderTime: string
  weeklyGoal: number
}

export interface AppContextType {
  activities: Activity[]
  activitiesLoading: boolean
  activitiesError: string | null
  refreshActivities: () => Promise<void>

  settings: AppSettings

  updateSettings: (
    settings: Partial<AppSettings>
  ) => void

  weeklyEmissions: number
  previousWeekEmissions: number
  monthlyEmissions: number
}

export const AppContext =
  createContext<AppContextType | undefined>(
    undefined
  )
