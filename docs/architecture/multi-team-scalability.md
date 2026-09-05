# ForgeOps IDP — Platform Architecture & Design

> **Architecture Version:** 1.0 · **Pattern:** Event-Driven State Machine + Policy-As-Code + Adapter Pattern

## Executive Summary

ForgeOps is a production-grade Internal Developer Platform engineered on **Spotify Backstage**. The platform delivers self-service infrastructure provisioning via a multi-target deployment engine, enforces security through OPA Rego policies, and provides unified observability via Prometheus and Grafana — all within a single React developer portal.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer Portal (React)                   │
│         localhost:3000  ·  Backstage Frontend Shell          │
│  ┌──────────┬──────────┬──────────┬──────────┬────────────┐ │
│  │ Overview │ Services │ Deploy   │ Catalog  │ TechDocs   │ │
│  │ Dashboard│ &Workloads│ Engine  │ & RBAC   │ & Policies │ │
│  └──────────┴──────────┴──────────┴──────────┴────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST  localhost:7007
┌────────────────────────▼────────────────────────────────────┐
│              Backstage Node.js Backend (Control Plane)        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Software     │  │ Golden Path  │  │ OPA Policy        │  │
│  │ Catalog API  │  │ Scaffolder   │  │ Guardrail Proxy   │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         8-Step Deployment State Machine              │    │
│  │  QUEUED→VALIDATING→CLONING→BUILDING→PUSHING→        │    │
│  │  DEPLOYING→VERIFYING→SUCCESS                        │    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Terraform    │  │ Audit Trail  │  │ Prometheus        │  │
│  │ IaC Engine   │  │ Engine       │  │ Metrics Endpoint  │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
└───────────┬─────────────────────────────────────────────────┘
            │
     ┌──────┴──────────────────────────────────┐
     │          Target Adapter Layer            │
     ├─────────────┬────────────┬──────────────┤
     ▼             ▼            ▼              ▼
  Local Docker  Minikube/    AWS EKS      Azure AKS
  (dev)         Kind (local) (production)  (staging)
```

---

## Key Architectural Principles

### 1. Target Adapter Isolation
The deployment state machine is **completely decoupled** from infrastructure targets. Adding a new deployment target (e.g., GKE) only requires implementing the adapter interface — zero changes to the state machine logic.

### 2. Persistent State Management
All platform state survives backend restarts via JSON file stores:

| Store | Path | Contents |
|-------|------|----------|
| Catalog Entities | `catalog/registered-entities.json` | All registered service entities |
| Deployments | `catalog/deployments.json` | Full deployment history with logs |
| Audit Events | `catalog/audit-events.json` | Immutable audit trail |
| RBAC Roles | `catalog/rbac-roles.json` | Role definitions and permissions |
| RBAC Assignments | `catalog/rbac-assignments.json` | User→role mappings |
| Policies | `catalog/platform-policies.json` | Active policy registry |
| Environments | `catalog/environments.json` | Namespace/cluster registry |
| Templates | `catalog/templates-registry.json` | Golden Path template definitions |

### 3. Policy-As-Code (OPA)
Security guardrails are implemented as **Rego policies** evaluated by the OPA server before any deployment executes. The policy decision pipeline:

```
Template Input → OPA /v1/data/forgeops/allow → {result: true/false}
                                                      │
                                           ┌──────────┴───────────┐
                                        ALLOW                   DENY
                                    Continue deploy         Record audit event
                                                            Return violations[]
                                                            Halt execution
```

### 4. Developer Self-Service Metrics
- **Time-to-First-Deploy:** Reduced from ~4 hours (manual) to **24.4 minutes** with Golden Paths
- **Policy Enforcement:** 100% of scaffolded services evaluated before deployment
- **Audit Coverage:** Every platform operation recorded with actor, action, target, timestamp

---

## API Surface

### Core Platform Endpoints

```
GET  /api/health                          Platform health check
GET  /api/platform/capabilities           Installed runtime adapters

GET  /api/platform/deployments            List all deployments
POST /api/platform/deployments            Trigger new deployment
GET  /api/platform/deployments/:id        Get deployment detail + logs
POST /api/platform/deployments/:id/rollback  Rollback a deployment

GET  /api/platform/catalog/entities       All registered entities
POST /api/platform/catalog/register       Register new catalog entity

GET  /api/platform/rbac/roles             List RBAC roles
POST /api/platform/rbac/roles             Create role
GET  /api/platform/rbac/assignments       List role assignments
POST /api/platform/rbac/assignments       Assign role to user/group

GET  /api/platform/policies               List active policies
POST /api/platform/policies/test          Evaluate policy against input
POST /api/platform/opa/evaluate           OPA-server enforcement check

GET  /api/platform/environments           List Kubernetes environments
POST /api/platform/environments           Create new namespace

GET  /api/platform/templates              List Golden Path templates
POST /api/platform/terraform/execute      Execute Terraform action

GET  /api/platform/audit/events           Query audit trail
GET  /api/platform/diagnostics            Full backend diagnostics report

GET  /api/observability/overview          Observability metrics overview
GET  /api/observability/workloads         Runtime workload health list
GET  /api/observability/dora              DORA engineering metrics

GET  /api/platform/docs/content?doc=KEY   TechDocs content (this page)
GET  /api/metrics                         Prometheus scrape endpoint
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Portal UI | React | 18.2 |
| UI Components | Material-UI | 4.12 |
| Backstage Framework | Spotify Backstage | 1.25 |
| Backend Runtime | Node.js | 20 LTS |
| API Framework | Express.js | 4.18 |
| Database | SQLite (dev) / PostgreSQL 15 (prod) | - |
| Container Runtime | Docker Engine | 24+ |
| Orchestration | Kubernetes | 1.29 |
| Helm Charts | Helm | 3.10 |
| Infrastructure-as-Code | HashiCorp Terraform | 1.7 |
| Policy Engine | Open Policy Agent (OPA) | 0.60 |
| Metrics Collection | Prometheus | 2.45 |
| Visualization | Grafana | 10.x |
| Cloud Provider | AWS (EKS, RDS, ECR, S3, VPC) | - |
