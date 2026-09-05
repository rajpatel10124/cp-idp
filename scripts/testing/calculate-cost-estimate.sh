#!/usr/bin/env bash
# ==============================================================================
# IDP Platform Infrastructure Cost Estimator
# Calculates realistic monthly cost estimates for deployed platform resources
# ==============================================================================

set -euo pipefail

echo "===================================================="
echo "    IDP PLATFORM MONTHLY COST ESTIMATION MODEL      "
echo "===================================================="
echo ""

# Cost Rates (AWS US-East-1 Standard On-Demand Pricing)
NODE_HOURLY=0.0416      # t3.medium EC2 instance
NAT_GW_HOURLY=0.0450    # NAT Gateway per hour
EKS_CONTROL_PLANE=0.10  # EKS Cluster per hour
RDS_HOURLY=0.017        # db.t3.micro PostgreSQL

HOURS_PER_MONTH=730

# Resource Quantities
EKS_NODES=${EKS_NODES_COUNT:-2}
NAT_GATEWAYS=1
EKS_CLUSTERS=1
RDS_INSTANCES=1
ECR_GB=${ECR_STORAGE_GB:-15}
S3_GB=${S3_STORAGE_GB:-10}

# Calculations
NODE_MONTHLY=$(awk "BEGIN {print $EKS_NODES * $NODE_HOURLY * $HOURS_PER_MONTH}")
NAT_MONTHLY=$(awk "BEGIN {print $NAT_GATEWAYS * $NAT_GW_HOURLY * $HOURS_PER_MONTH}")
EKS_MONTHLY=$(awk "BEGIN {print $EKS_CLUSTERS * $EKS_CONTROL_PLANE * $HOURS_PER_MONTH}")
RDS_MONTHLY=$(awk "BEGIN {print $RDS_INSTANCES * $RDS_HOURLY * $HOURS_PER_MONTH}")
ECR_MONTHLY=$(awk "BEGIN {print $ECR_GB * 0.10}")
S3_MONTHLY=$(awk "BEGIN {print $S3_GB * 0.023}")

TOTAL_MONTHLY=$(awk "BEGIN {print $NODE_MONTHLY + $NAT_MONTHLY + $EKS_MONTHLY + $RDS_MONTHLY + $ECR_MONTHLY + $S3_MONTHLY}")

printf "%-35s %-15s %-15s\n" "Resource Item" "Quantity" "Est. Monthly Cost ($)"
printf "%-35s %-15s %-15s\n" "-----------------------------------" "------------" "-------------------"
printf "%-35s %-15s $%-14.2f\n" "AWS EKS Control Plane" "${EKS_CLUSTERS} Cluster" "${EKS_MONTHLY}"
printf "%-35s %-15s $%-14.2f\n" "Worker Nodes (t3.medium)" "${EKS_NODES} Nodes" "${NODE_MONTHLY}"
printf "%-35s %-15s $%-14.2f\n" "VPC NAT Gateway" "${NAT_GATEWAYS} Gateway" "${NAT_MONTHLY}"
printf "%-35s %-15s $%-14.2f\n" "RDS PostgreSQL (db.t3.micro)" "${RDS_INSTANCES} Instance" "${RDS_MONTHLY}"
printf "%-35s %-15s $%-14.2f\n" "ECR Image Registries" "${ECR_GB} GB" "${ECR_MONTHLY}"
printf "%-35s %-15s $%-14.2f\n" "S3 TechDocs & State Buckets" "${S3_GB} GB" "${S3_MONTHLY}"
printf "%-35s %-15s %-15s\n" "-----------------------------------" "------------" "-------------------"
printf "%-35s %-15s $%-14.2f\n" "ESTIMATED TOTAL RUNNING COST" "" "${TOTAL_MONTHLY}"
echo ""
echo "Note: Pricing based on AWS US-East-1 standard rates. Dev environment uses single NAT Gateway to reduce cost."
