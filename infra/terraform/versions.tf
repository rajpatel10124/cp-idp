terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.26"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Remote state backend configuration (S3 + DynamoDB Locking)
  # Uncomment or provide via backend.tf / -backend-config in GitHub Actions after bootstrap
  # backend "s3" {
  #   key     = "forgeops/dev/terraform.tfstate"
  #   encrypt = true
  # }
}
