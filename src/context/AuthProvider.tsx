import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import { AuthContext } from "./AuthContext"
import { api, UNAUTHORIZED_EVENT, type User } from "../lib/api"
import { rememberEmail } from "../lib/lastEmail"

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [signedOut, setSignedOut] = useState(false)

  useEffect(() => {
    // The session cookie is httpOnly, so ask the server who we are.
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))

    const handleUnauthorized = () => setUser(null)
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const signedIn = await api.login(email, password)
    rememberEmail(signedIn.email)
    setSignedOut(false)
    setUser(signedIn)
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const created = await api.register(name, email, password)
    rememberEmail(created.email)
    setSignedOut(false)
    setUser(created)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } finally {
      setSignedOut(true)
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signedOut, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
