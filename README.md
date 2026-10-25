# Shuvo Kumar Das — Portfolio

A modern portfolio site where **every word, link, file and project is editable live** from a private `/admin`
panel, and changes appear for all visitors instantly, with no redeploy and no page refresh.

![CI](https://github.com/iamshuvokd/shuvo_portfolio/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/iamshuvokd/shuvo_portfolio/actions/workflows/deploy.yml/badge.svg)

## Highlights

- **Live CMS:** edit text, CV, photo, projects, skills and more at `/admin`; visitors see it instantly (Redis pub/sub + Server-Sent Events).
- **Import projects from GitHub:** pick repositories from your account and they become project cards.
- **Resilient by design:** works from cache or built-in content when the API is down; one broken section never blanks the page.
- **Safe editing:** validated content, conflict detection between two admins, revocable sessions, uploads checked by content.
- **Fast and accessible:** ~170 KB of JavaScript (gzip), right-sized images, WCAG checks (axe-core) in CI.
- **Tested end to end:** backend integration tests + a full Playwright suite + post-deploy smoke tests.
- **Automatic delivery:** merge to `main` → CI → images published → server updated → live site smoke-tested → auto-rollback on failure.

## Quick start (development)

Requirements: Node 22+ (`.nvmrc`), Docker (for Redis).

```sh
npm run install:all                      # dependencies for every package
cp backend/.env.example backend/.env    # set ADMIN_PASSWORD and JWT_SECRET (see the comments inside)
npm run redis                            # Redis in Docker
npm run dev                              # site http://localhost:8080  ·  API :4000  ·  admin /admin
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | API + site with hot reload |
| `npm run check` | everything CI runs locally: lint, types, backend tests, e2e tests |
| `npm test` | backend tests (Vitest + Supertest, Redis db 14) |
| `npm run test:e2e` | full browser suite on an isolated stack (ports 4100/8180, Redis db 15) |
| `npm run test:smoke` | read-only checks against a deployed site: `SMOKE_URL=https://… npm run test:smoke` |
| `npm run build` | production build of backend and frontend |
| `npm run prod:local` | run the real production Docker stack on your machine |
| `npm run og:image` · `npm run images` | regenerate the social-preview card · the web-sized photos |

## Project structure

```
frontend/   Vite + React + TypeScript + Tailwind + shadcn/ui     (Dockerfile + nginx config)
backend/    Express + TypeScript + Redis; routes → services → Redis (Dockerfile, Vitest tests)
shared/     default-content.json: the seed and the offline fallback
e2e/        Playwright: full suite + post-deploy smoke tests
deploy/     production docker-compose, Caddyfile (HTTPS), deploy.sh (with rollback)
docs/       ARCHITECTURE.md · CICD.md
.github/    CI, CD, Dependabot, PR template, CODEOWNERS
```

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how the pieces fit and where to make common changes.

## Editing content

Open **`/admin`** and sign in. Tabs: Profile & CV · Hero · About · Experience · Projects (with *Import from GitHub*) ·
Skills · Contact & Footer · Media · Messages · JSON. **Save & publish** (or Ctrl+S) makes the change live for everyone.
If someone else published since you opened the page, you are asked before overwriting. If your session expires, you
sign in again without losing your draft.

## Delivery

Every push to `main` runs **CI**; when it is green, **Deploy** publishes Docker images to GitHub Container Registry,
updates your server over SSH, waits for `/api/health`, rolls back automatically if the release is unhealthy, and runs
smoke tests against the live URL. One-time setup (server, secrets, domain) takes about 20 minutes:
see [`docs/CICD.md`](docs/CICD.md). Contributors: see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Security notes

- Admin routes need a signed, revocable JWT. Login is rate limited (failed attempts only) and compared in constant time.
- Production refuses to start with a weak `ADMIN_PASSWORD` (12+ characters, not guessable).
- Links reject `javascript:` and similar; uploads are verified by magic bytes (PNG/JPEG/WebP/GIF/PDF only, never SVG/HTML).
- The production page ships a strict Content-Security-Policy and security headers; Redis is private and password-protected.
- Public endpoints are rate limited and live connections are capped. `/admin` is `noindex` and disallowed in `robots.txt`.
- Secrets live only in git-ignored `.env` files and GitHub Actions secrets.
