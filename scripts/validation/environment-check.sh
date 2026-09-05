#!/usr/bin/env bash
# ==============================================================================
# IDP Platform Environment Diagnostic Script
# Detects installed tool versions, environment compatibility, and readiness.
# ==============================================================================

set -euo pipefail

# Text formatting
RED='\030[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo -e "${BLUE}${BOLD}====================================================${NC}"
echo -e "${BLUE}${BOLD}        IDP PLATFORM ENVIRONMENT CHECK              ${NC}"
echo -e "${BLUE}${BOLD}====================================================${NC}"
echo ""

check_tool() {
  local tool_name="$1"
  local check_cmd="$2"
  local min_version_note="$3"

  echo -n -e "Checking ${BOLD}${tool_name}${NC}... "
  if command -v "$tool_name" >/dev/null 2>&1; then
    local version_out
    version_out=$(eval "$check_cmd" 2>&1 | head -n 1)
    echo -e "${GREEN}INSTALLED${NC} (${version_out})"
    if [ -n "$min_version_note" ]; then
      echo -e "   └─ Note: Recommended version: ${min_version_note}"
    fi
  else
    echo -e "${RED}MISSING${NC}"
    echo -e "   └─ Action: Please install ${tool_name}. ${min_version_note}"
    ERRORS=$((ERRORS + 1))
  fi
}

check_optional_tool() {
  local tool_name="$1"
  local check_cmd="$2"
  local note="$3"

  echo -n -e "Checking ${BOLD}${tool_name}${NC} (Optional)... "
  if command -v "$tool_name" >/dev/null 2>&1; then
    local version_out
    version_out=$(eval "$check_cmd" 2>&1 | head -n 1)
    echo -e "${GREEN}INSTALLED${NC} (${version_out})"
  else
    echo -e "${YELLOW}NOT FOUND${NC}"
    echo -e "   └─ ${note}"
    WARNINGS=$((WARNINGS + 1))
  fi
}

echo -e "${BOLD}[1/3] Core Runtime & System Environment${NC}"
echo "Operating System: $(uname -s) $(uname -r) ($(uname -m))"

check_tool "node" "node -v" "v18.x or v20.x LTS"
check_tool "npm" "npm -v" "v9.x or v10.x"
check_optional_tool "yarn" "yarn -v" "Required for standard Backstage monorepo setup (v1.22.x)."
check_tool "python3" "python3 --version" "v3.10+"
check_tool "git" "git --version" "v2.30+"

echo ""
echo -e "${BOLD}[2/3] Cloud & Container Tooling${NC}"
check_tool "docker" "docker --version" "v24.0+"
check_tool "kubectl" "kubectl version --client --short 2>/dev/null || kubectl version --client" "v1.26+"
check_optional_tool "helm" "helm version --short" "Helm v3.10+ required for Kubernetes chart deployment."
check_tool "terraform" "terraform -v" "v1.5.0+"
check_optional_tool "aws" "aws --version" "AWS CLI v2 required for Cloud mode / EKS deployment."
check_optional_tool "kind" "kind --version" "Kind or Minikube required for Local Kubernetes mode."
check_optional_tool "minikube" "minikube version" "Minikube alternative for local k8s cluster."
check_optional_tool "opa" "opa version" "Open Policy Agent CLI for policy testing."

echo ""
echo -e "${BOLD}[3/3] System Daemon Checks${NC}"
echo -n "Checking Docker daemon... "
if docker info >/dev/null 2>&1; then
  echo -e "${GREEN}RUNNING${NC}"
else
  echo -e "${YELLOW}NOT RUNNING${NC} (Start Docker daemon for container builds & local k8s)"
  WARNINGS=$((WARNINGS + 1))
fi

echo -n "Checking Kubernetes cluster connection... "
if kubectl cluster-info >/dev/null 2>&1; then
  echo -e "${GREEN}CONNECTED${NC} ($(kubectl config current-context 2>/dev/null || echo "active"))"
else
  echo -e "${YELLOW}NOT CONNECTED${NC} (Local cluster kind/minikube or AWS EKS can be started later)"
  WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo -e "${BLUE}${BOLD}====================================================${NC}"
if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}ENVIRONMENT CHECK RESULT: PASS${NC} (${WARNINGS} warnings)"
  echo -e "You are ready to proceed with IDP deployment."
  exit 0
else
  echo -e "${RED}${BOLD}ENVIRONMENT CHECK RESULT: FAIL (${ERRORS} missing required tools)${NC}"
  echo -e "Please install missing required tools before proceeding."
  exit 1
fi
