#!/bin/bash
# Replaces a site's container with a new image, rolls back if it does not become healthy and
# removes the site's older images. Installed to ~/webservices/deploy.sh by `blog-deploy site`.
# Usage: deploy.sh <image:tag> <container> [host-port]
# Expects ~/webservices/<container>.env and ~/webservices/<container>-service-account.json.
set -euo pipefail

IMAGE=${1:?Missing image (user/name:tag)}
CONTAINER=${2:?Missing container name}
HOST_PORT=${3:-3000}
REPOSITORY=${IMAGE%:*}
ENV_FILE=~/webservices/${CONTAINER}.env
SERVICE_ACCOUNT_FILE=~/webservices/${CONTAINER}-service-account.json

# Published on 127.0.0.1 only: the site is reached through nginx, never on the bare port
start() {
  docker run -d \
    --name "${CONTAINER}" \
    --restart unless-stopped \
    -p "127.0.0.1:${HOST_PORT}:3000" \
    --env-file "${ENV_FILE}" \
    -e GOOGLE_APPLICATION_CREDENTIALS=/secrets/service-account.json \
    -v "${SERVICE_ACCOUNT_FILE}:/secrets/service-account.json:ro" \
    "$1" >/dev/null
}

# Waits for the image's HEALTHCHECK, or for an HTTP answer when the image has none
healthy() {
  local state
  for _ in $(seq 1 60); do
    state=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "${CONTAINER}" 2>/dev/null || echo missing)
    case "${state}" in
      healthy) return 0 ;;
      running) curl -fsS -o /dev/null "http://127.0.0.1:${HOST_PORT}/" && return 0 ;;
      unhealthy | exited | dead | missing) return 1 ;;
    esac
    sleep 3
  done
  return 1
}

echo "Pulling ${IMAGE}..."
docker pull -q "${IMAGE}"

PREVIOUS=$(docker inspect -f '{{.Config.Image}}' "${CONTAINER}" 2>/dev/null || true)

echo "Replacing ${CONTAINER} on 127.0.0.1:${HOST_PORT}..."
docker rm -f "${CONTAINER}" >/dev/null 2>&1 || true
start "${IMAGE}"

if ! healthy; then
  echo "${IMAGE} did not become healthy. Last logs:" >&2
  docker logs --tail 50 "${CONTAINER}" >&2 || true
  if [ -n "${PREVIOUS}" ] && [ "${PREVIOUS}" != "${IMAGE}" ]; then
    echo "Rolling back to ${PREVIOUS}..." >&2
    docker rm -f "${CONTAINER}" >/dev/null
    start "${PREVIOUS}"
  fi
  exit 1
fi

# Keeps the running image and the previous one (instant rollback); other sites' images are untouched
echo "Removing older images of ${REPOSITORY}..."
KEEP=" $(docker image inspect -f '{{.Id}}' "${IMAGE}") "
if [ -n "${PREVIOUS}" ]; then
  KEEP+="$(docker image inspect -f '{{.Id}}' "${PREVIOUS}" 2>/dev/null || true) "
fi
docker images --no-trunc --format '{{.ID}} {{.Tag}}' "${REPOSITORY}" | while read -r id tag; do
  [[ "${KEEP}" == *" ${id} "* ]] && continue
  if [ "${tag}" = "<none>" ]; then
    docker rmi "${id}" >/dev/null 2>&1 || true
  else
    docker rmi "${REPOSITORY}:${tag}" >/dev/null 2>&1 || true
  fi
done
docker image prune -f >/dev/null

echo "Deployed ${IMAGE}."
