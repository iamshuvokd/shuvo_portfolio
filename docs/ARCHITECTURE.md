# Architecture

A portfolio site whose **every word, link, file and project is editable at runtime** from `/admin`,
and where changes reach every open browser instantly.

## The 30-second picture

```
 Visitor's browser                                    You, in /admin
   │  GET /            (static site)                    │  PUT /api/admin/content   (needs your JWT)
   │  GET /api/content (current content)               │
   │  GET /api/content/stream  (Server-Sent Events) ◄───┼──────────────┐
   ▼                                                    ▼              │ publish
┌──────────┐  /api/*   ┌─────────────────────────────────────────┐    │
│ Gateway  │──────────►│ Backend  (Express + TypeScript)         │    │
│ (Caddy)  │           │  routes → services → Redis              │    │
│ HTTPS    │  /*       │  zod validation · JWT auth · rate limits│────┘
│          │──────┐    └───────────────┬─────────────────────────┘
└──────────┘      ▼                    ▼
              ┌────────┐         ┌───────────────┐
              │  web   │         │     Redis     │  content (JSON), uploads, messages,
              │ (nginx)│         │ (persistent)  │  revoked tokens, GitHub cache, pub/sub
              └────────┘         └───────────────┘
```

## Repository layout

```
.
├── frontend/          Vite + React + TypeScript + Tailwind + shadcn/ui
│   ├── src/components/  layout/ sections/ effects/ common/ admin/ ui/
│   ├── src/context/     live content provider (cache → fetch → SSE → polling fallback)
│   ├── src/services/    all network I/O (components never call fetch directly)
│   ├── src/config/ lib/ hooks/ types/ pages/
│   ├── nginx/           production web server config (cache + security headers)
│   ├── scripts/         image optimiser, OG-image generator, bundle-size budget
│   └── Dockerfile
├── backend/           Express API
│   ├── src/routes/      public.ts, admin.ts   (thin: parse input → call a service)
│   ├── src/services/    content, media, messages, github   (all business logic + Redis access)
│   ├── src/schemas/     zod schemas = the single definition of valid content
│   ├── src/middleware/  auth (JWT + revocation), error handling
│   ├── src/lib/         redis clients, SSE hub, password policy
│   ├── tests/           Vitest + Supertest (in-process, Redis database 14)
│   └── Dockerfile
├── shared/            default-content.json: the seed, and the offline fallback in the browser
├── e2e/               Playwright: full suite (isolated stack) + post-deploy smoke tests
├── deploy/            production docker-compose, Caddyfile, deploy.sh, server .env template
├── docs/              you are here
├── .github/           CI, CD, Dependabot, PR template, CODEOWNERS
└── docker-compose.dev.yml   local Redis for development
```

## How a change travels (the live-update path)

1. The admin edits a draft in the browser. Nothing is public yet.
2. **Save & publish** sends `PUT /api/admin/content` with `X-Content-Revision` (the revision the editor started from).
3. The backend validates the whole document with zod, then runs one **atomic Lua script** in Redis:
   "if the stored revision still equals the one you edited, write the content and bump the revision; otherwise refuse".
   A stale save gets **409**, so two admins can never silently overwrite each other.
4. The backend **publishes** the new content on a Redis pub/sub channel.
5. Every backend instance subscribed to that channel pushes it to its connected browsers over **Server-Sent Events**.
6. Browsers re-render immediately and cache the content in `localStorage` for an instant first paint next visit.

If the stream is unavailable the browser polls every minute; if the API is down it keeps showing cached or built-in content.

## Design decisions worth knowing

| Decision | Why |
|---|---|
| **Content is one validated JSON document** in Redis | Simple to edit, version, back up and push live; one schema describes everything. |
| **Defaults merged under stored content** (backend *and* frontend `deepMerge`) | Adding a field later never hides edits already saved, and a stale cache can never crash the page. |
| **SSE + Redis pub/sub**, not WebSockets | One-way updates are all we need; works through proxies; scales to several API instances unchanged. |
| **Error boundaries** around every section | One bad value drops one section, never the whole page. |
| **Same-origin `/api`** through the gateway | No CORS surface, cookies not needed (bearer tokens), simple HTTPS. |
| **Tokens carry a `jti` and are revocable** | Sign-out works immediately; revocation keys expire with the token. |
| **Link fields reject non-http(s)/`mailto:`/`tel:`/path values**, uploads checked by magic bytes, SVG refused | Prevents `javascript:` links and script-bearing uploads. |
| **Production refuses weak admin passwords** | The admin password is the single key to the site. |
| **Isolated test stack** (ports 4100/8180, Redis db 15; unit tests db 14) | Tests can never touch development data. |

## Where to make common changes

| I want to… | Edit |
|---|---|
| Add an editable field | `shared/default-content.json`, `backend/src/schemas/content.ts`, `frontend/src/types/content.ts`, the component, and `frontend/src/components/admin/editors.tsx` |
| Add an API endpoint | a service in `backend/src/services/`, a route in `backend/src/routes/`, a test in `backend/tests/` |
| Change colours / fonts | `frontend/src/index.css` (CSS variables) and `frontend/tailwind.config.ts` |
| Change the link-preview card | `frontend/design/og-image.html`, then `npm run og:image` |
| Change the profile photo source | replace `frontend/design/profile-source.jpg`, then `npm run images` |
