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
| Auth | PIN (SHA-256 hashed, stored in data file) |
| Hosting | GitHub Pages |
| Offline | Service Worker (PWA) |
| Font | Space Grotesk |

## How It Works

Data is stored as a JSON file (`data/store.json`) directly in your GitHub repo via the GitHub API. Both devices read/write the same file — no external backend needed.

1. On first launch, enter your GitHub PAT and repo name (one-time setup per device)
2. Set a PIN to protect the app
3. All changes sync to GitHub automatically

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
