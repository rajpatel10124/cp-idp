# Local Development Guide — Internal Developer Platform (IDP)

This guide walks through setting up and running the IDP locally on a developer workstation using Backstage, local software catalogs, and Golden Path templates.

---

## 1. Prerequisites

Before starting, ensure the following tools are installed (run `./scripts/validation/environment-check.sh` to verify):

- **Node.js**: `v20.x` LTS (or `v18.18+`)
- **Yarn**: `v1.22.x`
- **Docker**: `v24+` (running daemon)
- **kubectl & Helm**: Optional for local Kubernetes testing (Kind or Minikube)
- **Git**: `v2.30+`

---

## 2. Quick Start (Single Command)

To initialize and start the platform in local development mode:

```bash
./scripts/start-local.sh
```

This script will:
1. Validate system environment requirements.
2. Install npm/yarn workspace dependencies under `app/backstage/`.
3. Launch the **Backstage Frontend** at `http://localhost:3000`.
4. Launch the **Backstage Backend Engine** at `http://localhost:7007`.

---

## 3. Configuration & Secrets (`.env`)

Copy `.env.example` to `.env` to configure your GitHub personal access token and local overrides:

```bash
cp .env.example .env
```

Key environment variables:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `GITHUB_TOKEN` | GitHub Personal Access Token (with `repo`, `workflow`, `read:org` scopes) | Required for template publishing |
| `GITHUB_CLIENT_ID` | OAuth App Client ID for GitHub login | Development guest auth used if empty |
| `GITHUB_CLIENT_SECRET` | OAuth App Client Secret | Optional for local dev |
| `NODE_ENV` | Environment mode | `development` |

---

## 4. Port Architecture

| Component | Default Port | Description |
| :--- | :--- | :--- |
| **Backstage UI** | `3000` | React single-page application |
| **Backstage Backend** | `7007` | Node.js Express REST API & Scaffolder Engine |
| **Prometheus** | `9090` | Local metrics server (optional) |
| **Grafana** | `3001` | Dashboard UI (optional) |

---

## 5. Stopping Services

To stop all background processes cleanly:

```bash
./scripts/stop-local.sh
```

---

## 6. Local Verification Checklist

- [x] Access `http://localhost:3000` — UI loads header and navigation sidebar.
- [x] Access `http://localhost:7007/api/catalog/entities` — Catalog API returns registered YAML entities.
- [x] Access `http://localhost:3000/create` — Scaffolder displays "Create REST API Service" and "Create Worker Service" Golden Path templates.
- [x] Access `http://localhost:3000/docs` — TechDocs index renders documentation catalog.
