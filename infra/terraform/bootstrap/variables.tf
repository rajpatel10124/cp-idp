variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "dev"
}

variable "github_owner" {
  description = "GitHub repository owner or organization"
  type        = string
  default     = "rajpatel10124"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "cp-idp"
}

variable "github_branch" {
  description = "Allowed branch for GitHub Actions deployments"
  type        = string
  default     = "main"
}

variable "state_bucket_name" {
  description = "Custom S3 bucket name for Terraform state. If empty, a unique name will be generated using account ID and region."
  type        = string
  default     = ""
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name for Terraform state locking"
  type        = string
  default     = "forgeops-terraform-locks"
}
