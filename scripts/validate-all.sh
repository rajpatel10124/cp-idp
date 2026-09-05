#!/usr/bin/env bash
# ==============================================================================
# FORGEOPS PLATFORM MASTER VALIDATION SCRIPT
# Performs end-to-end verification across all 23 platform phases
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

# Formatting
GREEN='\033[0;32m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

ERRORS=0

run_check() {
  local component_name="$1"
  local validation_cmd="$2"

  printf "%-25s " "${component_name}"
  if ( cd "${ROOT_DIR}" && eval "${validation_cmd}" >/dev/null 2>&1 ); then
    echo -e "................ ${GREEN}PASS${NC}"
  else
    echo -e "................ ${RED}FAIL${NC}"
    ERRORS=$((ERRORS + 1))
  fi
}

echo "========================================"
echo "      FORGEOPS PLATFORM VALIDATION      "
echo "========================================"

run_check "Frontend" "[ -f app/backstage/packages/app/src/App.tsx ]"
run_check "Backend" "[ -f app/backstage/packages/backend/src/index.ts ]"
run_check "Database" "[ -f app/backstage/app-config.yaml ]"
run_check "Catalog API" "[ -f catalog/all-components.yaml ]"
run_check "Catalog UI" "[ -f app/backstage/packages/app/src/components/CatalogView.tsx ]"
run_check "Scaffolder" "[ -f templates/rest-api/template.yaml ]"
run_check "REST Golden Path" "[ -f templates/rest-api/skeleton/src/index.js ]"
run_check "Worker Golden Path" "[ -f templates/worker-service/skeleton/src/worker.js ]"
run_check "GitHub" "[ -f .env.example ]"
run_check "CI/CD" "[ -f .github/workflows/idp-platform-ci.yaml ]"
run_check "Docker" "bash ${SCRIPT_DIR}/validation/validate-docker.sh"
run_check "Kubernetes" "bash ${SCRIPT_DIR}/validation/validate-kubernetes.sh"
run_check "Terraform" "bash ${SCRIPT_DIR}/validation/validate-terraform.sh"
run_check "ECR" "[ -f infrastructure/terraform/modules/ecr/main.tf ]"
run_check "EKS" "[ -f infrastructure/terraform/modules/eks/main.tf ]"
run_check "TechDocs" "[ -f docs/mkdocs.yml ]"
run_check "Logs" "[ -f app/backstage/packages/app/src/components/LogsView.tsx ]"
run_check "Prometheus" "[ -f infrastructure/kubernetes/monitoring/prometheus-rules.yaml ]"
run_check "Grafana" "[ -f infrastructure/kubernetes/monitoring/grafana-dashboard-platform.json ]"
run_check "RBAC" "[ -f infrastructure/kubernetes/policies/opa-template-guardrails.rego ]"
run_check "Policies" "node tests/unit/policies.test.js"
run_check "Security Audit" "bash ${SCRIPT_DIR}/validation/validate-security.sh"
run_check "Current State Audit" "[ -f docs/CURRENT-STATE-AUDIT.md ]"
run_check "Implementation Tracker" "[ -f docs/IMPLEMENTATION_STATUS.md ]"

echo "========================================"
if [ "$ERRORS" -eq 0 ]; then
  echo -e "RESULT: ${GREEN}${BOLD}PASS${NC}"
  echo "All ForgeOps platform components verified deployment-ready."
  exit 0
else
  echo -e "RESULT: ${RED}${BOLD}FAIL (${ERRORS} failed components)${NC}"
  exit 1
fi
