#!/usr/bin/env bash
# ==============================================================================
# AWS Cloud Infrastructure Cleanup Script
# Safeguarded teardown procedure for EKS, VPC, ECR, and RDS resources
# ==============================================================================

set -euo pipefail

echo "===================================================="
echo "    WARNING: AWS CLOUD INFRASTRUCTURE TEARDOWN      "
echo "===================================================="
echo "This operation will destroy cloud resources including:"
echo "  - Amazon EKS Cluster & Worker Node EC2 instances"
echo "  - Amazon RDS PostgreSQL database"
echo "  - Amazon VPC, NAT Gateways & Elastic IPs"
echo "  - Amazon ECR Repositories & S3 Storage Buckets"
echo ""

read -p "Are you absolutely sure you want to DESTROY all cloud infrastructure? (type 'destroy-idp-cloud'): " CONFIRMATION

if [ "$CONFIRMATION" != "destroy-idp-cloud" ]; then
  echo "Cleanup cancelled. No resources were destroyed."
  exit 0
fi

echo "Initiating Terraform destroy..."
cd infrastructure/terraform/environments/dev

if command -v terraform >/dev/null 2>&1; then
  terraform destroy -auto-approve
  echo "Cloud infrastructure destroyed successfully."
else
  echo "Terraform CLI not found. Please execute 'terraform destroy' manually inside infrastructure/terraform/environments/dev/."
fi
