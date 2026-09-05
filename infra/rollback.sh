#!/usr/bin/env bash
# ==============================================================================
# ForgeOps IDP — Workload Rollback Automation
# Safely rolls back to previous deployment revision or specific container image tag
# ==============================================================================

set -euo pipefail

TARGET="${1:-previous}"

echo "============================================================"
echo "          FORGEOPS IDP — ROLLBACK ENGINE                    "
echo "============================================================"

# Verify kubectl context
if ! command -v kubectl >/dev/null 2>&1; then
  echo "ERROR: kubectl is required to execute rollback." >&2
  exit 1
fi

echo "Current deployment revision history:"
kubectl rollout history deployment/forgeops -n forgeops

if [ "$TARGET" = "previous" ]; then
  echo "Executing rollback to immediate previous revision..."
  kubectl rollout undo deployment/forgeops -n forgeops
elif [[ "$TARGET" =~ ^[0-9]+$ ]]; then
  echo "Executing rollback to revision $TARGET..."
  kubectl rollout undo deployment/forgeops -n forgeops --to-revision="$TARGET"
else
  # Target assumed to be a container image tag
  echo "Executing rollback to container image tag: $TARGET..."
  CURRENT_IMAGE=$(kubectl get deployment forgeops -n forgeops -o jsonpath='{.spec.template.spec.containers[0].image}')
  REPO_BASE=$(echo "$CURRENT_IMAGE" | cut -d':' -f1)
  NEW_IMAGE="${REPO_BASE}:${TARGET}"
  echo "Setting image to $NEW_IMAGE..."
  kubectl set image deployment/forgeops forgeops="$NEW_IMAGE" -n forgeops
fi

echo "Waiting for rollback rollout to complete..."
if kubectl rollout status deployment/forgeops -n forgeops --timeout=120s; then
  echo ""
  echo "============================================================"
  echo "          ROLLBACK COMPLETED SUCCESSFULLY                   "
  echo "============================================================"
  kubectl get pods -n forgeops -l app.kubernetes.io/name=forgeops
else
  echo "ERROR: Rollback rollout failed! Pods did not reach ready state." >&2
  kubectl get pods -n forgeops -l app.kubernetes.io/name=forgeops
  kubectl logs deployment/forgeops -n forgeops --tail=30 >&2
  exit 1
fi
