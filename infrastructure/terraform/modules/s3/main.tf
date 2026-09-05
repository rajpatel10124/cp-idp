resource "aws_s3_bucket" "bucket" {
  bucket        = var.bucket_name
  force_destroy = var.environment == "dev" ? true : false

  tags = var.tags
}

resource "aws_s3_bucket_public_access_block" "block_public" {
  bucket                  = aws_s3_bucket.bucket.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "sse" {
  bucket = aws_s3_bucket.bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

variable "bucket_name" { type = string }
variable "environment" { type = string }
variable "tags" { type = map(string); default = {} }

output "bucket_name" { value = aws_s3_bucket.bucket.id }
output "bucket_arn" { value = aws_s3_bucket.bucket.arn }
