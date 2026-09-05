#!/usr/bin/env bash
# ==============================================================================
# Dockerfile Security & Best Practices Validator
# ==============================================================================

set -euo pipefail

ERRORS=0

echo "=== Running Dockerfile Security Validation ==="

for df in $(find . -name "Dockerfile" -not -path "*/node_modules/*"); do
  echo "Inspecting ${df}..."

  # 1. Non-root user check
  if grep -q "USER " "${df}"; then
    echo "  [PASS] Non-root USER specified."
  else
    echo "  [FAIL] ${df} missing non-root USER instruction."
    ERRORS=$((ERRORS + 1))
  fi

  # 2. Healthcheck instruction
  if grep -q "HEALTHCHECK" "${df}"; then
    echo "  [PASS] HEALTHCHECK present."
  else
    echo "  [FAIL] ${df} missing HEALTHCHECK instruction."
    ERRORS=$((ERRORS + 1))
  fi

  # 3. Floating latest tag in base image check
  if grep -q "^FROM node:latest" "${df}"; then
    echo "  [FAIL] ${df} uses unpinned base image tag node:latest."
    ERRORS=$((ERRORS + 1))
  else
    echo "  [PASS] Base image properly tagged."
  fi
done

if [ "$ERRORS" -eq 0 ]; then
  echo "=== Dockerfile Security Validation PASSED ==="
  exit 0
else
  echo "=== Dockerfile Security Validation FAILED (${ERRORS} errors) ==="
  exit 1
fi
