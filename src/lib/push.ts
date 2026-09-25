import { api } from "./api"

export function pushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return
  navigator.serviceWorker.register("/sw.js").catch((error) => {
    console.error("Service worker registration failed", error)
  })
}

function urlBase64ToUint8Array(base64: string) {
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

export async function enableReminders(reminderTime: string) {
  if (!pushSupported()) {
    throw new Error(
      "This browser can't receive push notifications. On iPhone, add the app to your Home Screen first.",
    )
  }

  const permission = await Notification.requestPermission()
  if (permission !== "granted") {
    throw new Error("Notifications are blocked. Allow them in your browser settings.")
  }

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    const { public_key } = await api.vapidPublicKey()
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(public_key),
    })
  }

  await api.subscribe({
    subscription: subscription.toJSON(),
    reminder_time: reminderTime,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    daily_reminder: true,
  })
}

export async function disableReminders() {
  if (!pushSupported()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  await api.unsubscribe(subscription.endpoint)
  await subscription.unsubscribe()
}
