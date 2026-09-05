# Golden Path Software Templates

ForgeOps provides pre-wired Golden Path templates that scaffold production-ready microservices with automated dockerization, Kubernetes manifests, CI/CD pipelines, TechDocs, and catalog definitions.

## Available Golden Paths

### 1. REST API Microservice (`templates/rest-api/`)
* **Workload Type**: Synchronous HTTP/REST Service
* **Key Features**:
  * Express.js HTTP Server
  * Health probes (`/health`, `/readiness`, `/liveness`, `/healthz`, `/livez`)
  * Prometheus metrics endpoint (`/metrics`)
  * Winston JSON structured logging
  * Non-root multi-stage Dockerfile
  * Kubernetes Deployment & Service manifests
  * Pre-configured GitHub Actions CI/CD workflow

### 2. Background Worker Service (`templates/worker-service/`)
* **Workload Type**: Asynchronous Background Event / Queue Consumer
* **Key Features**:
  * Event loop worker runtime with concurrency controls
  * Dedicated telemetry port (9090) for Prometheus scraping
  * No external HTTP application routing (non-HTTP workload)
  * Multi-stage Dockerfile & Kubernetes Deployment manifests
  * Integrated Backstage TechDocs & Catalog entity specification
