self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {}

  event.waitUntil(
    self.registration.showNotification(data.title || "Carbon Analyser", {
      body: data.body || "Time to log your day.",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: "daily-reminder",
      data: { url: data.url || "/log" },
      actions: [
        { action: "log", title: "Log now" },
        { action: "repeat", title: "Same as yesterday" },
      ],
    }),
  )
})

async function repeatYesterday() {
  try {
    // Same-origin fetch from the worker sends the session cookie.
    const response = await fetch("/api/activities/repeat-yesterday", {
      method: "POST",
      credentials: "same-origin",
    })
    if (response.status === 401) {
      await self.registration.showNotification("Please sign in", {
        body: "Open the app and sign in to log from notifications.",
        icon: "/favicon.svg",
        tag: "daily-reminder",
        data: { url: "/login" },
      })
      return
    }
    const logged = response.ok ? await response.json() : []
    const total = logged.reduce((sum, a) => sum + a.emissions, 0)

    await self.registration.showNotification("Logged", {
      body: response.ok
        ? `Copied ${logged.length} activities (${total.toFixed(1)} kg CO₂e) from your last day.`
        : "Nothing to copy yet. Open the app to log today.",
      icon: "/favicon.svg",
      tag: "daily-reminder",
    })
  } catch {
    await self.registration.showNotification("Couldn't log", {
      body: "You seem to be offline. Open the app to log today.",
      icon: "/favicon.svg",
      tag: "daily-reminder",
    })
  }
}

async function openApp(url) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
  for (const client of windows) {
    if ("focus" in client) {
      await client.navigate(url)
      return client.focus()
    }
  }
  return self.clients.openWindow(url)
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const { url } = event.notification.data || {}

  if (event.action === "repeat") {
    event.waitUntil(repeatYesterday())
    return
  }

  event.waitUntil(openApp(url || "/log"))
})
