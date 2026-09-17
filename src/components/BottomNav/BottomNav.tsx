import {
  Home,
  Plus,
  BarChart3,
  User,
} from "lucide-react"
import { NavLink } from "react-router"

const navigation = [
  {
    label: "Home",
    path: "/",
    icon: Home,
  },
  {
    label: "Log",
    path: "/log",
    icon: Plus,
  },
  {
    label: "Trends",
    path: "/trends",
    icon: BarChart3,
  },
  {
    label: "Profile",
    path: "/profile",
    icon: User,
  },
]

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--bg-primary)]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-3">
        {navigation.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 rounded-2xl px-4 py-2 text-xs transition-all ${
                  isActive
                    ? "bg-[var(--lavender)]/15 text-[var(--lavender-light)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`
              }
            >
              <Icon size={20} strokeWidth={1.8} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav