variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster"
}

variable "kubernetes_version" {
  type        = string
  default     = "1.28"
  description = "Kubernetes control plane version"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "Public subnet IDs for load balancers"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs for worker nodes"
}

variable "instance_types" {
  type        = list(string)
  default     = ["t3.medium"]
  description = "EC2 instance types for EKS worker nodes"
}

variable "desired_capacity" {
  type        = number
  default     = 2
  description = "Desired number of worker nodes"
}

variable "min_capacity" {
  type        = number
  default     = 1
  description = "Minimum number of worker nodes"
}

variable "max_capacity" {
  type        = number
  default     = 4
  description = "Maximum number of worker nodes"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags"
}
