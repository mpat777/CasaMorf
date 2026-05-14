# 🏠 CasaMorf

**Your household, organized.** Shopping lists, task tracking & household management — encrypted, offline-first, zero backend.

## Features

- **Shopping List** — 9 categories (Kühlregal, Gemüse, Fleisch, Backwaren, Tiefkühl, Getränke, Drogerie, Haushalt, Sonstiges), grouped for efficient store runs
- **Task Tracker** — Recurring tasks (daily/weekly/biweekly/monthly/once), member assignment, completion tracking
- **Household Management** — Create a crib, invite members via code, see who's done what
- **Dashboard** — Quick overview with stats, shopping preview, open tasks
- **Encrypted Backup** — Export all data as AES-256-GCM encrypted JSON, safe for public repos

## Tech Stack

Pure vanilla HTML/CSS/JS — no framework, no build step, no backend needed.

| Component | Tech |
|---|---|
| Frontend | Vanilla JS, CSS custom properties |
| Data Storage | GitHub API (data/store.json in repo) |
| Encryption | AES-256-GCM (PBKDF2 key from PIN) |
| Auth | PIN (SHA-256 hash stored in cleartext, data encrypted) |
| Hosting | GitHub Pages |
| Offline | Service Worker (PWA) |
| Font | Space Grotesk |

## How It Works

`data/store.json` in your repo contains two fields:
- `pinHash` — SHA-256 hash of the PIN (for verification only)
- `data` — AES-256-GCM encrypted blob (all app data)

Without the PIN, the data field is unreadable. Safe for a public repo.

1. On first launch, enter your GitHub PAT and repo name (one-time per device)
2. Set a 4-6 digit PIN — this derives the AES encryption key
3. All changes are encrypted client-side, then pushed to GitHub
4. Other devices pull the same file and decrypt with the same PIN

## Setup

1. Create a GitHub repo (e.g. `casamorf`)
2. Push this code to it
3. Enable GitHub Pages (Settings → Pages → GitHub Actions)
4. Create a **Fine-grained PAT**: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
   - Scope: your `casamorf` repo only
   - Permission: **Contents: Read and write**
5. Open the app, enter PAT + repo name, set PIN — done

Both phones use the same PAT and repo. Data syncs through GitHub.

## License

MIT
