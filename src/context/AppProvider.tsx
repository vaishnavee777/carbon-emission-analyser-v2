import {
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

const initialActivities: Activity[] = [
  {
    id: "1",
    category: "Transportation",
    activity: "Car",
    quantity: 15,
    unit: "km",
    emissions: 2.7,
    date: new Date().toISOString(),
  },
  {
    id: "2",
    category: "Electricity",
    activity: "Electricity",
    quantity: 16,
    unit: "kWh",
    emissions: 11.2,
    date: new Date().toISOString(),
  },
  {
    id: "3",
    category: "Food",
    activity: "Meal",
    quantity: 3,
    unit: "meal",
    emissions: 7.5,
    date: new Date().toISOString(),
  },
]

const defaultSettings: AppSettings = {
  units: "metric",
  dailyReminder: true,
  weeklySummary: true,
  reminderTime: "20:00",
}

function getStoredActivities(): Activity[] {
  try {
    const stored =
      localStorage.getItem(
        "carbon-activities",
      )

    if (!stored) {
      return initialActivities
    }

    return JSON.parse(stored)
  } catch {
    return initialActivities
  }
}

function getStoredSettings(): AppSettings {
  try {
    const stored =
      localStorage.getItem(
        "carbon-settings",
      )

    if (!stored) {
      return defaultSettings
    }

    return JSON.parse(stored)
  } catch {
    return defaultSettings
  }
}

export function AppProvider({
  children,
}: {
  children: ReactNode
}) {
  const [activities, setActivities] =
    useState<Activity[]>(
      getStoredActivities,
    )

  const [settings, setSettings] =
    useState<AppSettings>(
      getStoredSettings,
    )

  /*
   * Save activities whenever they change.
   */
  useEffect(() => {
    localStorage.setItem(
      "carbon-activities",
      JSON.stringify(activities),
    )
  }, [activities])

  /*
   * Save settings whenever they change.
   */
  useEffect(() => {
    localStorage.setItem(
      "carbon-settings",
      JSON.stringify(settings),
    )
  }, [settings])

  function addActivity(
    activity: Omit<Activity, "id" | "date">,
  ) {
    const newActivity: Activity = {
      ...activity,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
    }

    setActivities((current) => [
      ...current,
      newActivity,
    ])
  }

  function updateSettings(
    newSettings: Partial<AppSettings>,
  ) {
    setSettings((current) => ({
      ...current,
      ...newSettings,
    }))
  }

  const weeklyEmissions = useMemo(() => {
    const now = new Date()

    const startOfWeek = new Date(now)

    startOfWeek.setDate(
      now.getDate() - now.getDay(),
    )

    startOfWeek.setHours(
      0,
      0,
      0,
      0,
    )

    return activities
      .filter((activity) => {
        const activityDate =
          new Date(activity.date)

        return activityDate >= startOfWeek
      })
      .reduce(
        (total, activity) =>
          total + activity.emissions,
        0,
      )
  }, [activities])

  /*
   * Temporary previous-week value.
   *
   * Later this will be calculated from
   * historical MySQL data.
   */
  const previousWeekEmissions = 42

  const monthlyEmissions =
    weeklyEmissions * 4

  return (
    <AppContext.Provider
      value={{
        activities,
        settings,
        addActivity,
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