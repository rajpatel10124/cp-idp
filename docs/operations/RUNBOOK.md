# IDP Platform Operations Runbook

> **Last Updated:** September 2026 · **Owner:** Platform Engineering Team · **Severity SLA:** P1 = 30 min, P2 = 4 hr

This runbook provides complete step-by-step instructions for deploying, operating, troubleshooting, and maintaining the ForgeOps Internal Developer Platform.

---

## Section A: Prerequisites & Environment Checklist

Run the automated environment check before any operation:

```bash
./scripts/validation/validate-all.sh
```

**Required tool versions:**

| Tool | Required Version | Check Command |
|------|-----------------|---------------|
| Node.js | `v20.x` LTS | `node --version` |
| Yarn | `v1.22.x` | `yarn --version` |
| Docker | `v24+` | `docker --version` |
| Terraform | `v1.5+` | `terraform version` |
| kubectl | `v1.26+` | `kubectl version --client` |
| Helm | `v3.10+` | `helm version` |
| AWS CLI | `v2` | `aws --version` |

---

## Section B: Local Deployment (Development Mode)

### 1. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# GitHub integration (optional — required for private repos)
GITHUB_TOKEN=ghp_your_github_personal_access_token

# OPA Policy Engine
OPA_URL=http://localhost:8181

# Observability
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:3001
```

### 2. Start the Full Platform Stack

```bash
# Start Backstage (frontend + backend)
./scripts/start-local.sh

# In a separate terminal, start Docker services (Prometheus, Grafana, OPA)
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

### 3. Verify All Endpoints

```bash
# Backstage Portal
curl http://localhost:3000

# Backend Health Check
curl http://localhost:7007/api/health

# OPA Policy Engine
curl http://localhost:8181/health

# Prometheus
curl http://localhost:9090/-/healthy

# Grafana
curl http://localhost:3001/api/health
```

**Expected service map:**

| Service | URL | Status Endpoint |
|---------|-----|----------------|
| Portal UI | `http://localhost:3000` | HTTP 200 |
| Backend API | `http://localhost:7007` | `/api/health` |
| OPA Engine | `http://localhost:8181` | `/health` |
| Prometheus | `http://localhost:9090` | `/-/healthy` |
| Grafana | `http://localhost:3001` | `/api/health` |

### 4. Stop Platform

```bash
./scripts/stop-local.sh
docker-compose down
```

---

## Section C & D: Infrastructure Provisioning with Terraform

### Initialize Terraform

```bash
cd infrastructure/terraform/environments/dev
terraform init
```

### Inspect Infrastructure Plan

```bash
terraform plan -out=tfplan
```

### Apply Cloud Infrastructure

```bash
terraform apply tfplan
```

> ⚠️ **Warning:** Running `terraform apply` against a production workspace will provision real AWS resources and incur costs. Always review the plan output before applying.

### Terraform Module Reference

| Module | Path | Provisions |
|--------|------|-----------|
| `vpc` | `modules/vpc` | VPC, subnets, route tables, NAT gateway |
| `eks` | `modules/eks` | EKS cluster, node groups, OIDC provider |
| `ecr` | `modules/ecr` | Container registries per service |
| `rds` | `modules/rds` | PostgreSQL 15 RDS cluster (Multi-AZ prod) |
| `iam` | `modules/iam` | OIDC federation roles for GitHub Actions |
| `s3` | `modules/s3` | TechDocs artifact storage bucket |

---

## Section E & F: EKS & Backstage Platform Deployment

### Configure Kubeconfig for Amazon EKS

```bash
aws eks update-kubeconfig \
  --name forgeops-eks-cluster \
  --region us-east-1
```

### Apply Kubernetes Namespaces

```bash
kubectl apply -f infrastructure/kubernetes/namespaces/namespaces.yaml
```

**Namespace layout:**

```
forgeops-system     # Backstage IDP control plane
forgeops-dev        # Developer workloads (development)
forgeops-staging    # Pre-production environment
forgeops-prod       # Production workloads
team-backend-dev    # Team Backend — development namespace
team-backend-prod   # Team Backend — production namespace
```

### Deploy Backstage via Helm

