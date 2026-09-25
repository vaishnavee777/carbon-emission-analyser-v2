// Remembers who last signed in on this device, so returning users get "Sign in" with their email filled in.
const KEY = "carbon-last-email"

export function lastEmail(): string {
  try {
    return localStorage.getItem(KEY) ?? ""
  } catch {
    return ""
  }
}

export function rememberEmail(email: string | null) {
  if (!email) return
  try {
    localStorage.setItem(KEY, email)
  } catch {
    // Storage unavailable (private mode); the login form just won't be prefilled.
  }
}

export function forgetEmail() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing stored to clear.
  }
}
