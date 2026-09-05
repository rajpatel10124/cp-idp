provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ForgeOps-IDP"
      Environment = var.environment
      ManagedBy   = "Terraform-Bootstrap"
      Owner       = "Platform-Engineering"
    }
  }
}