```bash
helm upgrade --install forgeops-idp ./helm/backstage \
  --namespace forgeops-system \
  --create-namespace \
  --set image.tag=latest \
  --set secrets.GITHUB_TOKEN="${GITHUB_TOKEN}" \
  --set ingress.host=idp.your-domain.internal \
  --values helm/backstage/values.production.yaml
```

---

## Section G: Golden Path Usage Flow

1. Open the portal at `http://localhost:3000`
2. Navigate to **Golden Paths** in the sidebar
3. Select a template: **REST API Microservice** or **Worker Service**
4. Fill in required parameters:
   - `component_id` — Service name (e.g., `payment-service`)
   - `owner` — Team name (e.g., `team-backend`)
   - `environment` — Target environment (`development`, `staging`, `production`)
   - `port` — HTTP port (e.g., `3001`)
5. Click **Scaffold & Deploy** — the platform:
   - Validates parameters against OPA policies
   - Creates Kubernetes Deployment + Service manifests
   - Registers the entity in the Software Catalog
   - Records an audit event in the Activity Log

---

## Section H & I: CI/CD & Observability

### Monitoring Stack Setup

```bash
# Apply Prometheus scrape rules
kubectl apply -f infrastructure/kubernetes/monitoring/prometheus-rules.yaml

# Verify Grafana dashboard provisioning
bash scripts/verify-grafana.sh
```

### Grafana Dashboard Access

The `ForgeOps Platform Overview` dashboard is auto-provisioned at startup:

- **URL:** `http://localhost:3001/d/forgeops-main`
- **UID:** `forgeops-main`
- **Panels:** Deployment Success Rate, Active Pods, CPU by Pod, Memory Usage, HTTP Request Rate, Deployment Activity

---

## Section J & K: OPA Policy Testing

### Self-test: Viewer role should be denied

```bash
curl -s -X POST http://localhost:8181/v1/data/forgeops/allow \
  -H 'Content-Type: application/json' \
  -d '{"input":{"user":"viewer","template":"rest-api","environment":"production"}}' | jq .
# Expected: {"result": false}
```

### Self-test: Developer role with cost tags should pass

```bash
curl -s -X POST http://localhost:8181/v1/data/forgeops/allow \
  -H 'Content-Type: application/json' \
  -d '{"input":{"user":"developer","template":"rest-api","environment":"development","parameters":{"owner":"team-backend","team":"backend","cost-center":"CC-1042"}}}' | jq .
# Expected: {"result": true}
```

---

## Section L & M: Troubleshooting & Log Diagnostics

### Backstage Backend Logs

```bash
# Development (local)
cd app/backstage && yarn workspace backend start 2>&1 | tee /tmp/backend.log

# Kubernetes
kubectl logs -n forgeops-system -l app=backstage-idp --tail=200 -f
```

### Common Error Resolutions

| Error | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED 7007` | Backend not running | Run `./scripts/start-local.sh` |
| `OPA server unreachable` | OPA container not running | `docker-compose -f docker-compose.override.yml up opa` |
| `catalog.registered-entities.json ENOENT` | First run, file missing | Will auto-create on first entity registration |
| `SQLite SQLITE_CANTOPEN` | Wrong working directory | Start from `app/backstage/` root |
| `Port 3000 already in use` | Previous process still running | `./scripts/stop-local.sh` |

---

## Section N: Rollback Procedure

### Rollback a Deployment via UI

1. Navigate to **Deployments** in the sidebar
2. Find the deployment record
3. Click **Rollback** → confirms rollback with previous revision

### Rollback via kubectl

```bash
# Check rollout history
kubectl rollout history deployment/payment-service -n forgeops-prod

# Rollback to previous revision
kubectl rollout undo deployment/payment-service -n forgeops-prod

# Rollback to specific revision
kubectl rollout undo deployment/payment-service -n forgeops-prod --to-revision=3
```

---

## Section O: Cloud Infrastructure Cleanup

```bash
# Remove Helm deployment
helm uninstall forgeops-idp -n forgeops-system

# Destroy Terraform-managed infrastructure
cd infrastructure/terraform/environments/dev
terraform destroy -auto-approve

# Clean local development resources
./scripts/cleanup/cleanup-local.sh
```

> ⚠️ **Caution:** `terraform destroy` is irreversible. Confirm all data has been backed up from RDS and S3 before running this command.
