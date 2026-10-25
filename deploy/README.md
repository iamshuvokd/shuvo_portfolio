# deploy/

Everything needed to run the site in production. The full guide (server setup, GitHub secrets, rollback, backups) is in
[`docs/CICD.md`](../docs/CICD.md).

| File | Purpose |
|---|---|
| `docker-compose.yml` | the stack: **gateway** (Caddy, HTTPS) → **web** (nginx, static site) and **backend** (API) → **redis** (private) |
| `Caddyfile` | routing (`/api/*` → API, rest → site), automatic HTTPS, streaming-safe settings |
| `.env.example` | every setting; copy to `.env` **on the server** (never committed) |
| `deploy.sh` | pull + restart + health check + **automatic rollback**; run by the pipeline over SSH or by hand |

```sh
cp .env.example .env && nano .env     # fill in the three secrets, SITE_ADDRESS, SITE_URL
./deploy.sh                           # deploy IMAGE_TAG from .env (default: latest)
IMAGE_TAG=<git-sha> ./deploy.sh       # deploy / roll back to an exact version
```

Only the gateway publishes ports (80/443). Redis and the API are reachable only inside the Docker network, and Redis
requires a password.
