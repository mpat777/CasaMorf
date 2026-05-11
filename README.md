# 🏠 CasaMorf

**Your household, organized.** Shopping lists, task tracking & household management — encrypted, offline-first, zero backend.

## Features

- **Shopping List** — 9 categories (Kühlregal, Gemüse, Fleisch, Backwaren, Tiefkühl, Getränke, Drogerie, Haushalt, Sonstiges), grouped for efficient store runs
- **Task Tracker** — Recurring tasks (daily/weekly/biweekly/monthly/once), member assignment, completion tracking
- **Household Management** — Create a crib, invite members via code, see who's done what
- **Dashboard** — Quick overview with stats, shopping preview, open tasks
- **Encrypted Backup** — Export all data as AES-256-GCM encrypted JSON, safe for public repos

## Tech Stack

Pure vanilla HTML/CSS/JS — no framework, no build step, no backend.

| Component | Tech |
|---|---|
| Frontend | Vanilla JS, CSS custom properties |
| Encryption | Web Crypto API (AES-256-GCM, PBKDF2) |
| Storage | localStorage (encrypted) |
| Hosting | GitHub Pages |
| Offline | Service Worker (PWA) |
| Font | Space Grotesk |

## Security

All data is encrypted client-side with AES-256-GCM before being stored in localStorage:

- Key derivation: PBKDF2 with SHA-256, 310,000 iterations (OWASP recommended)
- Each encryption uses a random 12-byte IV
- Passphrase never leaves the browser
- Encrypted backup JSON is safe to commit to a public repo

## Deploy

1. Clone this repo
2. Enable GitHub Pages (Settings → Pages → Source: main branch)
3. Done — visit `https://<username>.github.io/casamorf/`

No build step, no npm install, no server required.

## License

MIT
