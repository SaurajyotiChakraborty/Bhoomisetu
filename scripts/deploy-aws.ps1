<#
.SYNOPSIS
    Bhoomisetu - One-Command AWS Deployment Script (PowerShell)
    Builds the production container and uploads directly to Amazon ECR.

.EXAMPLE
    .\scripts\deploy-aws.ps1 -Region ap-south-1
#>

param (
    [string]$Region = $(if ($env:AWS_REGION) { $env:AWS_REGION } else { "ap-south-1" }),
    [string]$RepoName = "bhoomisetu-app",
    [string]$Tag = "latest",
    [string]$AccountId = ""
)

$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Bhoomisetu - AWS Container Deployment Pipeline        " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Resolve AWS Account ID if not provided
if (-not $AccountId) {
    Write-Host "==> Resolving AWS Account ID..." -ForegroundColor Yellow
    try {
        $AccountId = (aws sts get-caller-identity --query Account --output text).Trim()
    } catch {
        Write-Error "Could not retrieve AWS Account ID. Make sure AWS CLI is installed and configured ('aws configure')."
        exit 1
    }
}

$EcrUri = "$AccountId.dkr.ecr.$Region.amazonaws.com/$RepoName"

Write-Host "AWS Account:     $AccountId"
Write-Host "AWS Region:      $Region"
Write-Host "ECR Repository:  $RepoName"
Write-Host "Target Image:    $EcrUri`:$Tag"
Write-Host ""

# 2. Check / Create ECR Repository
Write-Host "==> [1/4] Ensuring ECR repository exists..." -ForegroundColor Yellow
$repoCheck = aws ecr describe-repositories --repository-names $RepoName --region $Region 2>$null
if (-not $repoCheck) {
    Write-Host "Creating new ECR repository '$RepoName' in $Region..." -ForegroundColor Gray
    aws ecr create-repository --repository-name $RepoName --region $Region | Out-Null
}

# 3. Authenticate Docker with Amazon ECR
Write-Host "==> [2/4] Logging into Amazon ECR..." -ForegroundColor Yellow
$loginPwd = aws ecr get-login-password --region $Region
$loginPwd | docker login --username AWS --password-stdin "$AccountId.dkr.ecr.$Region.amazonaws.com"

# 4. Build Docker Container Image
Write-Host "==> [3/4] Building production container image..." -ForegroundColor Yellow
docker build -t "$RepoName`:$Tag" -t "$EcrUri`:$Tag" .

# 5. Push Image to Amazon ECR
Write-Host "==> [4/4] Pushing image to Amazon ECR..." -ForegroundColor Yellow
docker push "$EcrUri`:$Tag"

Write-Host "========================================================" -ForegroundColor Green
Write-Host "  Image successfully pushed to AWS ECR!                 " -ForegroundColor Green
Write-Host "  URI: $EcrUri`:$Tag" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
