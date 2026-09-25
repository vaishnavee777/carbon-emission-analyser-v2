import { Routes, Route } from "react-router"

import AppLayout from "./layouts/AppLayout"
import RequireAuth from "./components/RequireAuth/RequireAuth"
import { AppProvider } from "./context/AppProvider"

import Home from "./pages/Home/Home"
import LogActivity from "./pages/LogActivity/LogActivity"
import Trends from "./pages/Trends/Trends"
import Profile from "./pages/Profile/Profile"
import Login from "./pages/Login/Login"
import Trip from "./pages/Trip/Trip"
import Offset from "./pages/Offset/Offset"

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <AppProvider>
              <AppLayout />
            </AppProvider>
          </RequireAuth>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/log" element={<LogActivity />} />
        <Route path="/trends" element={<Trends />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/trip" element={<Trip />} />
        <Route path="/offset" element={<Offset />} />
      </Route>
    </Routes>
  )
}

export default App