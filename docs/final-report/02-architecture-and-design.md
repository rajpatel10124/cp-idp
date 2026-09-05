# Capstone Final Report — Part 2: Architecture & Implementation

## 1. System Architecture

```
Developer ──> Backstage IDP Portal (Port 3000/7007)
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
  [ Scaffolder Engine ] [ Catalog Graph ]
         │
         ├── Fetch Skeleton (Express REST API / Node Worker)
         ├── Publish Repository to GitHub
         ├── Trigger GitHub Actions (OIDC Auth -> AWS ECR -> AWS EKS)
         └── Enforce OPA / Kyverno Policy Guardrails
```

## 2. Infrastructure as Code (IaC) Design

Modular Terraform structure cleanly separating concerns:
- `modules/vpc`: Multi-AZ network topology with public/private subnet splitting.
- `modules/eks`: Managed Kubernetes cluster with auto-scaling node groups.
- `modules/ecr`: ECR image registries with lifecycle immutability and scan-on-push policies.
- `modules/iam`: AWS OIDC federation for keyless CI/CD authentication.
- `modules/rds`: PostgreSQL storage engine for catalog state.
