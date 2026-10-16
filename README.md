# Shuvo Kumar Das Portfolio

Monorepo with a live-editable portfolio:

- **frontend/** Vite + React + TypeScript + Tailwind + shadcn/ui
- **backend/** Express + TypeScript + **Redis** (content, uploads, messages, live updates)
- **shared/** `default-content.json`, the seed content and offline fallback

Everything on the site (name, phone, CV, photo, project links, skills, texts...) is editable from
**`/admin`** and goes live for every visitor instantly, with no redeploy and no page refresh.

## Quick start

Prerequisites: Node 20+, and a Redis server (Docker, WSL, Memurai on Windows, or a cloud Redis).

```sh
npm run install:all      # install root + frontend + backend dependencies
npm run redis            # start Redis via Docker Desktop (skip if you run Redis another way)

cp backend/.env.example backend/.env    # then set ADMIN_PASSWORD and JWT_SECRET (see below)

npm run dev              # API on :4000 + site on http://localhost:8080
```

Open **http://localhost:8080/admin**, sign in with your `ADMIN_PASSWORD`, edit, and press
**Save & publish** (or Ctrl+S). Open the public site in another tab to watch it update live.

Generate a strong `JWT_SECRET`:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## How live updates work

```
/admin  --PUT /api/admin/content-->  Express  --SET + PUBLISH-->  Redis
                                                                    |
visitors  <--Server-Sent Events (/api/content/stream)--  Express  <-- SUBSCRIBE
```

1. The admin saves; the backend validates the document with zod and stores it in Redis.
2. Redis pub/sub notifies every backend instance, which pushes the new content to all open browsers over SSE.
3. Browsers re-render immediately. The last content is cached in `localStorage`, so repeat visits paint instantly.
4. If the backend is down, the site still works from cached / built-in content.

## What you can edit in /admin

Profile & CV (upload a PDF or paste a link, profile photo, email, phone, socials, availability) ·
Hero (badge, typing roles, tagline, metrics) · About · Experience · Projects (links, tech, screenshot) ·
Skills · Media library · Contact-form messages · Raw JSON editor · Reset to defaults.

### Projects from GitHub

In **/admin → Projects**, the *Import from GitHub* panel loads a GitHub account's public repositories
(through the backend, cached 5 min). Tick the repos you want and click **Add selected as projects**: the
title, description, language/topic tags, code link and homepage are filled in automatically, and you can
edit anything afterwards. **Re-sync** refreshes the GitHub-sourced fields of imported projects later.
Nothing goes live until you **Save & publish**. Set an optional `GITHUB_TOKEN` in `backend/.env` to raise
GitHub's limit from 60 to 5000 requests/hour.

## Structure

```
.
├── frontend/src/
│   ├── components/  layout/ sections/ effects/ common/ admin/ ui/
│   ├── context/     live content provider (fetch + SSE)
│   ├── services/    http client, content, admin and contact services
│   ├── config/ lib/ hooks/ types/ pages/
├── backend/src/
│   ├── config/      validated env
│   ├── routes/      public.ts (content, stream, media, contact), admin.ts
│   ├── services/    content, media, messages (all Redis access)
│   ├── middleware/  auth (JWT), error handling
│   ├── schemas/     zod validation
│   └── lib/         redis clients, SSE hub
├── shared/default-content.json
└── docker-compose.yml   Redis with persistence
```

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/content` | - | Current site content |
| GET | `/api/content/stream` | - | SSE stream of live updates |
| GET | `/api/media/:id` | - | Uploaded image / PDF |
| POST | `/api/contact` | - | Contact form (rate limited, stored in Redis) |
| GET | `/api/health` | - | Health + Redis status |
| POST | `/api/admin/login` | - | `{ password }` -> `{ token }` (rate limited) |
| PUT | `/api/admin/content` | Bearer | Replace content (validated) |
| POST | `/api/admin/content/reset` | Bearer | Restore defaults |
| GET/POST/DELETE | `/api/admin/media` | Bearer | Media library (PNG/JPEG/WebP/GIF/PDF, 8 MB) |
| GET/DELETE | `/api/admin/messages` | Bearer | Contact inbox |
| GET | `/api/admin/github/repos?username=` | Bearer | A user's public GitHub repos (cached) |

## Security notes

- Admin routes require a signed JWT (12 h, kept in `sessionStorage`); login is rate limited and compared in constant time.
- Link fields reject `javascript:` and other unsafe schemes. Uploads are checked by magic bytes; SVG and HTML are refused.
- Helmet headers, CORS allow-list (`CORS_ORIGINS`), request size limits.
- Redis is bound to localhost in `docker-compose.yml`. Never expose it publicly.
- `/admin` is `noindex` and disallowed in `robots.txt`. Use a long, unique `ADMIN_PASSWORD`.

## Tests (Playwright)

```sh
npm run redis          # Redis must be running on localhost:6379
npm run test:e2e       # 50 tests: API, public site, admin flow, GitHub import, uploads, inbox
npm run test:e2e:ui    # interactive runner
npx --prefix e2e playwright show-report e2e/playwright-report   # after a run
```

The suite starts its **own isolated stack** (backend :4100, frontend :8180, Redis database 15) so it can never
touch your development data. GitHub is mocked, so tests do not depend on the network or GitHub's rate limit.
On Windows it uses the Edge you already have; elsewhere/CI run `npx playwright install chromium` once.
Failures keep a screenshot and a trace (`npx playwright show-trace <trace.zip>`).

## Link preview (Open Graph)

Pasted links show a 1200x630 card on LinkedIn, WhatsApp, Slack, X and Facebook. The card is
`frontend/public/og-image.jpg` (83 KB, under WhatsApp's ~300 KB limit), generated from
`frontend/design/og-image.html`. Edit that file and run `npm run og:image` to regenerate it.

Crawlers need absolute URLs, so build with your real address:

```sh
SITE_URL=https://yourdomain.com npm run build
```

Without `SITE_URL` the image path stays relative and `og:url` / canonical are omitted. After deploying, refresh
the cached preview with the LinkedIn Post Inspector, Facebook Sharing Debugger, or by sharing a new URL on WhatsApp.
The card is static (crawlers do not run JavaScript), so rerun `npm run og:image` if your name, role or photo changes.

## Production

```sh
npm run build                      # builds backend (dist/) and frontend (frontend/dist)
NODE_ENV=production node backend/dist/index.js
```

- Serve `frontend/dist` from any static host. Set `VITE_API_URL=https://api.yourdomain.com/api` **before** building,
  and add the site origin to `CORS_ORIGINS` on the backend.
- Behind a reverse proxy, disable response buffering for `/api/content/stream` (the backend already sends `X-Accel-Buffering: no`).
- Use a managed Redis (Upstash, Redis Cloud...) via `REDIS_URL`, with persistence enabled so edits survive restarts.
- Back up Redis (RDB/AOF snapshots): it is the only copy of your edited content and uploads.
