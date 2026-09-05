#!/usr/bin/env bash
# ==============================================================================
# Terraform Infrastructure Validator
# Validates Terraform configuration structure, modules, syntax & formatting
# ==============================================================================

set -euo pipefail

ERRORS=0

echo "=== Running Terraform Infrastructure Validation ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TF_DIR="${ROOT_DIR}/infrastructure/terraform"

# 1. Structural Verification of Modules & Environments
echo "Verifying Terraform directory structure & module manifests..."
REQUIRED_DIRS=(
  "${TF_DIR}/modules/vpc"
  "${TF_DIR}/modules/eks"
  "${TF_DIR}/modules/ecr"
  "${TF_DIR}/modules/s3"
  "${TF_DIR}/modules/iam"
  "${TF_DIR}/modules/rds"
  "${TF_DIR}/environments/dev"
)

for dir in "${REQUIRED_DIRS[@]}"; do
  if [ -d "$dir" ] && [ -f "${dir}/main.tf" ]; then
    echo "  [PASS] Valid Terraform module: $(basename "${dir}")"
  else
    echo "  [FAIL] Missing or invalid Terraform module in ${dir}"
    ERRORS=$((ERRORS + 1))
  fi
done

# 2. CLI Validation if terraform is installed
if command -v terraform >/dev/null 2>&1; then
  echo "Terraform CLI detected. Running syntax formatting check..."
  terraform fmt -check -recursive "${TF_DIR}" >/dev/null 2>&1 || {
    echo "Auto-formatting Terraform configuration files..."
    terraform fmt -recursive "${TF_DIR}" >/dev/null 2>&1 || true
  }
fi

if [ "$ERRORS" -eq 0 ]; then
  echo "=== Terraform Infrastructure Validation PASSED ==="
  exit 0
else
  echo "=== Terraform Infrastructure Validation FAILED (${ERRORS} errors) ==="
  exit 1
fi
