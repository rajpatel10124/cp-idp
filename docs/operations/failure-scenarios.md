# Failure Scenarios & Diagnostic Runbook

This document details negative testing scenarios, failure detection mechanisms, root-cause diagnostics, and automated recovery procedures for the Internal Developer Platform (IDP).

---

## Failure Matrix & Resolution Procedures

| Scenario | Trigger / Root Cause | Detection Mechanism | Diagnostic Command | Remediation Step |
| :--- | :--- | :--- | :--- | :--- |
| **Test A: Invalid Template Parameters** | User enters invalid service name or port < 1024 | Backstage Scaffolder form validation & OPA policy | View Scaffolder UI alert banner | Enter lowercase alphanumeric service name and port > 1024. |
| **Test B: CI/CD Build Failure** | Unit test assertion failure in scaffolded repo | GitHub Actions step exit code != 0 | `gh run view --log-failed` | Fix failing unit test assertions in `src/` and push commit. |
| **Test C: Docker Build Failure** | Missing npm dependency or broken syntax | Docker build step failure in CI/CD pipeline | `docker build .` locally | Verify `package.json` lockfile and multi-stage Dockerfile COPY steps. |
| **Test D: Terraform Validation Failure** | Undeclared variable or invalid provider config | `terraform validate` command error | `terraform validate` inside `infrastructure/terraform/` | Add missing variable definitions in `variables.tf`. |
| **Test E: K8s Deployment CrashLoopBackOff** | Container liveness/readiness probe failure | Kubernetes pod status `CrashLoopBackOff` | `kubectl logs deployment/<name> -n dev` | Check application environment variables and listening HTTP port. |
| **Test F: Policy Violation Rejection** | Workload missing `owner` or `environment` labels | Kyverno Admission Controller webhook rejection | `kubectl get events -n dev --field-selector reason=PolicyViolation` | Add mandatory `owner` and `environment` labels to `k8s/deployment.yaml`. |
| **Test G: Unauthorized Operation** | Developer attempts production deployment | Backstage RBAC Permission Policy denial | View audit log in Backstage backend output | Submit RFC request to Platform Admin team for production promotion. |
| **Test H: Pod Memory Leak / OOMKilled** | Application exceeds RAM memory limit (256Mi) | Kubelet kills pod with `OOMKilled` reason | `kubectl describe pod <pod-name>` | Increase memory limit in `k8s/deployment.yaml` or optimize memory usage. |
| **Test I: Missing Environment Config** | `.env` missing `GITHUB_TOKEN` | Scaffolder publisher error during git push | `./scripts/validation/environment-check.sh` | Copy `.env.example` to `.env` and insert valid GitHub access token. |
