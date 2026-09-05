# ==============================================================================
# Development Environment Infrastructure Parameters
# ==============================================================================

aws_region           = "us-east-1"
environment          = "dev"
cluster_name         = "forgeops-dev-eks"
kubernetes_version   = "1.28"

vpc_cidr             = "10.0.0.0/16"
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]

node_instance_types   = ["t3.medium"]
node_min_capacity     = 1
node_desired_capacity = 2
node_max_capacity     = 4

ecr_repository_names = ["forgeops-frontend", "forgeops-backend", "forgeops"]

create_rds           = true
db_name              = "backstage_plugin_catalog"
db_username          = "forgeops"
db_instance_class    = "db.t4g.micro"
db_allocated_storage = 20

tags = {
  Project     = "ForgeOps-IDP"
  Environment = "dev"
  ManagedBy   = "Terraform"
  Owner       = "Platform-Engineering"
}
