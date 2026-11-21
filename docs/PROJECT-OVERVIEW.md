# Project overview (start here)

One page that explains what this project is, how it is put together, how to run it, and how it is deployed.
Deeper detail lives in [ARCHITECTURE.md](ARCHITECTURE.md) (how the code works) and [CICD.md](CICD.md) (the delivery pipeline).

> **No secrets are stored in this repository or in this document.** Passwords, JWT secrets and SSH keys live only
> on the server (`.env`) and in GitHub Secrets. Never commit them.

## 1. What this is

Shuvo Kumar Das's personal portfolio at **https://shuvokumardas.tech**.
Every word, link, file and project is editable from a private `/admin` page, and changes show up for all visitors
instantly, with no redeploy.

| Part | Technology | Job |
|---|---|---|
| `frontend/` | Vite, React, TypeScript, Tailwind, shadcn/ui, **Framer Motion** | The website and the `/admin` editor |
| `backend/` | Express, TypeScript, zod | API: content, uploads, contact messages, admin login |
| Redis | Redis 7 | Stores content, uploads, messages, revoked sessions; **caches** GitHub repo lists (5 min); pub/sub for live updates |
| `shared/` | JSON | `default-content.json`: seed data and the offline fallback |
| `e2e/` | Playwright | Browser tests and post-deploy smoke tests |
| `deploy/` | Docker Compose, Caddy | Production stack and rollback script |

Visual effects: scroll reveals use a "speed-blur" transition (`frontend/src/lib/motion.ts`, `components/common/Reveal.tsx`),
built with Framer Motion and respecting the visitor's reduced-motion setting.

## 2. Folder map

```
frontend/   website + admin UI          backend/   API (routes -> services -> Redis)
shared/     seed / fallback content     e2e/       Playwright tests
deploy/     production Docker stack     docs/      you are here
.github/    CI, deploy pipeline, Dependabot
```

## 3. Run it on your computer

Requirements: Node 22+, Docker (for Redis).

```sh
npm run install:all                     # install every package
cp backend/.env.example backend/.env    # set ADMIN_PASSWORD and JWT_SECRET
npm run redis                           # start Redis in Docker
npm run dev                             # site http://localhost:8080 | API :4000 | admin /admin
```

Other commands: `npm run check` (everything CI runs), `npm test`, `npm run test:e2e`, `npm run build`.
If Docker is not running, the API refuses to start ("Is Redis running?").
After editing `shared/default-content.json`, restart the backend; it is read only at startup.

## 4. Admin login

- `/admin` is **password-only**: no username, no email. The password is the `ADMIN_PASSWORD` environment variable.
- Production **refuses to start** with a weak password: at least 12 characters, not a repeated character, none of the
  blocked words (`password`, `admin`, `shuvo`, `iamshuvokd`, `qwerty`, ...), and mixed character types.
  See `backend/src/lib/password-policy.ts`.
- Your public contact email is part of the content: edit it in `/admin` -> Contact.
- The backend has no email-sending code: contact-form messages are stored and read in `/admin`, not mailed.

## 5. Production (how it is live)

```
Internet -> shared Caddy (ports 80/443, owned by the "shiplu-blog" project) -> portfolio gateway -> web (nginx)
                                                                                              \-> backend -> Redis
```

- **Server:** one Hostinger VPS (Ubuntu, Docker) that hosts **three separate Docker projects**: the portfolio,
  `shiplu-blog` and `codevclub`. Each has its own folder, containers, Redis and volumes, so one failing does not
  stop the others. The only shared piece is the Caddy reverse proxy that owns ports 80/443 and issues HTTPS certificates.
- **Domain:** `shuvokumardas.tech` (DNS `A` record -> the VPS; `www` redirects to the bare domain).
- **Portfolio folder on the server:** `/opt/portfolio`

| File in `/opt/portfolio` | Origin | Purpose |
|---|---|---|
| `docker-compose.yml`, `Caddyfile`, `deploy.sh` | copied from `deploy/` by the pipeline on every deploy | the stack definition |
| `.env` | **server only, never in git** | `ADMIN_PASSWORD`, `JWT_SECRET`, `REDIS_PASSWORD`, `SITE_URL`, `HTTP_PORT` |
| `docker-compose.override.yml` | **server only**, never overwritten | publishes the gateway on `127.0.0.1:8090` for health checks, joins the shared Caddy's network under the alias `portfolio-gateway`, sets `TRUST_PROXY=2` |

- The shared Caddy (in `/opt/shiplu_blog/Caddyfile`) contains two blocks for this site:
  `shuvokumardas.tech { reverse_proxy portfolio-gateway:80 }` and a `www` redirect.
- Why `TRUST_PROXY=2`: two proxies sit in front of the API (shared Caddy, then the portfolio gateway). The gateway's
  Caddyfile trusts forwarded IPs from private networks so rate limits see the real visitor.

## 6. Deploying changes

**Content edits** (text, projects, CV...) are made in `/admin` and are live immediately. They are *not* deployments.

**Code changes** go through the pipeline ([CICD.md](CICD.md)): push to `main` -> CI (lint, types, tests, e2e, audit) ->
Docker images published to `ghcr.io` -> server pulls them and restarts only what changed -> health check -> smoke tests.
A failed health check rolls back automatically to the last good version.

Required GitHub settings (one-time): Actions workflow permissions = *Read and write*; secrets `DEPLOY_HOST`, `DEPLOY_USER`,
`DEPLOY_PATH` (`/opt/portfolio`), `DEPLOY_SSH_KEY`; variable `SITE_URL` = `https://shuvokumardas.tech`.
Without the secrets, the pipeline still publishes images but skips the server step.

### Common server tasks (run in `/opt/portfolio`)

```sh
docker compose ps                         # what is running
docker compose logs -f backend            # API logs
curl localhost:8090/api/health            # health check from the server itself
IMAGE_TAG=<git-sha> ./deploy.sh           # deploy or roll back to one specific version
nano .env && docker compose up -d backend # change a secret, then recreate the backend
```

## 7. Gotchas we hit (read before changing things)

1. **`$` in `.env` values:** Docker Compose treats `$name` as a variable. Wrap values that contain `$` in single quotes:
   `ADMIN_PASSWORD='...'`, or they are silently truncated.
2. **Restart vs recreate:** `docker compose up -d backend` only picks up `.env` changes if the file really changed
   ("Running" with no "Recreated" means nothing was applied).
3. **A weak `ADMIN_PASSWORD` stops the backend from starting** in production (by design). Check
   `docker compose logs backend` if the site's admin or live content goes down after a password change.
4. **Ports 80/443 are not ours.** Do not start another gateway on them; go through the shared Caddy.
   Validate before reloading it: `docker exec shiplu-blog-caddy-1 caddy validate --config /etc/caddy/Caddyfile`,
   then `caddy reload`. A backup of the Caddyfile from before the portfolio blocks were added sits next to it.
5. **A new domain shows the old page for a while:** your PC/router may cache the old DNS record. Test on a phone with
   mobile data, or `ipconfig /flushdns`.
6. **Pending server restart:** the VPS reported "system restart required". Reboot in a quiet period; every project
   goes down briefly and containers restart on their own.

## 8. Backups

Content and uploads live in Redis (append-only file on a Docker volume). Back up with the command in
[CICD.md](CICD.md) ("Back up your data") and keep the file somewhere safe.

## 9. Open items

- Add the GitHub secrets and push so automatic deploy starts (until then the live site runs on images built on the server).
- Replace the name-based admin password with a longer passphrase when convenient.
- The `ATL_Bot` project intentionally has no public repository link.
