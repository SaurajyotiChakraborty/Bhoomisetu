#!/usr/bin/env bash
# ==============================================================================
# Bhoomisetu - One-Command AWS Deployment Script
# Deploys containerized Bhoomisetu to Amazon ECR & ECS / App Runner / EC2
# ==============================================================================
set -euo pipefail

# Configuration (override via environment variables or CLI flags)
AWS_REGION="${AWS_REGION:-ap-south-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")}"
ECR_REPO_NAME="${ECR_REPO_NAME:-bhoomisetu-app}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "========================================================"
echo "  Bhoomisetu - AWS Container Deployment Pipeline        "
echo "========================================================"
echo "Region:          $AWS_REGION"
echo "ECR Repository:  $ECR_REPO_NAME"
echo "Image Tag:       $IMAGE_TAG"

if [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "Error: AWS_ACCOUNT_ID not found. Run 'aws configure' or set AWS_ACCOUNT_ID."
  exit 1
fi

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}"

# 1. Ensure ECR repository exists
echo "==> [1/4] Checking Amazon ECR repository..."
aws ecr describe-repositories --repository-names "$ECR_REPO_NAME" --region "$AWS_REGION" >/dev/null 2>&1 || \
  aws ecr create-repository --repository-name "$ECR_REPO_NAME" --region "$AWS_REGION" >/dev/null

# 2. Authenticate Docker with Amazon ECR
echo "==> [2/4] Authenticating Docker with Amazon ECR..."
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# 3. Build Docker container image (clean build, .dockerignore strictly excludes .md and docs)
echo "==> [3/4] Building production container image..."
docker build -t "${ECR_REPO_NAME}:${IMAGE_TAG}" -t "${ECR_URI}:${IMAGE_TAG}" .

# 4. Push image to Amazon ECR
echo "==> [4/4] Pushing image to Amazon ECR (${ECR_URI}:${IMAGE_TAG})..."
docker push "${ECR_URI}:${IMAGE_TAG}"

echo "========================================================"
echo "  Deployment image successfully pushed to AWS ECR!      "
echo "  Image URI: ${ECR_URI}:${IMAGE_TAG}                   "
echo "========================================================"
