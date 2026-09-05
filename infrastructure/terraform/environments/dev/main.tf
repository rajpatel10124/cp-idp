# ==============================================================================
# Development Environment Infrastructure Stack
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  # Remote state backend configuration pattern (S3 + DynamoDB)
  # backend "s3" {
  #   bucket         = "idp-terraform-state-dev"
  #   key            = "dev/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "idp-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "IDP-Capstone"
      Environment = "dev"
      ManagedBy   = "Terraform"
      Owner       = "team-platform"
    }
  }
}

module "vpc" {
  source               = "../../modules/vpc"
  environment          = "dev"
  vpc_cidr             = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]
  availability_zones   = ["${var.aws_region}a", "${var.aws_region}b"]
}

module "eks" {
  source             = "../../modules/eks"
  cluster_name       = "idp-eks-dev"
  kubernetes_version = "1.28"
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_subnet_ids
  instance_types     = ["t3.medium"]
  desired_capacity   = 2
  min_capacity       = 1
  max_capacity       = 3
}

module "ecr_rest_api" {
  source          = "../../modules/ecr"
  repository_name = "idp-rest-api-dev"
}

module "ecr_worker" {
  source          = "../../modules/ecr"
  repository_name = "idp-worker-service-dev"
}

module "techdocs_s3" {
  source      = "../../modules/s3"
  bucket_name = "idp-techdocs-storage-dev-${var.aws_account_id}"
  environment = "dev"
}

module "iam_oidc" {
  source      = "../../modules/iam"
  environment = "dev"
  github_org  = var.github_org
}

variable "aws_region" { type = string; default = "us-east-1" }
variable "aws_account_id" { type = string; default = "123456789012" }
variable "github_org" { type = string; default = "company-org" }

output "vpc_id" { value = module.vpc.vpc_id }
output "eks_cluster_name" { value = module.eks.cluster_name }
output "eks_cluster_endpoint" { value = module.eks.cluster_endpoint }
output "ecr_rest_api_url" { value = module.ecr_rest_api.repository_url }
output "ecr_worker_url" { value = module.ecr_worker.repository_url }
output "techdocs_s3_bucket" { value = module.techdocs_s3.bucket_name }
output "github_oidc_role_arn" { value = module.iam_oidc.role_arn }
