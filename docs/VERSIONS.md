# IDP Platform — Dependency & Version Compatibility Manifest

This manifest documents the exact software versions, runtime requirements, and plugin version pins tested and supported for the Internal Developer Platform (IDP).

---

## 1. System Runtimes & CLIs

| Software Component | Target / Tested Version | Compatibility Requirement / Note |
| :--- | :--- | :--- |
| **Operating System** | Linux (Ubuntu 22.04 LTS / Debian 12 / RHEL 9) | POSIX compliant shell (`bash` 5.0+) |
| **Node.js** | `v20.11.1 LTS` | Range: `^18.18.0 \|\| ^20.9.0`. Node 20 LTS recommended. |
| **npm** | `v10.2.4` | Used for package execution |
| **Yarn** | `v1.22.19` (Yarn Classic) | Backstage monorepo works natively with Yarn v1 |
| **Python** | `v3.11.x` | Required for MkDocs TechDocs rendering engine |
| **Docker** | `v25.0.3` | Docker Engine / Docker Desktop with buildx |
| **Kubernetes** | `v1.28.x` / `v1.29.x` | Kind v0.20+ or AWS EKS 1.28+ |
| **kubectl** | `v1.29.1` | Must match Kubernetes minor version ±1 |
| **Helm** | `v3.13.2` | Helm 3 syntax for platform chart deployment |
| **Terraform** | `v1.7.3` | Minimum `v1.5.0` for HCL2 features & state locks |
| **AWS CLI** | `v2.15.15` | AWS CLI v2 for EKS auth token generation |

---

## 2. Backstage & Core Plugin Dependency Pins

| Dependency Name | Pinned Version | Purpose |
| :--- | :--- | :--- |
| `@backstage/cli` | `^1.25.0` | Build, lint, and serve tooling |
| `@backstage/core-app-api` | `^1.12.0` | Core UI state and authentication providers |
| `@backstage/core-plugin-api` | `^1.9.0` | Plugin registration interfaces |
| `@backstage/plugin-catalog` | `^1.16.0` | Software catalog frontend component |
| `@backstage/plugin-catalog-backend` | `^1.20.0` | Software catalog backend engine & processors |
| `@backstage/plugin-scaffolder` | `^1.20.0` | Software template UI & wizard |
| `@backstage/plugin-scaffolder-backend` | `^1.22.0` | Scaffolder template execution engine |
| `@backstage/plugin-techdocs` | `^1.10.0` | TechDocs documentation renderer |
| `@backstage/plugin-techdocs-backend` | `^1.10.0` | TechDocs builder service |
| `@backstage/plugin-permission-node` | `^0.7.26` | Policy engine and RBAC enforcement layer |
| `express` | `^4.18.2` | HTTP backend server framework |
| `knex` | `^3.1.0` | Database ORM (SQLite3 dev / PostgreSQL prod) |
| `pg` | `^8.11.3` | PostgreSQL client driver for production |

---

## 3. Kubernetes & AWS Module Matrix

| Module / Tool | Version | Notes |
| :--- | :--- | :--- |
| **terraform-aws-modules/vpc/aws** | `~> 5.5.0` | Multi-AZ VPC module with public/private subnets |
| **terraform-aws-modules/eks/aws** | `~> 20.0.0` | Managed EKS cluster module with Node Groups |
| **Kyverno / OPA Gatekeeper** | `v1.11.0` / `v3.14.0` | Kubernetes Admission Controller policy engine |
| **Prometheus Operator / Kube-Prometheus-Stack** | `v56.0.0` | Helm chart for Prometheus, Alertmanager, Grafana |
| **Grafana** | `v10.3.1` | Dashboard UI for cluster & IDP metrics |

---

## 4. Version Compatibility Rules

1. **Node.js**: Node 21+ is unsupported by Backstage core; stick strictly to Node.js 20 LTS.
2. **Yarn**: Backstage monorepos rely on Yarn v1 workspaces. Do not upgrade workspace root to Yarn v3/v4 PnP without adjusting workspace configuration.
3. **Terraform**: AWS Provider `~> 5.0` is required for modern EKS module functionality.
