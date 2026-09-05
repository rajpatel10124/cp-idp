#!/usr/bin/env bash
# ==============================================================================
# Stop Local IDP Environment & Monitoring Stack
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=== Stopping Internal Developer Platform (IDP) ==="

COMPOSE_CMD="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
  fi
fi

if [ -f "${ROOT_DIR}/infrastructure/monitoring-v2/docker-compose.v2.yml" ]; then
  echo "Stopping Observability V2 Stack..."
  ${COMPOSE_CMD} -f "${ROOT_DIR}/infrastructure/monitoring-v2/docker-compose.v2.yml" down || true
fi

if [ -f "${ROOT_DIR}/infrastructure/monitoring/docker-compose.monitoring.yml" ]; then
  echo "Stopping Monitoring V1 Stack..."
  ${COMPOSE_CMD} -f "${ROOT_DIR}/infrastructure/monitoring/docker-compose.monitoring.yml" down || true
fi

# Cleanup any orphaned monitoring containers
docker rm -f forgeops-grafana forgeops-prometheus forgeops-cadvisor forgeops-observability-v2-grafana forgeops-observability-v2-prometheus forgeops-observability-v2-cadvisor 2>/dev/null || true

echo "=== ForgeOps Monitoring Stack Stopped Successfully ==="
