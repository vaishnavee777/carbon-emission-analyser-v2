import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import {
  AppContext,
  type Activity,
  type AppSettings,
} from "./AppContext"

import { api } from "../lib/api"
import { useAuth } from "./useAuth"

const defaultSettings: AppSettings = {
  units: "metric",
  dailyReminder: false,
  weeklySummary: true,
  reminderTime: "20:00",
  weeklyGoal: 50,
}

function settingsKey(userId: number) {
  return `carbon-settings-${userId}`
}

function getStoredSettings(userId: number): AppSettings {
  try {
    const stored =
      localStorage.getItem(
        settingsKey(userId),
      )

    return stored
      ? { ...defaultSettings, ...JSON.parse(stored) }
      : defaultSettings
  } catch {
    return defaultSettings
  }
}

function sumBetween(
  activities: Activity[],
  start: Date,
  end: Date,
) {
  return activities
    .filter((activity) => {
      const date = new Date(activity.date)
      return date >= start && date < end
    })
    .reduce(
      (total, activity) =>
        total + activity.emissions,
      0,
    )
}

export function AppProvider({
  children,
}: {
  children: ReactNode
}) {
  const [activities, setActivities] =
    useState<Activity[]>([])

  const [activitiesLoading, setActivitiesLoading] =
    useState(true)

  const [activitiesError, setActivitiesError] =
    useState<string | null>(null)

  const { user } = useAuth()
  const userId = user!.id

  const [settings, setSettings] =
    useState<AppSettings>(
      () => getStoredSettings(userId),
    )

  const refreshActivities = useCallback(async () => {
    try {
      const data = await api.activities()

      setActivities(
        data.map((activity) => ({
          id: String(activity.id),
          category: activity.category,
          activity: activity.activity,
          quantity: activity.quantity,
          unit: activity.unit,
          emissions: activity.emissions,
          // Backend stores naive UTC timestamps.
          date: `${activity.activity_date}Z`,
        })),
      )
      setActivitiesError(null)
    } catch (error) {
      setActivitiesError(
        error instanceof Error
          ? error.message
          : "Couldn't load activities.",
      )
    } finally {
      setActivitiesLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial load from the API; state updates happen after the fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshActivities()
  }, [refreshActivities])

  useEffect(() => {
    try {
      localStorage.setItem(
        settingsKey(userId),
        JSON.stringify(settings),
      )
    } catch {
      // Storage unavailable (private mode); settings stay in memory.
    }
  }, [settings, userId])

  function updateSettings(
    newSettings: Partial<AppSettings>,
  ) {
    setSettings((current) => ({
      ...current,
      ...newSettings,
    }))
  }

  const {
    weeklyEmissions,
    previousWeekEmissions,
    monthlyEmissions,
  } = useMemo(() => {
    const now = new Date()

    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    const startOfPreviousWeek = new Date(startOfWeek)
    startOfPreviousWeek.setDate(startOfWeek.getDate() - 7)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const farFuture = new Date(8.64e15)

    return {
      weeklyEmissions: sumBetween(activities, startOfWeek, farFuture),
      previousWeekEmissions: sumBetween(activities, startOfPreviousWeek, startOfWeek),
      monthlyEmissions: sumBetween(activities, startOfMonth, farFuture),
    }
  }, [activities])

  return (
    <AppContext.Provider
      value={{
        activities,
        activitiesLoading,
        activitiesError,
        refreshActivities,
        settings,
        updateSettings,
        weeklyEmissions,
        previousWeekEmissions,
        monthlyEmissions,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
