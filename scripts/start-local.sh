#!/usr/bin/env bash
# ==============================================================================
# Start Local IDP Environment (Backstage + Monitoring Stack + Catalogs)
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=== Starting Internal Developer Platform (IDP) in Local Development Mode ==="

# Check environment
if [ -f "${ROOT_DIR}/scripts/validation/environment-check.sh" ]; then
  echo "Running environment check..."
  "${ROOT_DIR}/scripts/validation/environment-check.sh" || true
fi

# Load local environment variables if present
if [ -f "${ROOT_DIR}/.env" ]; then
  echo "Loading environment variables from .env..."
  set -a
  source "${ROOT_DIR}/.env"
  set +a
elif [ -f "${ROOT_DIR}/.env.example" ]; then
  echo "No .env found. Using default development parameters from .env.example..."
fi

# Start Monitoring Stack (Prometheus, Grafana, cAdvisor)
if command -v docker >/dev/null 2>&1; then
  echo "Starting ForgeOps Monitoring Stack..."

  # Purge stale monitoring container instances to prevent legacy docker-compose KeyError
  docker rm -f forgeops-grafana forgeops-prometheus forgeops-cadvisor 2>/dev/null || true

  # Determine Compose V2 command
  COMPOSE_CMD="docker compose"
  if ! docker compose version >/dev/null 2>&1; then
    if command -v docker-compose >/dev/null 2>&1; then
      COMPOSE_CMD="docker-compose"
    fi
  fi

  echo "Using Docker Compose command: ${COMPOSE_CMD}"

  if [ -f "${ROOT_DIR}/infrastructure/monitoring/docker-compose.monitoring.yml" ]; then
    echo "Launching Monitoring V1 stack..."
    ${COMPOSE_CMD} -f "${ROOT_DIR}/infrastructure/monitoring/docker-compose.monitoring.yml" up -d || true
  fi

else
  echo "⚠️ Docker daemon not found or inactive. Monitoring container stack skipped."
fi

# Navigate to backstage application directory
cd "${ROOT_DIR}/app/backstage"

echo "Installing / verifying Node dependencies..."
if command -v yarn >/dev/null 2>&1; then
  yarn install --ignore-engines
else
  npm install
fi

echo "Starting Backstage Frontend (http://localhost:3000) & Backend (http://localhost:7007)..."
if command -v yarn >/dev/null 2>&1; then
  yarn dev
else
  npm run dev
fi
