resource "aws_iam_role" "github_oidc_role" {
  name = "${var.environment}-idp-github-oidc-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRoleWithWebIdentity"
      Effect = "Allow"
      Principal = {
        Federated = var.oidc_provider_arn
      }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/*:*"
        }
      }
    }]
  })

  tags = var.tags
}

resource "aws_iam_policy" "oidc_deploy_policy" {
  name        = "${var.environment}-idp-oidc-deploy-policy"
  description = "Least-privilege deployment permissions for GitHub Actions pipelines"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "attach_oidc" {
  role       = aws_iam_role.github_oidc_role.name
  policy_arn = aws_iam_policy.oidc_deploy_policy.arn
}

variable "environment" { type = string }
variable "oidc_provider_arn" { type = string; default = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com" }
variable "github_org" { type = string; default = "company-org" }
variable "tags" { type = map(string); default = {} }

output "role_arn" { value = aws_iam_role.github_oidc_role.arn }
