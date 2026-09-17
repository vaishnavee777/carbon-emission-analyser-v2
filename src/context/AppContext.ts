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
}

export interface AppContextType {
  activities: Activity[]
  settings: AppSettings

  addActivity: (
    activity: Omit<Activity, "id" | "date">
  ) => void

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