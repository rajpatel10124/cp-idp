# Platform Engineering: Building an Internal Developer Platform (IDP) with Backstage

[![IDP Monorepo CI Pipeline](https://github.com/company-org/idp-platform/actions/workflows/idp-platform-ci.yaml/badge.svg)](https://github.com/company-org/idp-platform/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Backstage](https://img.shields.io/badge/Backstage-1.25.0-blue.svg)](https://backstage.io)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-1.28-blue.svg)](https://kubernetes.io)
[![Terraform](https://img.shields.io/badge/Terraform-1.7.3-purple.svg)](https://terraform.io)

> **Final-Year Capstone Project — Fast Pace / Cloud-DevOps Track**  
> A functional, deployment-ready Internal Developer Platform (IDP) enabling automated self-service software scaffolding, cloud infrastructure provisioning, policy enforcement, telemetry, and Kubernetes deployments.

---

## 1. Project Overview

The **Internal Developer Platform (IDP)** solves developer friction and toolchain complexity by providing Spotify Backstage as a centralized developer portal. Developers can self-service standardized applications (Golden Paths) through a wizard UI and automatically provision source repositories, Docker build pipelines, Kubernetes manifests, Terraform cloud infrastructure (VPC, EKS, ECR, S3, RDS), telemetry dashboards, and policy guardrails.

```
Developer ──> Backstage Portal ──> Select Golden Path ──> Scaffolder Engine
                                                               │
┌──────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────┐
│                                                                                                                             │
▼                               ▼                               ▼                               ▼                             ▼
Source Repository       Docker Container         Kubernetes Deployment          Terraform IaC           Prometheus / Grafana
(GitHub Actions CI/CD)  (Non-Root / Multi-Stage) (EKS Workload / Helm)          (AWS VPC, EKS, RDS)     (Metrics & Dashboards)
```

---

## 2. Architecture & Tech Stack

- **Developer Portal**: Spotify Backstage (`v1.25.0`), React, TypeScript, Node.js (`v20 LTS`)
- **Software Catalog & Scaffolder**: Backstage Catalog API, Scaffolder Backend Engine
- **Cloud Infrastructure**: AWS (EKS `1.28`, ECR, VPC, S3, IAM OIDC, RDS PostgreSQL)
- **Infrastructure as Code**: Terraform (`v1.7.3`) with modular structure (`modules/vpc`, `modules/eks`, `modules/ecr`, `modules/s3`, `modules/iam`, `modules/rds`)
- **Containerization & K8s**: Docker, Helm 3 (`v3.13.2`), kubectl
- **CI/CD Pipelines**: GitHub Actions with OpenID Connect (OIDC) passwordless AWS authentication
- **Observability**: Prometheus Operator (`ServiceMonitor`), Grafana Dashboards
- **Security & Policy Guardrails**: Open Policy Agent (OPA Rego), Kyverno ClusterPolicies, Backstage Permission Policy

---

## 3. Golden Paths

The platform includes **two distinct functional Golden Path templates**:

| Golden Path Template | Architecture Type | Features Included |
| :--- | :--- | :--- |
| **1. Create REST API Service** | Synchronous Express HTTP API (`templates/rest-api`) | Health endpoints (`/healthz`, `/livez`), Prometheus metrics (`/metrics`), structured logging, multi-stage Dockerfile, k8s Deployment & Service, GitHub Actions CI/CD. |
| **2. Create Worker Service** | Asynchronous Background Queue Worker (`templates/worker-service`) | Event loop consumer, configurable concurrency, job duration telemetry, metrics server (port `9090`), non-root container, k8s Deployment. |

---

## 4. Quick Start (Local Development)

1. **Verify Prerequisites**:
   ```bash
   ./scripts/validation/environment-check.sh
   ```

2. **Configure Local Environment**:
   ```bash
   cp .env.example .env
   ```

3. **Start Local IDP Stack**:
   ```bash
   ./scripts/start-local.sh
   ```
   - **Backstage UI**: [http://localhost:3000](http://localhost:3000)
   - **Backstage Backend**: [http://localhost:7007](http://localhost:7007)

4. **Stop Services**:
   ```bash
   ./scripts/stop-local.sh
   ```

---

## 5. Automated Validation & Verification

Run the master end-to-end verification script across all 23 project phases:

```bash
./scripts/validate-all.sh
```

Sub-validators available under `scripts/validation/`:
- `environment-check.sh` — OS & CLI tool version check
- `validate-docker.sh` — Dockerfile security compliance audit
- `validate-terraform.sh` — Terraform formatting & syntax validation
- `validate-kubernetes.sh` — K8s YAML & Helm linting
- `validate-github.sh` — GitHub token & workflow validation
- `validate-security.sh` — Secret masking & security audit
- `node tests/unit/policies.test.js` — OPA/Kyverno unit test suite

---

## 6. Directory Structure

```
idp-platform/
├── app/
│   └── backstage/               # Backstage Portal App & Backend
├── templates/
│   ├── rest-api/                # Golden Path #1: REST API
│   └── worker-service/          # Golden Path #2: Worker Service
├── infrastructure/
│   ├── terraform/               # IaC Modules (VPC, EKS, ECR, S3, IAM, RDS)
│   └── kubernetes/              # K8s Namespaces, Policies, Prometheus Monitoring
├── helm/
│   ├── backstage/               # Helm chart for Backstage platform
│   └── service-chart/           # Generic microservice Helm chart
├── catalog/                     # Software Catalog topology definitions
├── .github/workflows/           # GitHub Actions CI/CD pipelines
├── docs/                        # Architecture, Setup, Security, Runbooks & Report Support
├── scripts/                     # Validation, Setup, Testing & Cleanup scripts
├── tests/                       # Unit tests for policy guardrails
├── .env.example
├── README.md
└── LICENSE
```

---

## 7. Operational Documentation & Academic Evaluation

- **Deployment Runbook**: [`docs/operations/RUNBOOK.md`](docs/operations/RUNBOOK.md)
- **Time-to-First-Deploy Experiment**: [`docs/evaluation/time-to-first-deploy.md`](docs/evaluation/time-to-first-deploy.md) (**89.6% time reduction**)
- **Cost Estimation Model**: [`docs/evaluation/cost-and-dora-metrics.md`](docs/evaluation/cost-and-dora-metrics.md)
- **Security & Threat Model**: [`docs/security/security-model.md`](docs/security/security-model.md)
- **Multi-Team Scalability**: [`docs/architecture/multi-team-scalability.md`](docs/architecture/multi-team-scalability.md)
- **Capstone Report Material**: [`docs/final-report/`](docs/final-report/)
- **Live Demo Script**: [`docs/operations/demo-script.md`](docs/operations/demo-script.md)

---

## 8. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
