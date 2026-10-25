# CI/CD: how a code change reaches your live site

```
 you push / merge to main
        │
        ▼
  ┌─────────────── CI (.github/workflows/ci.yml) ───────────────┐
  │ lint · type-check · build · bundle budget                    │
  │ backend tests (Vitest + Redis)                               │  all must be green
  │ end-to-end tests (Playwright, isolated stack)                │
  │ dependency audit (high/critical, production deps)            │
  │ Docker images build                                          │
  └──────────────────────────────────────────────────────────────┘
        │ green                                   │ red → nothing is deployed, you get an email
        ▼
  ┌─────────────── Deploy (.github/workflows/deploy.yml) ───────┐
  │ 1. build the API and web images, push to ghcr.io (tag = commit SHA + latest)
  │ 2. copy deploy/ files to your server over SSH
  │ 3. server: docker login → deploy.sh → pull images → restart changed containers
  │ 4. deploy.sh waits for /api/health; unhealthy → automatic rollback to the last good version
  │ 5. smoke tests run against your real URL (headers, caching, CSP, live stream, admin login page)
  └──────────────────────────────────────────────────────────────┘
```

Pull requests run **CI only**. Nothing is published or deployed until the change is on `main`.

Content edits made in `/admin` are **not** deployments: they are live the moment you publish.
CI/CD is for *code* changes (new features, fixes, dependency updates).

## One-time setup (about 20 minutes)

You need a small Linux server (any VPS, 1 GB RAM is enough) with Docker installed and ports 80/443 open,
and a domain name pointing at it (an `A` record). Then:

### 1. Prepare the server

```sh
# as a normal user that can run docker (sudo usermod -aG docker $USER, then log in again)
mkdir -p ~/portfolio && cd ~/portfolio
# create the secrets file. The pipeline never overwrites it.
cat > .env <<'EOF'
SITE_ADDRESS=yourdomain.com
SITE_URL=https://yourdomain.com
ADMIN_PASSWORD=<12+ chars, not guessable>
JWT_SECRET=<node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
REDIS_PASSWORD=<letters and digits only>
EOF
chmod 600 .env
```

(`deploy/.env.example` lists every option.) Use a **dedicated SSH key** for deployments:
`ssh-keygen -t ed25519 -f deploy_key -N ""`, append `deploy_key.pub` to the server's `~/.ssh/authorized_keys`.

### 2. Add the secrets and variables in GitHub

Repository → **Settings → Secrets and variables → Actions**

| Kind | Name | Value |
|---|---|---|
| Secret | `DEPLOY_HOST` | server IP or hostname |
| Secret | `DEPLOY_USER` | the SSH user, e.g. `ubuntu` |
| Secret | `DEPLOY_PATH` | absolute path from step 1, e.g. `/home/ubuntu/portfolio` |
| Secret | `DEPLOY_SSH_KEY` | the **private** key (contents of `deploy_key`) |
| Secret *(optional)* | `DEPLOY_KNOWN_HOSTS` | output of `ssh-keyscan yourserver` (pins the server's identity) |
| Variable | `SITE_URL` | `https://yourdomain.com` (used for social-preview tags and the smoke tests) |

Also: **Settings → Actions → General → Workflow permissions → Read and write** (needed to publish images),
and optionally **Settings → Environments → production → Required reviewers** if you want to approve each deployment.

### 3. Protect `main` (recommended)

**Settings → Branches → Add rule** for `main`: require a pull request, require the **CI** checks to pass.
Then nothing untested can reach production.

### 4. Ship it

Push to `main`. Watch **Actions → CI** then **Actions → Deploy**. Without the secrets the pipeline still runs and
publishes images; it just skips updating a server (a notice explains why).

## Everyday use

| Task | How |
|---|---|
| Deploy a change | merge to `main`. Done. |
| See what is live | `docker compose ps` on the server, or `GET /api/health` |
| **Roll back** | Actions → Deploy → *Run workflow* with an older commit SHA; or on the server `IMAGE_TAG=<sha> ./deploy.sh` |
| View logs | `docker compose logs -f backend` |
| Back up your data | `docker compose exec redis sh -c 'redis-cli -a "$REDIS_PASSWORD" --no-auth-warning --rdb /data/backup.rdb'`, then `docker compose cp redis:/data/backup.rdb .` and keep the file somewhere safe |
| Rotate the admin password | edit `.env` on the server, `docker compose up -d backend` |
| Update dependencies | review and merge the weekly Dependabot pull requests |

## Run the production stack on your own computer

```sh
cp deploy/.env.example deploy/.env      # set ADMIN_PASSWORD, JWT_SECRET, REDIS_PASSWORD, HTTP_PORT=8088
npm run prod:local                      # builds both images and starts everything
SMOKE_URL=http://localhost:8088 npm run test:smoke
npm run prod:local:down
```

## Not using a VPS?

The images are standard: run `ghcr.io/<owner>/<repo>-api` and `-web` on Fly.io, Render, Railway, or Kubernetes with a
managed Redis (`REDIS_URL`), and route `/api/*` to the API. Only `deploy.yml`'s last steps (SSH) change; CI and the
image publishing stay as they are.
