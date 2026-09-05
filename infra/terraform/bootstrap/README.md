# ForgeOps IDP — Terraform Bootstrap Stack

## Purpose

The bootstrap stack resolves the **circular dependency problem**:
A GitHub Actions CI/CD pipeline needs an AWS IAM Role to provision infrastructure, and Terraform needs an S3 bucket with DynamoDB locking to store state. Neither can create itself from inside the automated pipeline.

This bootstrap stack is executed **once** per AWS account to provision:
1. **Encrypted S3 Bucket** (`forgeops-tfstate-<account>-<region>`) with versioning enabled and public access blocked.
2. **DynamoDB Locks Table** (`forgeops-terraform-locks`) with pay-per-request billing for state locking.
3. **AWS IAM OIDC Provider** for GitHub Actions (`token.actions.githubusercontent.com`).
4. **GitHub Actions Deployment IAM Role** (`forgeops-<env>-github-actions-role`) with a trust relationship strictly scoped to `repo:<owner>/<repo>:*`.

---

## One-Time Execution

Run this from an authenticated workstation (using `aws configure` or SSO credentials):

```bash
cd infra/terraform/bootstrap
terraform init
terraform plan
terraform apply
```

### Note Outputs

After apply completes, take note of the outputs:
- `github_actions_role_arn`: Configure as GitHub Secret / Variable `AWS_ROLE_ARN`
- `state_bucket_name`: Configure as GitHub Secret / Variable `TF_STATE_BUCKET`
- `aws_region`: `us-east-1` (or your configured region)

Once completed, GitHub Actions can authenticate passwordlessly using OIDC tokens to deploy all remaining platform infrastructure in `infra/terraform/`.
