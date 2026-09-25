import { useEffect } from "react"
import { Outlet, useLocation } from "react-router"
import BottomNav from "../components/BottomNav/BottomNav"

function AppLayout() {
  const { pathname } = useLocation()

  // Start each page at the top instead of keeping the previous page's scroll position.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-[var(--text-primary)]">
      <main className="mx-auto min-h-screen max-w-md pb-24">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}

export default AppLayout