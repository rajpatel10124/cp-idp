output "aws_region" {
  description = "AWS Region configured for ForgeOps"
  value       = var.aws_region
}

output "aws_account_id" {
  description = "AWS Account ID"
  value       = data.aws_caller_identity.current.account_id
}

output "state_bucket_name" {
  description = "S3 Bucket Name for Terraform remote state"
  value       = aws_s3_bucket.terraform_state.id
}

output "dynamodb_table_name" {
  description = "DynamoDB Table Name for state locking"
  value       = aws_dynamodb_table.terraform_locks.name
}

output "oidc_provider_arn" {
  description = "GitHub OIDC Provider ARN"
  value       = aws_iam_openid_connect_provider.github_actions.arn
}

output "github_actions_role_arn" {
  description = "IAM Role ARN to configure in GitHub Actions (AWS_ROLE_ARN)"
  value       = aws_iam_role.github_actions_role.arn
}
