import { useState, type FormEvent } from "react"
import { Eye, EyeOff, Leaf } from "lucide-react"
import { Navigate, useLocation, useNavigate } from "react-router"

import { useAuth } from "../../context/useAuth"
import { forgetEmail, lastEmail } from "../../lib/lastEmail"

type Mode = "signin" | "signup"

const inputClass =
  "mt-2 w-full rounded-2xl border border-white/10 bg-[var(--bg-secondary)] px-4 py-3.5 text-base text-[var(--text-primary)] outline-none transition placeholder:text-white/25 focus:border-[var(--lavender)]"

function Login() {
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [rememberedEmail, setRememberedEmail] = useState(lastEmail)
  const [mode, setMode] = useState<Mode>(rememberedEmail ? "signin" : "signup")
  const [name, setName] = useState("")
  const [email, setEmail] = useState(rememberedEmail)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const destination = (location.state as { from?: string } | null)?.from ?? "/"

  if (user) {
    return <Navigate to={destination} replace />
  }

  const isSignup = mode === "signup"
  const returning = !isSignup && rememberedEmail !== "" && email === rememberedEmail

  function switchMode(next: Mode) {
    setMode(next)
    setError("")
    setPassword("")
  }

  function useAnotherAccount() {
    forgetEmail()
    setRememberedEmail("")
    setEmail("")
    setPassword("")
    setError("")
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")

    if (isSignup && password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setSubmitting(true)
    try {
      if (isSignup) {
        await register(name, email, password)
      } else {
        await login(email, password)
      }
      navigate(destination, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg-deep)] px-5 text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 top-16 h-64 w-64 rounded-full bg-purple-400/10 blur-3xl" />
        <div className="absolute -left-32 top-[45%] h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="absolute right-10 top-24 text-xs text-purple-200/40">✦</div>
        <div className="absolute left-10 top-52 text-[8px] text-purple-200/30">✦</div>
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--lavender)]/15">
          <Leaf size={26} className="text-[var(--lavender)]" />
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          {isSignup ? "Create your account" : returning ? "Welcome back" : "Sign in"}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {isSignup
            ? "Start tracking your footprint and grow your tree."
            : "Sign in to keep tracking your footprint."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8" noValidate>
          {isSignup && (
            <label className="mb-4 block text-sm font-medium">
              Name
              <input
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={inputClass}
                placeholder="Your name"
              />
            </label>
          )}

          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              required
              autoComplete={isSignup ? "email" : "username"}
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
          </label>

          {returning && (
            <button
              type="button"
              onClick={useAnotherAccount}
              className="mt-2 text-xs text-[var(--text-muted)] underline-offset-2 hover:underline"
            >
              Not you? Use another account
            </button>
          )}

          <label className="mt-4 block text-sm font-medium">
            Password
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={isSignup ? 8 : undefined}
                autoComplete={isSignup ? "new-password" : "current-password"}
                autoFocus={returning}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`${inputClass} pr-12`}
                placeholder={isSignup ? "At least 8 characters" : "Your password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((shown) => !shown)}
                className="absolute right-3 top-1/2 mt-1 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-2xl bg-[var(--lavender-light)] px-6 py-4 text-sm font-semibold text-[var(--bg-deep)] shadow-lg shadow-purple-950/30 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? isSignup ? "Creating account…" : "Signing in…"
              : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
          {isSignup ? "Already have an account?" : "New here?"}{" "}
          <button
            type="button"
            onClick={() => switchMode(isSignup ? "signin" : "signup")}
            className="font-medium text-[var(--lavender-light)] underline-offset-2 hover:underline"
          >
            {isSignup ? "Sign in" : "Create an account"}
          </button>
        </p>

        <p className="mt-8 text-center text-xs text-[var(--text-muted)]">
          You'll stay signed in on this device for 30 days.
        </p>
      </main>
    </div>
  )
}

export default Login
