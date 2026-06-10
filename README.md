# Bemby v0.8.0

A self-hosted automation tool for managing daily Telegram bot check-ins (签到) and Emby video-watch sessions. Includes a web admin portal for managing multiple accounts and jobs.

> If Bemby saves you time, please consider giving it a star on GitHub. It helps others find the project and keeps development going.

---

## Features

- **Multi-account** — manage multiple Telegram accounts, each independently authenticated via MTProto
- **Two job types**
  - **Check-in (签到)** — sends `/start` to a Telegram bot and clicks the reply button on a randomised daily schedule
  - **Emby Watch (看片)** — simulates a SenPlayer session on an Emby server, reporting playback progress at regular intervals
- **Scheduler** — picks a random time within a configurable daily window per job; handles retry on failure
- **Web admin portal** — Vue 3 SPA for managing accounts, jobs, settings, and viewing logs
- **Persistent storage** — SQLite database, survives restarts and container upgrades

---

## Requirements

- Node.js 20+ (for local/dev use)
- Docker + Docker Compose (for production)
- Telegram API credentials from [my.telegram.org/apps](https://my.telegram.org/apps) (for check-in jobs)

---

## Quick Start (local development)

```bash
# Clone the repo
git clone <repo-url>
cd bemby

# Start both backend and frontend in watch mode
./dev.sh
```

On first run `dev.sh` copies `env.example` to `backend/.env` and warns if placeholder values are still set.

| Service  | Default URL                  |
|----------|------------------------------|
| Frontend | http://localhost:5173        |
| Backend  | http://localhost:3000        |

Log in with the credentials configured in `backend/.env` (default `admin` / `changeme`).

---

## Production (Docker)

### 1. Configure environment

```bash
cp env.example .env
```

Edit `.env`:

| Variable         | Description                                          |
|------------------|------------------------------------------------------|
| `PORT`           | Host port to expose (default `3000`)                 |
| `ADMIN_USERNAME` | Admin login username (default `admin`)               |
| `ADMIN_PASSWORD` | Admin login password — **change this**               |
| `JWT_SECRET`     | Secret for signing JWTs — **use a long random string** |
| `TZ`             | Host timezone (default `Australia/Sydney`)           |

### 2. Build and run

```bash
docker compose up --build -d
```

The app is served on `http://<host>:3000`. The SQLite database is stored in a named Docker volume (`bemby-data`) so it persists across rebuilds.

### 3. Stop

```bash
docker compose down
```

---

## First-time setup

### 1. Add a Telegram account (for check-in jobs)

1. Go to **Accounts** and click **Add Account**
2. Enter a display name, phone number, API ID, and API Hash
   - Get API ID/Hash from [my.telegram.org/apps](https://my.telegram.org/apps)
3. Click **Request Code** — Telegram sends a login code to the account's phone
4. Click **Verify** and enter the code (and 2FA password if enabled)
5. Status changes to **Authenticated**

### 2. Create a job

Go to **Jobs** and click **Add Job**. Configure:

| Field              | Description                                                      |
|--------------------|------------------------------------------------------------------|
| Job Name           | Display name for the job                                         |
| Job Type           | `Check-in` or `Emby Watch`                                       |
| Account            | Authenticated Telegram account (check-in only)                   |
| Bot Username       | Telegram bot handle, with or without `@` (check-in only)         |
| Server URL         | Emby server address, e.g. `https://emby.example.com:443` (Emby Watch only) |
| Emby Username/Password | Emby account credentials (Emby Watch only)                  |
| Window Start/End   | Daily schedule window in HHMM format, e.g. `1400`–`1600`        |
| Max Retries        | Number of retry attempts on failure                              |

The scheduler picks a random time within the window each day. If the window has already passed when the job is saved, it schedules for the following day.

### 3. System settings

Go to **Settings** to configure:

- **Default timezone** — used for all job schedule windows
- **Default max retries**
- **Enforce one run per day** — disable this when testing so jobs can re-run even if they already ran today
- **Emby Watch defaults** — play duration, device name, and user agent (SenPlayer/Mac defaults pre-configured)
- **Admin credentials** — change the admin username or password

---

## Project structure

```
bemby/
├── backend/
│   └── src/
│       ├── server.ts          -- Express entry point
│       ├── scheduler.ts       -- Per-job setTimeout scheduler
│       ├── db/
│       │   └── database.ts    -- SQLite setup and migrations
│       ├── jobs/
│       │   ├── runner.ts      -- Job dispatcher with retry
│       │   ├── checkin.ts     -- Telegram MTProto check-in logic
│       │   └── embywatch.ts   -- Emby playback simulation
│       ├── routes/
│       │   ├── auth.ts        -- Login, JWT, credential management
│       │   ├── accounts.ts    -- Telegram account CRUD and auth flow
│       │   ├── jobs.ts        -- Job CRUD and manual trigger
│       │   ├── logs.ts        -- Job execution log queries
│       │   ├── settings.ts    -- System settings key/value store
│       │   └── status.ts      -- Scheduler next-run status
│       └── types.ts
├── frontend/
│   └── src/
│       ├── views/
│       │   ├── AccountsView.vue
│       │   ├── JobsView.vue
│       │   ├── LogsView.vue
│       │   ├── SettingsView.vue
│       │   └── HelpView.vue
│       ├── api/client.ts      -- Axios API client and types
│       └── router/index.ts
├── docker-compose.yml
├── Dockerfile
├── dev.sh                     -- Local dev launcher (backend + frontend)
└── env.example
```

---

## How the scheduler works

1. On startup (and after any job create/update/delete), `refreshScheduler()` runs
2. For each enabled job it calls `pickNextRun()`:
   - If the current time is **before** the window → schedules randomly within the full window today
   - If the current time is **inside** the window → schedules randomly within the remaining window time today
   - If the window has **passed** (or the job already ran today and *Enforce one run per day* is on) → schedules within the window tomorrow
3. A `setTimeout` fires at the chosen time and executes the job
4. On completion (success or failure) the job is immediately rescheduled for the next day
5. A background poll runs every 5 minutes to catch any jobs missed during downtime

---

## Emby Watch details

The Emby Watch job authenticates as a real Emby user and simulates a SenPlayer 6.1.0 session on macOS:

- Picks a random movie or episode from the library
- Reports playback started (`POST /Sessions/Playing`)
- Sends progress updates every 30 seconds (`POST /Sessions/Playing/Progress`)
- Reports the session as stopped after the configured duration (`POST /Sessions/Playing/Stopped`)

The Emby server sees the session as **Mac / SenPlayer**, matching a real macOS client.

---

## Contributing

Contributions are welcome. To get started:

1. Fork the repository and create a feature branch
2. Make your changes — follow the existing code style (TypeScript strict, Vue 3 Composition API)
3. Test locally with `./dev.sh`
4. Open a pull request with a clear description of what changed and why

Please keep pull requests focused. Bug fixes, reliability improvements, new job types, and UI polish are all appreciated. If you are planning a larger change, open an issue first to discuss the approach.

---

## Disclaimer

Bemby is provided for personal automation and educational purposes only. Use it responsibly and in accordance with the terms of service of any platform you interact with (Telegram, Emby, etc.).

The authors accept no liability for account suspension, data loss, service disruption, or any other consequence arising from the use of this software. You run it at your own risk.

---

## Licence

Copyright (c) 2024 Bemby contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software to use, copy, modify, and distribute it, subject to the following conditions:

- **Attribution** — any distributed copy or derivative work, whether modified or unmodified, must clearly state the original source (a link to this repository is sufficient).
- The above copyright notice and this permission notice must be included in all copies or substantial portions of the software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY ARISING FROM THE USE OF THE SOFTWARE.
