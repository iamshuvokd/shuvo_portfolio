# Backend

Express + TypeScript API. Redis is the only datastore.

```sh
cp .env.example .env     # set ADMIN_PASSWORD and JWT_SECRET
npm run dev              # tsx watch on http://localhost:4000
npm run typecheck
npm run build && npm start
```

## Redis keys

| Key | Type | Content |
|---|---|---|
| `portfolio:content` | string | The whole site document (JSON) |
| `portfolio:content:rev` | string | Revision counter, incremented on every save |
| `portfolio:events` | pub/sub channel | `{ type, revision, content }` for live updates |
| `portfolio:media:<id>` / `:meta` | string (binary) / string | Uploaded file bytes and its metadata |
| `portfolio:media:index` | sorted set | Media ids by upload time |
| `portfolio:messages` / `:order` | hash / sorted set | Contact messages (capped at 500) |
| `portfolio:github:<user>` | string (TTL 5 min) | Cached GitHub repo list |

The content is seeded from `../shared/default-content.json` on first run.

## Adding a new editable field

1. Add it to `shared/default-content.json`.
2. Add it to the zod schema in `src/schemas/content.ts` and the TypeScript types in `frontend/src/types/content.ts`.
3. Render it in a component and add an input in `frontend/src/components/admin/editors.tsx`.

Stored content is merged over the defaults on read, so a new field appears with its default value and nothing you already edited is lost; save once in /admin to persist it.

## Adding a new endpoint

Create a service in `src/services/`, a route in `src/routes/`, validate input with zod, and wrap
handlers in `asyncHandler`. Protect admin routes by mounting them after `requireAdmin`.
