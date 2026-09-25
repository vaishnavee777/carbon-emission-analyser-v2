# Carbon Emission Analyser

A mobile-first web app that tracks an individual's carbon footprint, forecasts it with a small energy-aware neural network, visualises it as an animated tree, and sends daily reminders via push notifications.

## Stack

| Area | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Recharts |
| Animated tree | SVG + [Motion](https://motion.dev) (`motion/react`) |
| Mobile | Installable PWA (`public/manifest.webmanifest`), VS Code *Mobile Preview* extension |
| Notifications | Service worker (`public/sw.js`), Web Push (VAPID) via `pywebpush`, APScheduler |
| Backend | FastAPI, SQLAlchemy 2, MySQL (PyMySQL) |
| ML | PyTorch (tiny MLP), CodeCarbon for measuring training energy/CO₂ |
| Live grid data | [Electricity Maps](https://www.electricitymaps.com) API (optional), polled every 15 min |

## Setup

Prerequisites: Node 20+, Python 3.11+, MySQL running locally.

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                      # then set DATABASE_URL
mysql -u root -e "CREATE DATABASE IF NOT EXISTS carbon_emissions"
python -m app.generate_vapid              # writes Web Push keys into .env
python -m app.seed                        # ~4,000 sample rows
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal, repo root)
npm install
npm run dev                               # http://localhost:5173
```

Open the app and create an account, or sign in to a seeded account, e.g. `nikhil.iyer0@example.com` / `Password123!` (every seeded user has that password).

The model trains automatically on the first forecast request, or explicitly with `POST /predictions/train`. API docs: http://localhost:8000/docs

## Previewing on mobile

- **In VS Code:** install the recommended *Mobile Preview* extension (`lirobi.phone-preview`) and point it at `http://localhost:5173`.
- **On a real phone:** Vite listens on your LAN, so open the `Network:` URL it prints. Push notifications need HTTPS off-localhost, so tunnel it (e.g. `cloudflared tunnel --url http://localhost:5173`). On iPhone, add the app to the Home Screen before enabling reminders (iOS 16.4+).

## How the pieces fit

- **Forecast model** (`backend/app/ml/`): an 11-feature, ~340-parameter MLP that predicts next-day emissions from 7/28-day averages, yesterday's total, category mix and weekday. It trains on CPU with early stopping, CodeCarbon records the energy and CO₂ that training used, and the Home screen shows both.
- **Tree** (`src/components/CarbonTree/`): leaf count and colour follow this week's emissions against your weekly goal. The tree is full at ≤50% of the goal and bare at ≥150%.
- **Reminders** (`backend/app/scheduler.py`): runs every minute and sends each subscribed device one reminder per local day after its chosen time. The notification's *Same as yesterday* action logs your previous day's activities without opening the app (`POST /activities/repeat-yesterday`).
- **Live grid intensity** (`backend/app/grid.py`): when `ELECTRICITYMAPS_API_KEY` is set in `backend/.env`, the backend polls your zone (`GRID_ZONE`, e.g. `IN-SO`) every 15 minutes, stores the readings, and uses them to:
  - calculate emissions for logged grid electricity,
  - show "cleaner/dirtier than usual" against the last 24 hours on Home,
  - rescale the electricity share of the forecast to today's grid.

  Without a key, everything falls back to the static factor and is labelled as such. Electricity Maps offers a 14-day trial and free access for academics; see their pricing page for other plans.
- **Accounts** (`backend/app/auth.py`): passwords are hashed with scrypt. Signing in sets an `httpOnly` session cookie that lasts 30 days and renews while you use the app, so returning users skip the login screen. Only a SHA-256 hash of each session token is stored (`user_sessions` table). Every data endpoint uses the signed-in user rather than a client-supplied ID. On a device that has signed in before, the login page opens in *Sign in* mode with the email prefilled; otherwise it opens in *Create account*. Set `COOKIE_SECURE=1` when serving over HTTPS.
- **Time-of-use electricity**: when logging grid electricity you can choose *Earlier* and pick the time. The backend uses the stored hourly grid reading for that hour (`GET /grid/intensity/at`), so 10 kWh at 2am and at 2pm can differ by a third.
- **Trip tracking** (`src/lib/trip.ts`, `backend/app/transport.py`): *Log → Transport → Track a trip with GPS* uses GPS and the accelerometer while the app is open. Distance and speed statistics are computed on the phone; only that summary is sent. The server suggests a mode (walk, bike, car, bus, train or flight) from the speed profile, and the user confirms or corrects it. Each trip's detected and confirmed modes are stored in `trips`, so they can later train a classifier. Browsers can't track in the background, so fully automatic detection would need a native wrapper such as Capacitor.
- **Reduce & offset** (`backend/app/offsets.py`): suggestions are calculated from the user's own activities (e.g. moving 30% of car trips to the bus, or electricity use to the grid's cleanest hours), followed by indicative prices for offsetting the remainder. Removal and avoidance credits are shown separately.
