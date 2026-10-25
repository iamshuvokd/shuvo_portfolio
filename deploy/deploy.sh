#!/usr/bin/env bash
# Pulls the requested images and restarts only what changed. Run on the server, from this folder:
#   ./deploy.sh                          deploy IMAGE_TAG from .env (default: latest)
#   IMAGE_TAG=<git-sha> ./deploy.sh      deploy (or ROLL BACK to) one specific version
# The CI/CD pipeline calls this over SSH after every successful build on main.
#
# Safety net: if the new release does not start or does not become healthy, the previous working version is
# restored automatically (its tag is remembered in .last-good-tag) and this script exits non-zero.
set -uo pipefail
cd "$(dirname "$0")"

[ -f .env ] || { echo "deploy/.env is missing. Copy .env.example to .env and fill it in." >&2; exit 1; }

PORT="$(grep -E '^HTTP_PORT=' .env | cut -d= -f2 || true)"
HEALTH_URL="http://127.0.0.1:${PORT:-80}/api/health"
NEW_TAG="${IMAGE_TAG:-$(grep -E '^IMAGE_TAG=' .env | cut -d= -f2 || true)}"
NEW_TAG="${NEW_TAG:-latest}"
LAST_GOOD="$(cat .last-good-tag 2>/dev/null || true)"

wait_healthy() {
  for attempt in $(seq 1 30); do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
      echo "Healthy after ${attempt} check(s)."
      return 0
    fi
    sleep 3
  done
  return 1
}

# Starts the stack at the given tag and succeeds only if it comes up AND answers the health check.
# (`compose up` itself fails when a dependency is unhealthy, so both outcomes are handled here.)
start_and_verify() {
  export IMAGE_TAG="$1"
  docker compose up -d --remove-orphans && wait_healthy
}

echo "==> Deploying tag: ${NEW_TAG}"
export IMAGE_TAG="$NEW_TAG"
# SKIP_PULL=1 uses images already on this machine (local testing, offline servers).
if [ "${SKIP_PULL:-0}" != "1" ] && ! docker compose pull --quiet; then
  echo "!! Could not pull images for tag ${NEW_TAG}. Nothing was changed; the current version is still running." >&2
  exit 1
fi

echo "==> Starting / updating containers, waiting for ${HEALTH_URL}"
if start_and_verify "$NEW_TAG"; then
  echo "$NEW_TAG" > .last-good-tag
  docker image prune -f >/dev/null # drop images from older releases
  docker compose ps
  exit 0
fi

echo "!! Release ${NEW_TAG} did not become healthy. Recent logs:" >&2
docker compose logs --tail=60 >&2

if [ -n "$LAST_GOOD" ] && [ "$LAST_GOOD" != "$NEW_TAG" ]; then
  echo "==> Rolling back to the last good version: ${LAST_GOOD}" >&2
  if start_and_verify "$LAST_GOOD"; then
    echo "Rolled back successfully. The failed release (${NEW_TAG}) is NOT live." >&2
  else
    echo "!! Rollback also failed. Investigate with: docker compose logs" >&2
  fi
else
  echo "No earlier good version is recorded, so there is nothing to roll back to." >&2
fi
exit 1
