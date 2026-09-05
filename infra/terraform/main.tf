data "aws_caller_identity" "current" {}

locals {
  techdocs_bucket_name = var.techdocs_s3_bucket != "" ? var.techdocs_s3_bucket : "forgeops-techdocs-${data.aws_caller_identity.current.account_id}-${var.environment}-${var.aws_region}"
}

# S3 Bucket for Backstage TechDocs Documentation Storage
resource "aws_s3_bucket" "techdocs" {
  bucket        = local.techdocs_bucket_name
  force_destroy = var.environment != "prod"

  tags = merge(var.tags, {
    Name        = local.techdocs_bucket_name
    Component   = "TechDocs"
    Environment = var.environment
  })
}

resource "aws_s3_bucket_versioning" "techdocs" {
  bucket = aws_s3_bucket.techdocs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "techdocs" {
  bucket = aws_s3_bucket.techdocs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "techdocs" {
  bucket = aws_s3_bucket.techdocs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Kubernetes Namespace for ForgeOps IDP Platform
resource "kubernetes_namespace" "forgeops" {
  metadata {
    name = "forgeops"
    labels = {
      name                        = "forgeops"
      "app.kubernetes.io/part-of" = "forgeops-platform"
    }
  }

  depends_on = [aws_eks_node_group.main]
}

# Kubernetes Namespace for Monitoring & Observability
resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = "monitoring"
    labels = {
      name                        = "monitoring"
      "app.kubernetes.io/part-of" = "forgeops-observability"
    }
  }

  depends_on = [aws_eks_node_group.main]
}
