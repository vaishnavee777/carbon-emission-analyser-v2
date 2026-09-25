import { createContext } from "react"

import type { User } from "../lib/api"

export interface AuthContextType {
  user: User | null
  loading: boolean
  // True after an explicit sign-out, so we don't bounce back to the last page on next sign-in.
  signedOut: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  )
