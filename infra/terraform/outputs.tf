output "aws_region" {
  description = "AWS region of deployment"
  value       = var.aws_region
}

output "vpc_id" {
  description = "ID of the ForgeOps dedicated VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs for ALB Ingress"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs for EKS worker nodes and RDS"
  value       = aws_subnet.private[*].id
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster control plane API endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "eks_cluster_certificate_authority_data" {
  description = "Base64 encoded certificate authority data for EKS cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

output "eks_oidc_provider_arn" {
  description = "IAM OIDC Provider ARN for EKS IRSA"
  value       = aws_iam_openid_connect_provider.eks.arn
}

output "aws_load_balancer_controller_role_arn" {
  description = "IAM Role ARN for AWS Load Balancer Controller ServiceAccount"
  value       = aws_iam_role.aws_load_balancer_controller.arn
}

output "ecr_repository_urls" {
  description = "Map of ECR repository names to their repository URLs"
  value       = { for k, v in aws_ecr_repository.repos : k => v.repository_url }
}

output "rds_endpoint" {
  description = "PostgreSQL RDS connection endpoint"
  value       = var.create_rds ? aws_db_instance.postgres[0].address : ""
}

output "rds_port" {
  description = "PostgreSQL RDS connection port"
  value       = var.create_rds ? aws_db_instance.postgres[0].port : 5432
}

output "rds_database_name" {
  description = "PostgreSQL database name"
  value       = var.create_rds ? aws_db_instance.postgres[0].db_name : ""
}

output "techdocs_s3_bucket" {
  description = "S3 bucket for TechDocs documentation"
  value       = aws_s3_bucket.techdocs.id
}
