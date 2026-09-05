# Capstone Demo Script — 5-10 Minute Presentation Flow

This script guides a 5-10 minute live capstone demonstration of the Internal Developer Platform (IDP).

---

## ⏱️ Step-by-Step Presentation Timeline

### Minute 0:00 - 1:30: Introduction & Software Catalog
- Open Backstage UI at `http://localhost:3000`.
- Show **Software Catalog Index** page.
- Click `order-service` -> show entity relation graph connecting `order-service` ──> `payment-api` ──> `payment-database`.
- Demonstrate system ownership metadata (`team-backend`).

### Minute 1:30 - 4:30: Golden Path Scaffolding Execution
- Click **Create...** in the sidebar (`http://localhost:3000/create`).
- Select **Create REST API Service**.
- Input parameters:
  - Service Name: `checkout-api`
  - Owner: `team-backend`
  - Environment: `dev`
  - Port: `8080`
- Click **Next Step** -> **Create**.
- Observe live step execution log:
  - Step 1: Fetch REST API Skeleton [PASS]
  - Step 2: Publish to GitHub [PASS]
  - Step 3: Register in Catalog [PASS]
- Click generated repository link -> show generated `Dockerfile`, `catalog-info.yaml`, `k8s/deployment.yaml`, `.github/workflows/ci-cd.yaml`.

### Minute 4:30 - 6:30: Policy Enforcement Demonstration (OPA / Kyverno)
- Show policy rejection: attempt to create service with port `80` or owner `none`.
- Show error banner: `POLICY REJECT: Service port must be between 1024 and 65535.`
- Highlight security guardrail preventing non-compliant infrastructure from reaching cluster.

### Minute 6:30 - 8:30: Observability & Telemetry
- Show Prometheus ServiceMonitor rules in `infrastructure/kubernetes/monitoring/prometheus-rules.yaml`.
- Open Grafana dashboard (`grafana-dashboard-platform.json` & `grafana-dashboard-services.json`).
- Show live pod count, CPU/Memory consumption, and microservice HTTP response status breakdown.

### Minute 8:30 - 10:00: Academic Evaluation & Conclusion
- Present Time-to-First-Deploy evaluation chart (**89.6% time reduction**).
- Conclude presentation and open for Q&A.
