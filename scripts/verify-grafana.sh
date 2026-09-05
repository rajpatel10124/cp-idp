#!/bin/bash
set -e

GRAFANA_URL="${GRAFANA_URL:-http://localhost:3001}"

echo "Waiting for Grafana at ${GRAFANA_URL}..."
until curl -sf "${GRAFANA_URL}/api/health" > /dev/null 2>&1; do
  echo "  Still waiting..."
  sleep 2
done

echo "✅ Grafana is up — checking for ForgeOps workload dashboard..."

DASH=$(curl -sf "${GRAFANA_URL}/api/dashboards/uid/forgeops-service-observability" 2>/dev/null || echo "")

if echo "$DASH" | grep -q "forgeops-service-observability"; then
  echo "✅ Grafana dashboard provisioned successfully"
  echo "   Dashboard URL: ${GRAFANA_URL}/d/forgeops-service-observability/forgeops-service-observability"
else
  echo "❌ Dashboard not found — check provisioning config"
  echo "   Tried: ${GRAFANA_URL}/api/dashboards/uid/forgeops-service-observability"
  echo "   Response: $DASH"
  exit 1
fi
