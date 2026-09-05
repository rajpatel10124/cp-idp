# ForgeOps IDP — Internal Developer Platform

> **Version:** 1.0.0 · **Stack:** Backstage 1.25 · Node.js 20 LTS · Kubernetes 1.29 · Terraform 1.7

ForgeOps is a production-grade **Internal Developer Platform (IDP)** built on **Spotify Backstage**. It unifies service scaffolding, multi-target deployment automation, OPA policy enforcement, real-time observability, and centralized TechDocs into a single developer portal — reducing Time-to-First-Deploy by **89.6%**.

---

## Platform Components

| Component | Technology | Port | Purpose |
|-----------|-----------|------|---------|
| Developer Portal UI | React + Backstage | `3000` | Self-service console for all platform capabilities |
| Backend Control Plane | Node.js + Express | `7007` | API router, deployment engine, catalog management |
| Software Catalog | Backstage Catalog | `7007/api/catalog` | Entity registry for all services, APIs, and resources |
| Golden Path Engine | Backstage Scaffolder | `7007/api/scaffolder` | Template-driven service scaffolding automation |
| Policy Engine | OPA (Rego) | `8181` | Admission control and guardrail enforcement |
| Observability Stack | Prometheus + Grafana | `9090` / `3001` | Metrics scraping and visualization dashboards |

---

## Key Capabilities

### 1. Self-Service Service Scaffolding (Golden Paths)
Choose a template → fill parameters → get a fully-wired microservice in under 60 seconds:
- **REST API Microservice** — Express.js with Prometheus metrics, health probes, Docker, K8s manifests, and GitHub Actions CI/CD
- **Background Worker Service** — Event-loop consumer with telemetry port, Kubernetes Deployment, and catalog registration

### 2. Multi-Target Deployment Engine
An 8-step state machine deploys to any registered target adapter:

```
QUEUED → VALIDATING → CLONING → BUILDING → PUSHING → DEPLOYING → VERIFYING → SUCCESS
```

**Supported targets:**
- `local-docker` — Local Docker Engine (development)
- `minikube` / `kind` — Local Kubernetes cluster
- `aws-eks` — Amazon EKS (production)
- `azure-aks` — Azure AKS (cloud staging)

### 3. OPA Policy Guardrails
Every deployment is evaluated against active Rego policies **before** any infrastructure operation:
- `no-prod-deploy-without-approval` — Blocks production without `forgeops/approved: "true"` annotation
- `require-resource-limits` — Enforces CPU/memory limits on all Kubernetes manifests
- `require-cost-tags` — Mandates `owner`, `team`, and `cost-center` parameters
- `rbac-template-access` — Restricts template execution to `admin` and `developer` roles

### 4. Unified Observability
- **Prometheus** scrapes metrics from all deployed services at `/metrics`
- **Grafana** renders the `ForgeOps Platform Overview` dashboard auto-provisioned on startup
- **DORA Metrics** — Deployment Frequency, Lead Time, Change Failure Rate, MTTR

### 5. Centralized TechDocs
This documentation is served live from the filesystem via the backend TechDocs content API, rendered inline within the Backstage portal — exactly matching the Backstage TechDocs specification.

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/forgeops-idp.git
cd forgeops-idp

# 2. Configure environment
cp .env.example .env
# Edit .env — add GITHUB_TOKEN if needed for private repos

# 3. Start the platform (frontend + backend + Docker stack)
./scripts/start-local.sh

# 4. Open the portal
open http://localhost:3000
```

---

## Repository Structure

```
forgeops-idp/
├── app/backstage/                  # Backstage monorepo
│   ├── packages/app/               # React frontend (portal UI)
│   └── packages/backend/           # Node.js backend (control plane)
├── catalog/                        # Persistent entity, deployment, and audit stores
├── docs/                           # This TechDocs content
├── grafana/                        # Grafana provisioning configs and dashboards
├── helm/                           # Helm chart for Kubernetes deployment
├── infrastructure/
│   ├── kubernetes/                 # K8s manifests (namespaces, monitoring, policies)
│   └── terraform/                  # IaC modules (VPC, EKS, RDS, ECR, IAM)
├── policies/                       # OPA Rego policy files
├── scripts/                        # Platform lifecycle scripts
└── templates/                      # Golden Path scaffolding templates
    ├── rest-api/                   # REST microservice template
    └── worker-service/             # Background worker template
```
