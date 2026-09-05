variable "aws_region" {
  description = "AWS region for deploying infrastructure"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Target environment name (e.g. dev, stage, prod)"
  type        = string
  default     = "dev"
}

variable "cluster_name" {
  description = "Amazon EKS cluster identifier"
  type        = string
  default     = "forgeops-dev-eks"
}

variable "kubernetes_version" {
  description = "Kubernetes control plane and worker node version"
  type        = string
  default     = "1.28"
}

variable "vpc_cidr" {
  description = "IPv4 CIDR block for the dedicated VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets across availability zones"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets across availability zones"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "availability_zones" {
  description = "List of availability zones to distribute subnets across (leave empty to auto-detect first two AZs)"
  type        = list(string)
  default     = []
}

variable "node_instance_types" {
  description = "EC2 instance types for the EKS managed node group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_min_capacity" {
  description = "Minimum number of worker nodes in the managed node group"
  type        = number
  default     = 1
}

variable "node_desired_capacity" {
  description = "Desired number of worker nodes in the managed node group"
  type        = number
  default     = 2
}

variable "node_max_capacity" {
  description = "Maximum number of worker nodes in the managed node group"
  type        = number
  default     = 4
}

variable "ecr_repository_names" {
  description = "List of ECR repositories to provision for ForgeOps platform workloads"
  type        = list(string)
  default     = ["forgeops-frontend", "forgeops-backend", "forgeops"]
}

variable "create_rds" {
  description = "Whether to provision an RDS PostgreSQL database instance"
  type        = bool
  default     = true
}

variable "db_name" {
  description = "Initial PostgreSQL database name"
  type        = string
  default     = "backstage_plugin_catalog"
}

variable "db_username" {
  description = "Master username for PostgreSQL database"
  type        = string
  default     = "forgeops"
}

variable "db_password" {
  description = "Master password for PostgreSQL database (if empty, a secure random password will be generated)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS DB instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS database in gigabytes"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum storage limit for RDS database autoscaling in gigabytes"
  type        = number
  default     = 50
}

variable "techdocs_s3_bucket" {
  description = "Custom S3 bucket name for TechDocs storage (leave empty to auto-generate)"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Additional tags to merge into all resources"
  type        = map(string)
  default     = {}
}
