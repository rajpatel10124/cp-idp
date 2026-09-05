# Terraform Infrastructure Engine

ForgeOps integrates HashiCorp Terraform for modular Infrastructure-as-Code (IaC) provisioning.

## Terraform Directory Structure
```
infrastructure/terraform/
├── environments/
│   ├── dev/          # Development environment stack
│   └── prod/         # Production environment stack
└── modules/
    ├── ecr/          # Amazon Elastic Container Registry
    ├── eks/          # Amazon Elastic Kubernetes Service
    ├── iam/          # AWS IAM OIDC roles & policies
    ├── rds/          # PostgreSQL RDS database cluster
    ├── s3/           # S3 bucket storage for TechDocs
    └── vpc/          # Virtual Private Cloud networking
```

## Platform Workflow Actions
The Platform UI provides interactive execution for:
* `validate`: Validates HCL configuration syntax without backend credentials.
* `plan`: Generates speculative execution plans.
* `apply`: Applies infrastructure changes to target cloud environment.
* `destroy`: Tear down development infrastructure.
