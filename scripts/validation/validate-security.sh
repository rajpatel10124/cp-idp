#!/usr/bin/env bash
# ==============================================================================
# Security & Secret Audit Validator
# Checks for committed secrets, AWS keys, private tokens, or dangerous patterns
# ==============================================================================

set -euo pipefail

ERRORS=0

echo "=== Running Security & Secret Audit Validation ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${ROOT_DIR}"

# Check 1: Scan for hardcoded AWS Access Key IDs
echo "Scanning for AWS Access Key patterns..."
if grep -E -r --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist "AKIA[0-9A-Z]{16}" . 2>/dev/null; then
  echo "  [FAIL] Hardcoded AWS Access Key ID detected!"
  ERRORS=$((ERRORS + 1))
else
  echo "  [PASS] No hardcoded AWS Access Keys detected."
fi

# Check 2: Scan for hardcoded GitHub personal access tokens (40 char real ghp_)
echo "Scanning for GitHub token patterns..."
if grep -E -r --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude=".env.example" --exclude="*.md" "ghp_[a-zA-Z0-9]{36}" . 2>/dev/null; then
  echo "  [FAIL] Real GitHub Personal Access Token detected in repository!"
  ERRORS=$((ERRORS + 1))
else
  echo "  [PASS] No exposed GitHub Personal Access Tokens."
fi

# Check 3: Check .gitignore for sensitive files
echo "Checking .gitignore rules..."
if [ -f ".gitignore" ]; then
  if grep -q "\.env" .gitignore && grep -q "node_modules" .gitignore; then
    echo "  [PASS] .gitignore correctly ignores .env and node_modules."
  else
    echo "  [FAIL] .gitignore missing required secret patterns."
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "  [FAIL] Missing .gitignore file!"
  ERRORS=$((ERRORS + 1))
fi

if [ "$ERRORS" -eq 0 ]; then
  echo "=== Security & Secret Audit PASSED ==="
  exit 0
else
  echo "=== Security & Secret Audit FAILED (${ERRORS} security issues) ==="
  exit 1
fi
