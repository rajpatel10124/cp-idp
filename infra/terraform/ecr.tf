# Amazon Elastic Container Registry (ECR) Repositories
# Provisioned for ForgeOps container images with tag immutability and automatic vulnerability scanning
resource "aws_ecr_repository" "repos" {
  for_each             = toset(var.ecr_repository_names)
  name                 = each.value
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(var.tags, {
    Name        = each.value
    ManagedBy   = "Terraform"
    Environment = var.environment
  })
}

# ECR Lifecycle Policy to Prevent Unbounded Image Growth
resource "aws_ecr_lifecycle_policy" "repos" {
  for_each   = aws_ecr_repository.repos
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images older than 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Retain maximum 30 tagged deployment images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "sha-", "prod-", "dev-", "release-", "main-"]
          countType     = "imageCountMoreThan"
          countNumber   = 30
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
