import { Outlet } from "react-router"
import BottomNav from "../components/BottomNav/BottomNav"

function AppLayout() {
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