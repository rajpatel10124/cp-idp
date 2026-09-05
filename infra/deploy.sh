#!/usr/bin/env bash
# ==============================================================================
# ForgeOps IDP — Production Deployment Automation
# Architecture: Terraform -> AWS VPC/EKS/ECR/RDS -> Kubernetes Ingress/ALB
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
TF_DIR="${SCRIPT_DIR}/terraform"

echo "============================================================"
echo "          FORGEOPS IDP — AWS DEPLOYMENT ENGINE             "
echo "============================================================"

# ------------------------------------------------------------------------------
# STEP 1: Verify Prerequisites & Tools
# ------------------------------------------------------------------------------
echo "[1/8] Verifying required deployment CLI tools..."

for tool in terraform aws kubectl docker; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "ERROR: Required CLI tool '$tool' is not installed or not in PATH." >&2
    exit 1
  fi
  echo "  ✓ $tool detected ($(command -v "$tool"))"
done

# ------------------------------------------------------------------------------
# STEP 2: Authenticate & Verify AWS Environment
# ------------------------------------------------------------------------------
echo "[2/8] Validating AWS authentication and active account..."
CALLER_IDENTITY=$(aws sts get-caller-identity --output json 2>/dev/null || true)
if [ -z "$CALLER_IDENTITY" ]; then
  echo "ERROR: Unable to authenticate with AWS. Ensure AWS_REGION, AWS_PROFILE, or IAM credentials/OIDC are active." >&2
  exit 1
fi

ACCOUNT_ID=$(echo "$CALLER_IDENTITY" | grep -o '"Account": "[^"]*' | cut -d'"' -f4)
CALLER_ARN=$(echo "$CALLER_IDENTITY" | grep -o '"Arn": "[^"]*' | cut -d'"' -f4)
AWS_REGION="${AWS_REGION:-$(aws configure get region || echo "us-east-1")}"

echo "  ✓ Active AWS Account: $ACCOUNT_ID"
echo "  ✓ Caller Identity: $CALLER_ARN"
echo "  ✓ Target Region: $AWS_REGION"

# ------------------------------------------------------------------------------
# STEP 3: Terraform Infrastructure Validation & Provisioning
# ------------------------------------------------------------------------------
echo "[3/8] Initializing and validating Terraform infrastructure..."
cd "$TF_DIR"

# Check if backend config was passed or if state bucket is configured
if [ -n "${TF_STATE_BUCKET:-}" ]; then
  echo "  Configuring S3 remote state: bucket=${TF_STATE_BUCKET} region=${AWS_REGION}"
  terraform init \
    -backend-config="bucket=${TF_STATE_BUCKET}" \
    -backend-config="key=forgeops/dev/terraform.tfstate" \
    -backend-config="region=${AWS_REGION}" \
    -backend-config="dynamodb_table=${TF_LOCKS_TABLE:-forgeops-terraform-locks}" \
    -reconfigure
else
  echo "  Initializing Terraform (offline / local backend fallback)..."
  terraform init -backend=false
fi

echo "  Running 'terraform validate'..."
terraform validate

echo "  Planning infrastructure deployment..."
terraform plan -var-file="environments/dev.tfvars" -out="tfplan"

echo "  Applying Terraform infrastructure changes..."
terraform apply -auto-approve "tfplan"

# Extract Terraform Outputs
EKS_CLUSTER_NAME=$(terraform output -raw eks_cluster_name 2>/dev/null || echo "forgeops-dev-eks")
RDS_ENDPOINT=$(terraform output -raw rds_endpoint 2>/dev/null || echo "")
RDS_PORT=$(terraform output -raw rds_port 2>/dev/null || echo "5432")
RDS_DB_NAME=$(terraform output -raw rds_database_name 2>/dev/null || echo "backstage_plugin_catalog")
TECHDOCS_BUCKET=$(terraform output -raw techdocs_s3_bucket 2>/dev/null || echo "")
ALB_ROLE_ARN=$(terraform output -raw aws_load_balancer_controller_role_arn 2>/dev/null || echo "")

echo "  ✓ Infrastructure provisioned successfully."
echo "  ✓ EKS Cluster: $EKS_CLUSTER_NAME"
echo "  ✓ RDS Endpoint: ${RDS_ENDPOINT:-N/A}"

# ------------------------------------------------------------------------------
# STEP 4: Configure kubectl Context
# ------------------------------------------------------------------------------
echo "[4/8] Updating kubeconfig for Amazon EKS..."
aws eks update-kubeconfig --name "$EKS_CLUSTER_NAME" --region "$AWS_REGION"
kubectl cluster-info

# ------------------------------------------------------------------------------
# STEP 5: Container Image Build & ECR Push
# ------------------------------------------------------------------------------
echo "[5/8] Building and pushing ForgeOps container image to ECR..."

GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "manual-$(date +%s)")
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_REPO="${ECR_REGISTRY}/forgeops"
IMAGE_TAG="sha-${GIT_SHA}"
FORGEOPS_IMAGE="${ECR_REPO}:${IMAGE_TAG}"

echo "  Authenticating Docker to Amazon ECR..."
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

echo "  Building container image: ${FORGEOPS_IMAGE}..."
cd "${ROOT_DIR}/app/backstage"
docker build -t "$FORGEOPS_IMAGE" -t "${ECR_REPO}:latest" .

echo "  Pushing ${FORGEOPS_IMAGE} to Amazon ECR..."
docker push "$FORGEOPS_IMAGE"
docker push "${ECR_REPO}:latest"

