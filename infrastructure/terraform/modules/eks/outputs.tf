output "cluster_name" {
  value       = aws_eks_cluster.main.name
  description = "Name of the EKS cluster"
}

output "cluster_endpoint" {
  value       = aws_eks_cluster.main.endpoint
  description = "Kubernetes API Server endpoint URL"
}

output "cluster_certificate_authority_data" {
  value       = aws_eks_cluster.main.certificate_authority[0].data
  description = "Base64 encoded certificate data"
}

output "node_group_arn" {
  value       = aws_eks_node_group.main.arn
  description = "ARN of the EKS Node Group"
}
