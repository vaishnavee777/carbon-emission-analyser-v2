import { useState } from "react"
import { ArrowLeft, Car, Zap, Utensils, ShoppingBag, Check } from "lucide-react"
import { useNavigate } from "react-router"

const categories = [
  {
    name: "Transportation",
    icon: Car,
    activities: [
      { name: "Car", unit: "km" },
      { name: "Bus", unit: "km" },
    ],
  },
  {
    name: "Electricity",
    icon: Zap,
    activities: [
      { name: "Electricity", unit: "kWh" },
    ],
  },
  {
    name: "Food",
    icon: Utensils,
    activities: [
      { name: "Meal", unit: "meal" },
    ],
  },
  {
    name: "Shopping",
    icon: ShoppingBag,
    activities: [
      { name: "Purchase", unit: "₹" },
    ],
  },
]

function LogActivity() {
  const navigate = useNavigate()

  const [category, setCategory] = useState("Transportation")
  const [activity, setActivity] = useState("Car")
  const [quantity, setQuantity] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const selectedCategory = categories.find(
    (item) => item.name === category
  )

  const availableActivities =
    selectedCategory?.activities ?? []

  const selectedActivity =
    availableActivities.find(
      (item) => item.name === activity
    )

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory)

    const categoryData = categories.find(
      (item) => item.name === newCategory
    )

    if (categoryData) {
      setActivity(categoryData.activities[0].name)
    }

    setError("")
  }

  const handleSubmit = async () => {
    setError("")
    setSuccess(false)

    if (!quantity || Number(quantity) <= 0) {
      setError("Please enter a valid quantity.")
      return
    }

    if (!selectedActivity) {
      setError("Please select an activity.")
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/activities/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: 1,
            category,
            activity,
            quantity: Number(quantity),
            unit: selectedActivity.unit,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to save activity."
        )
      }

      console.log("Activity saved:", data)

      setSuccess(true)
      setQuantity("")

      setTimeout(() => {
        navigate("/")
      }, 1000)
    } catch (err) {
      console.error(err)

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-5">

      {/* Background atmosphere */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div className="absolute -right-24 top-20 h-64 w-64 rounded-full bg-purple-400/10 blur-3xl" />

        <div className="absolute -left-32 top-[45%] h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl" />

        <div className="absolute right-8 top-24 text-xs text-purple-200/30">
          ✦
        </div>

        <div className="absolute left-12 top-40 text-[8px] text-purple-200/30">
          ✦
        </div>

      </div>

      <div className="relative z-10 pb-32">

        {/* Header */}
        <header className="flex items-center gap-4 pt-8">

          <button
            onClick={() => navigate("/")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition hover:bg-white/10"
            aria-label="Go back"
          >
            <ArrowLeft size={19} />
          </button>

          <div>
            <p className="text-sm text-[var(--text-muted)]">
              Track your impact
            </p>

            <h1 className="text-2xl font-semibold">
              Log activity
            </h1>
          </div>

        </header>

        {/* Category */}
        <section className="mt-8">

          <p className="text-lg font-medium">
            What did you do?
          </p>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Choose a category
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">

            {categories.map((item) => {

              const Icon = item.icon

              const selected =
                category === item.name

              return (
                <button
                  key={item.name}
                  onClick={() =>
                    handleCategoryChange(item.name)
                  }
                  className={`rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-[var(--lavender)] bg-[var(--lavender)]/15"
                      : "border-white/10 bg-[var(--bg-secondary)]"
                  }`}
                >

                  <div className="flex items-center justify-between">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--lavender)]/10">
                      <Icon
                        size={19}
                        className="text-[var(--lavender)]"
                      />
                    </div>

                    {selected && (
                      <Check
                        size={17}
                        className="text-[var(--lavender)]"
                      />
                    )}

                  </div>

                  <p className="mt-3 text-sm font-medium">
                    {item.name}
                  </p>

                </button>
              )
            })}

          </div>

        </section>

        {/* Activity */}
        <section className="mt-8">

          <p className="text-lg font-medium">
            Activity
          </p>

          <div className="mt-4 space-y-2">

            {availableActivities.map((item) => {

              const selected =
                activity === item.name

              return (
                <button
                  key={item.name}
                  onClick={() =>
                    setActivity(item.name)
                  }
                  className={`flex w-full items-center justify-between rounded-2xl border p-4 transition ${
                    selected
                      ? "border-[var(--lavender)] bg-[var(--lavender)]/15"
                      : "border-white/10 bg-[var(--bg-secondary)]"
                  }`}
                >

                  <span className="text-sm font-medium">
                    {item.name}
                  </span>

                  <span className="text-xs text-[var(--text-muted)]">
                    per {item.unit}
                  </span>

                </button>
              )
            })}

          </div>

        </section>

        {/* Quantity */}
        <section className="mt-8">

          <p className="text-lg font-medium">
            How much?
          </p>

          <div className="mt-4 rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-5">

            <div className="flex items-center gap-3">

              <input
                type="number"
                min="0"
                step="0.1"
                value={quantity}
                onChange={(event) =>
                  setQuantity(event.target.value)
                }
                placeholder="0"
                className="w-full bg-transparent text-4xl font-semibold outline-none placeholder:text-white/20"
              />

              <span className="whitespace-nowrap text-sm text-[var(--text-muted)]">
                {selectedActivity?.unit}
              </span>

            </div>

          </div>

        </section>

        {/* Error */}
        {error && (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mt-5 rounded-2xl border border-green-400/20 bg-green-400/10 p-4 text-sm text-green-200">
            Activity saved successfully!
          </div>
        )}

        {/* Submit */}
        <div className="mt-8">

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex w-full items-center justify-center rounded-2xl bg-[var(--lavender-light)] px-6 py-4 text-sm font-semibold text-[var(--bg-deep)] shadow-lg shadow-purple-950/30 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Saving..."
              : "Save activity"}
          </button>

        </div>

      </div>

    </div>
  )
}

export default LogActivity