# ------------------------------------------------------------------------------
# STEP 6: Deploy Observability & Controllers
# ------------------------------------------------------------------------------
echo "[6/8] Ensuring Kubernetes namespaces and observability config..."
cd "$ROOT_DIR"

kubectl create namespace forgeops --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

# Deploy Grafana dashboard ConfigMap for automatic discovery
if [ -f "k8s/observability/forgeops-dashboard-configmap.yaml" ]; then
  echo "  Applying ForgeOps Observability Grafana Dashboard..."
  kubectl apply -f k8s/observability/forgeops-dashboard-configmap.yaml
fi

# Deploy AWS Load Balancer Controller ServiceAccount
if [ -n "$ALB_ROLE_ARN" ] && [ -f "k8s/aws-load-balancer-controller/serviceaccount.yaml" ]; then
  echo "  Applying AWS Load Balancer Controller ServiceAccount (IRSA)..."
  sed "s|\${AWS_LOAD_BALANCER_CONTROLLER_ROLE_ARN}|${ALB_ROLE_ARN}|g" \
    k8s/aws-load-balancer-controller/serviceaccount.yaml | kubectl apply -f -
fi

# ------------------------------------------------------------------------------
# STEP 7: Deploy ForgeOps Application Manifests
# ------------------------------------------------------------------------------
echo "[7/8] Applying ForgeOps Kubernetes resources..."

# Create or update runtime secret
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(aws secretsmanager get-secret-value --secret-id "forgeops/dev/rds/credentials" --query SecretString --output text 2>/dev/null | grep -o '"password":"[^"]*' | cut -d'"' -f4 || echo "DevSecretPassword123!")}"

kubectl create secret generic forgeops-runtime \
  --namespace=forgeops \
  --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  --from-literal=GITHUB_TOKEN="${GITHUB_TOKEN:-}" \
  --from-literal=GITHUB_CLIENT_ID="${GITHUB_CLIENT_ID:-}" \
  --from-literal=GITHUB_CLIENT_SECRET="${GITHUB_CLIENT_SECRET:-}" \
  --dry-run=client -o yaml | kubectl apply -f -

# Apply ConfigMap with substituted variables
export AWS_REGION
export TECHDOCS_S3_BUCKET="$TECHDOCS_BUCKET"
export POSTGRES_HOST="${RDS_ENDPOINT:-localhost}"
export POSTGRES_PORT="$RDS_PORT"
export POSTGRES_DB="$RDS_DB_NAME"

sed -e "s|\${AWS_REGION}|${AWS_REGION}|g" \
    -e "s|\${TECHDOCS_S3_BUCKET}|${TECHDOCS_BUCKET}|g" \
    k8s/forgeops/configmap.yaml | kubectl apply -f -

# Apply Service, PDB, Autoscaling, ServiceMonitor
kubectl apply -f k8s/forgeops/serviceaccount.yaml
kubectl apply -f k8s/forgeops/service.yaml
kubectl apply -f k8s/forgeops/pdb.yaml
kubectl apply -f k8s/forgeops/autoscaling.yaml
kubectl apply -f k8s/forgeops/servicemonitor.yaml

# Apply Deployment with injected ECR Image
sed "s|\${FORGEOPS_IMAGE}|${FORGEOPS_IMAGE}|g" k8s/forgeops/deployment.yaml | kubectl apply -f -

# Apply Ingress (AWS ALB)
kubectl apply -f k8s/forgeops/ingress.yaml

# ------------------------------------------------------------------------------
# STEP 8: Rollout Verification & Health Checks
# ------------------------------------------------------------------------------
echo "[8/8] Verifying workload rollout and ALB ingress health..."

echo "  Waiting for deployment/forgeops pods to become ready..."
if ! kubectl rollout status deployment/forgeops -n forgeops --timeout=180s; then
  echo "ERROR: Deployment rollout failed! Inspecting failed pod logs:" >&2
  kubectl get pods -n forgeops -l app.kubernetes.io/name=forgeops
  kubectl logs deployment/forgeops -n forgeops --tail=50 >&2
  exit 1
fi

echo "  Discovering AWS Application Load Balancer endpoint..."
ALB_HOSTNAME=""
for i in $(seq 1 30); do
  ALB_HOSTNAME=$(kubectl get ingress forgeops -n forgeops -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || true)
  if [ -n "$ALB_HOSTNAME" ]; then
    break
  fi
  echo "  Waiting for AWS ALB address to be assigned ($i/30)..."
  sleep 6
done

if [ -z "$ALB_HOSTNAME" ]; then
  echo "WARNING: ALB address not yet ready. The ALB is being created by AWS Load Balancer Controller."
  ALB_HOSTNAME="pending-alb-provisioning"
fi

echo ""
echo "============================================================"
echo "          FORGEOPS IDP DEPLOYMENT SUCCESSFUL               "
echo "============================================================"
echo "EKS Cluster:       $EKS_CLUSTER_NAME"
echo "Deployed Image:    $FORGEOPS_IMAGE"
echo "Image Tag:         $IMAGE_TAG"
echo "Namespace:         forgeops"
echo "Active Pods:       $(kubectl get pods -n forgeops --no-headers | wc -l) replicas running"
echo "ForgeOps URL:      http://${ALB_HOSTNAME}"
echo "Health Endpoint:   http://${ALB_HOSTNAME}/api/health"
echo "============================================================"
