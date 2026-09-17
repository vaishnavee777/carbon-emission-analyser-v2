import { useApp } from "../../context/useApp"

import {
  Bell,
  ChevronRight,
  Clock3,
  Leaf,
  Target,
  User,
  Settings,
  Info,
} from "lucide-react"

function Profile() {
  const {
    settings,
    updateSettings,
  } = useApp()

  return (
    <div className="relative min-h-screen overflow-hidden px-5">

      {/* Background atmosphere */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div className="absolute -right-24 top-16 h-64 w-64 rounded-full bg-purple-400/10 blur-3xl" />

        <div className="absolute -left-32 top-[45%] h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl" />

        <div className="absolute right-10 top-24 text-xs text-purple-200/30">
          ✦
        </div>

        <div className="absolute left-10 top-48 text-[8px] text-purple-200/30">
          ✦
        </div>

      </div>

      {/* Main content */}

      <div className="relative z-10 pb-32">

        {/* Header */}

        <header className="pt-8">

          <p className="text-sm text-[var(--text-muted)]">
            Account
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Profile
          </h1>

        </header>

        {/* Profile card */}

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-gradient-to-br from-[var(--card)] to-[var(--card-light)] p-6 shadow-xl shadow-black/20">

          <div className="flex items-center gap-4">

            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--lavender-light)] text-xl font-semibold text-[var(--bg-deep)]">
              LS
            </div>

            <div>

              <h2 className="text-xl font-semibold">
                Lahari
              </h2>

              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Building a lower-carbon lifestyle
              </p>

            </div>

          </div>

        </section>

        {/* Goals */}

        <section className="mt-8">

          <p className="text-lg font-medium">
            Your goals
          </p>

          <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-[var(--bg-secondary)] p-5">

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--lavender)]/10">

                  <Target
                    size={20}
                    className="text-[var(--lavender)]"
                  />

                </div>

                <div>

                  <p className="text-sm font-medium">
                    Weekly target
                  </p>

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Your current goal
                  </p>

                </div>

              </div>

              <p className="text-lg font-semibold">

                50

                <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">
                  kg CO₂e
                </span>

              </p>

            </div>

          </div>

        </section>

        {/* Notifications */}

        <section className="mt-8">

          <p className="text-lg font-medium">
            Notifications
          </p>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Stay on top of your daily progress
          </p>

          <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[var(--bg-secondary)]">

            {/* Daily reminder */}

            <div className="flex items-center justify-between p-5">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--lavender)]/10">

                  <Bell
                    size={19}
                    className="text-[var(--lavender)]"
                  />

                </div>

                <div>

                  <p className="text-sm font-medium">
                    Daily reminder
                  </p>

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Remind me to log my day
                  </p>

                </div>

              </div>

              <button
                onClick={() =>
                  updateSettings({
                    dailyReminder:
                      !settings.dailyReminder,
                  })
                }
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  settings.dailyReminder
                    ? "bg-[var(--lavender)]"
                    : "bg-white/10"
                }`}
                aria-label="Toggle daily reminder"
              >

                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    settings.dailyReminder
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />

              </button>

            </div>

            {/* Reminder time */}

            <div className="border-t border-white/10">

              <label className="flex cursor-pointer items-center justify-between p-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--lavender)]/10">

                    <Clock3
                      size={19}
                      className="text-[var(--lavender)]"
                    />

                  </div>

                  <div>

                    <p className="text-sm font-medium">
                      Reminder time
                    </p>

                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      When should we remind you?
                    </p>

                  </div>

                </div>

                <input
                  type="time"
                  value={settings.reminderTime}
                  onChange={(event) =>
                    updateSettings({
                      reminderTime:
                        event.target.value,
                    })
                  }
                  className="rounded-lg border border-white/10 bg-[var(--bg-primary)] px-2 py-1 text-sm text-[var(--text-primary)] outline-none"
                />

              </label>

            </div>

            {/* Weekly summary */}

            <div className="border-t border-white/10">

              <div className="flex items-center justify-between p-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--lavender)]/10">

                    <Leaf
                      size={19}
                      className="text-[var(--lavender)]"
                    />

                  </div>

                  <div>

                    <p className="text-sm font-medium">
                      Weekly summary
                    </p>

                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Get a weekly progress update
                    </p>

                  </div>

                </div>

                <button
                  onClick={() =>
                    updateSettings({
                      weeklySummary:
                        !settings.weeklySummary,
                    })
                  }
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    settings.weeklySummary
                      ? "bg-[var(--lavender)]"
                      : "bg-white/10"
                  }`}
                  aria-label="Toggle weekly summary"
                >

                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      settings.weeklySummary
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />

                </button>

              </div>

            </div>

          </div>

        </section>

        {/* Preferences */}

        <section className="mt-8">

          <p className="text-lg font-medium">
            Preferences
          </p>

          <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[var(--bg-secondary)]">

            {/* Units */}

            <button
              onClick={() =>
                updateSettings({
                  units:
                    settings.units ===
                    "metric"
                      ? "imperial"
                      : "metric",
                })
              }
              className="flex w-full items-center justify-between border-b border-white/10 p-5 text-left transition hover:bg-white/[0.02]"
            >

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--lavender)]/10">

                  <Settings
                    size={19}
                    className="text-[var(--lavender)]"
                  />

                </div>

                <div>

                  <p className="text-sm font-medium">
                    Units
                  </p>

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Distance and energy measurements
                  </p>

                </div>

              </div>

              <div className="flex items-center gap-2">

                <span className="text-xs text-[var(--text-muted)]">
                  {settings.units ===
                  "metric"
                    ? "Metric"
                    : "Imperial"}
                </span>

                <ChevronRight
                  size={17}
                  className="text-[var(--text-muted)]"
                />

              </div>

            </button>

            {/* About */}

            <button
              className="flex w-full items-center justify-between p-5 text-left"
            >

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--lavender)]/10">

                  <Info
                    size={19}
                    className="text-[var(--lavender)]"
                  />

                </div>

                <div>

                  <p className="text-sm font-medium">
                    About
                  </p>

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    How Carbon Analyser works
                  </p>

                </div>

              </div>

              <ChevronRight
                size={17}
                className="text-[var(--text-muted)]"
              />

            </button>

          </div>

        </section>

        {/* Future tree placeholder */}

        <section className="mt-8 rounded-[1.75rem] border border-dashed border-[var(--lavender)]/20 bg-[var(--lavender)]/5 p-5">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--lavender)]/10">

              <User
                size={19}
                className="text-[var(--lavender)]"
              />

            </div>

            <div>

              <p className="text-sm font-medium">
                Your environmental journey
              </p>

              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                Your personal impact visualization
                will appear here in a future version.
              </p>

            </div>

          </div>

        </section>

      </div>

    </div>
  )
}

export default Profile