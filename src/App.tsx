import { Routes, Route } from "react-router"

import AppLayout from "./layouts/AppLayout"

import Home from "./pages/Home/Home"
import LogActivity from "./pages/LogActivity/LogActivity"
import Trends from "./pages/Trends/Trends"
import Profile from "./pages/Profile/Profile"

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/log" element={<LogActivity />} />
        <Route path="/trends" element={<Trends />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}

export default App