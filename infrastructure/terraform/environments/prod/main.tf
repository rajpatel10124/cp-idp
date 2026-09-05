# ==============================================================================
# Production Environment Infrastructure Stack
# Multi-AZ HA EKS Cluster, Dedicated RDS PostgreSQL, & Dual NAT Gateways
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "IDP-Capstone"
      Environment = "prod"
      ManagedBy   = "Terraform"
      Owner       = "team-platform"
    }
  }
}

module "vpc" {
  source               = "../../modules/vpc"
  environment          = "prod"
  vpc_cidr             = "10.1.0.0/16"
  public_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24"]
  private_subnet_cidrs = ["10.1.10.0/24", "10.1.11.0/24"]
  availability_zones   = ["${var.aws_region}a", "${var.aws_region}b"]
}

module "eks" {
  source             = "../../modules/eks"
  cluster_name       = "idp-eks-prod"
  kubernetes_version = "1.28"
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_subnet_ids
  instance_types     = ["t3.large"]
  desired_capacity   = 4
  min_capacity       = 2
  max_capacity       = 8
}

module "ecr_rest_api" {
  source          = "../../modules/ecr"
  repository_name = "idp-rest-api-prod"
}

module "ecr_worker" {
  source          = "../../modules/ecr"
  repository_name = "idp-worker-service-prod"
}

module "techdocs_s3" {
  source      = "../../modules/s3"
  bucket_name = "idp-techdocs-storage-prod-${var.aws_account_id}"
  environment = "prod"
}

module "iam_oidc" {
  source      = "../../modules/iam"
  environment = "prod"
  github_org  = var.github_org
}

module "rds_postgres" {
  source             = "../../modules/rds"
  environment        = "prod"
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  db_instance_class  = "db.t3.small"
  db_admin_user      = "idp_admin"
  db_admin_password  = var.db_admin_password
}

variable "aws_region" { type = string; default = "us-east-1" }
variable "aws_account_id" { type = string; default = "123456789012" }
variable "github_org" { type = string; default = "company-org" }
variable "db_admin_password" { type = string; sensitive = true; default = "ProductionSecurePass123!" }

output "vpc_id" { value = module.vpc.vpc_id }
output "eks_cluster_name" { value = module.eks.cluster_name }
output "eks_cluster_endpoint" { value = module.eks.cluster_endpoint }
output "ecr_rest_api_url" { value = module.ecr_rest_api.repository_url }
output "ecr_worker_url" { value = module.ecr_worker.repository_url }
output "techdocs_s3_bucket" { value = module.techdocs_s3.bucket_name }
output "github_oidc_role_arn" { value = module.iam_oidc.role_arn }
output "rds_db_endpoint" { value = module.rds_postgres.db_endpoint }
