import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"

import { useAuth } from "../../context/useAuth"

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, signedOut } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-deep)] text-sm text-[var(--text-muted)]">
        Loading…
      </div>
    )
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={signedOut ? undefined : { from: location.pathname }}
      />
    )
  }

  return children
}

export default RequireAuth
