# ForgeOps IDP — AWS Production Deployment Architecture
## Terraform + EKS + ECR + ALB + Observability (Prometheus & Grafana)

This directory contains the production-grade Infrastructure as Code (IaC) and automation workflows for deploying the ForgeOps Internal Developer Platform to Amazon Web Services (AWS).

```
GitHub Repository (main)
        ↓ (Push / Dispatch)
GitHub Actions CI/CD (OIDC Token)
        ↓ (Assume Role: forgeops-dev-github-actions-role)
Terraform Engine
        ↓
AWS Cloud Infrastructure (VPC, Subnets, IGW, NAT Gateway)
        ↓
Amazon EKS Managed Cluster (v1.28 / v1.29)
        ↓
Workloads (ForgeOps Backend + Frontend Monolith)
        ↓ (IRSA + AWS Load Balancer Controller)
AWS Application Load Balancer (ALB)
        ↓
Internet Users / Developers (http://<ALB-DNS>)
```

---

## Directory Structure

```
infra/
├── deploy.sh                     # Automated CLI deployment runner
├── rollback.sh                   # Instant workload rollback script
├── README.md                     # Platform documentation (this file)
└── terraform/
    ├── bootstrap/                # One-time bootstrap stack (breaks circular dependency)
    │   ├── versions.tf
    │   ├── provider.tf
    │   ├── variables.tf
    │   ├── outputs.tf
    │   ├── state_storage.tf      # S3 Remote State + DynamoDB Locks Table
    │   ├── oidc.tf               # GitHub Actions OIDC Provider & Scoped Role
    │   └── README.md
    ├── versions.tf               # Terraform core & provider version constraints
    ├── provider.tf               # AWS, Kubernetes, and Helm provider definitions
    ├── variables.tf              # Configurable infrastructure parameters
    ├── outputs.tf                # VPC, EKS, RDS, ECR, and ALB endpoints
    ├── main.tf                   # TechDocs S3 bucket & Kubernetes namespaces
    ├── networking.tf             # Multi-AZ VPC, Public & Private Subnets, IGW, NAT GW
    ├── eks.tf                    # Amazon EKS cluster, managed private node groups, OIDC
    ├── ecr.tf                    # ECR repositories, tag immutability, lifecycle policies
    ├── iam.tf                    # EKS Cluster, Node Group, and ALB Controller IRSA roles
    ├── rds.tf                    # PostgreSQL RDS, private DB subnet group, KMS encryption
    ├── backend.tf.example        # Remote state backend template
    └── environments/
        └── dev.tfvars            # Cost-controlled development parameters
```

---

## 1. One-Time Setup: Bootstrap Stack

To avoid circular dependencies between CI/CD and the infrastructure it manages, run the bootstrap stack **once**:

```bash
cd infra/terraform/bootstrap
terraform init
terraform plan
terraform apply
```

### Outputs to Configure in GitHub:

In your GitHub repository settings under **Settings -> Secrets and variables -> Actions**:

| Name | Type | Value / Source |
| :--- | :--- | :--- |
| `AWS_OIDC_ROLE_ARN` | Secret or Variable | `github_actions_role_arn` from bootstrap output |
| `TF_STATE_BUCKET` | Variable | `state_bucket_name` from bootstrap output |
| `TF_LOCKS_TABLE` | Variable | `forgeops-terraform-locks` |
| `AWS_REGION` | Variable | `us-east-1` |
| `FORGEOPS_GITHUB_TOKEN` | Secret | GitHub PAT for Scaffolder & Catalog imports |

---

## 2. Automated Deployments via GitHub Actions

Once bootstrap is in place, deployments are triggered automatically:

- **On Push**: Any commit pushed to `main` touching `app/**`, `infra/**`, or `k8s/**` triggers `.github/workflows/deploy-aws.yml`.
- **Manual Trigger**: Navigate to **Actions -> Deploy ForgeOps IDP to AWS** and click **Run workflow**.

GitHub Actions:
1. Requests an ephemeral OIDC token (`id-token: write`).
2. Authenticates to AWS via `aws-actions/configure-aws-credentials` (No static access keys).
3. Builds the Docker container tagged with the Git commit SHA (`sha-<commit>`).
4. Pushes the immutable image to Amazon ECR.
5. Runs `terraform init`, `validate`, `plan`, and `apply`.
6. Connects to the EKS cluster and applies Kubernetes manifests (`k8s/forgeops`).
7. Waits for pod rollout (`kubectl rollout status`).
8. Verifies ALB health on `/api/health`.
9. Publishes the public ForgeOps URL in the GitHub Step Summary.

---

## 3. Local / Bastion Deployment (`infra/deploy.sh`)

You can also deploy directly from an authenticated terminal:

```bash
./infra/deploy.sh
```

The script will:
- Validate prerequisites (`terraform`, `aws`, `kubectl`, `docker`).
- Validate AWS credentials and caller identity.
- Execute Terraform infrastructure provisioning.
- Build and push the container image to Amazon ECR.
- Deploy Kubernetes manifests with injected ECR image tags.
- Verify deployment health and output the public ALB endpoint.

---

## 4. Rollback (`infra/rollback.sh`)

If a deployed version causes unexpected degradation:

```bash
# Roll back to the immediately previous revision
./infra/rollback.sh

# Or roll back to a specific revision number
./infra/rollback.sh 2

# Or roll back to a specific immutable commit tag
./infra/rollback.sh sha-a1b2c3d
```

---

## 5. Cost Control & Resource Sizing

The default development configuration in `dev.tfvars` is optimized for cost efficiency:
- **EKS Node Group**: 2 x `t3.medium` instances (min 1, max 4).
- **RDS PostgreSQL**: `db.t4g.micro` (20GB gp3 storage with autoscaling up to 50GB).
- **VPC Networking**: Single NAT Gateway serving both private subnets across 2 AZs.
- **ECR**: Retains the last 30 tagged images; automatically deletes untagged layers after 7 days.
