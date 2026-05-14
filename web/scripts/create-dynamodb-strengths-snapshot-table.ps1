# Create DynamoDB table for strengths-report AI snapshot cache (composite key staffId + sk).
# Usage: .\create-dynamodb-strengths-snapshot-table.ps1
#        .\create-dynamodb-strengths-snapshot-table.ps1 -TableName "my-table" -Region "ap-northeast-1"
#
# IAM（Lambda / Amplify SSR ロール等）には最低限 GetItem, PutItem をこのテーブル ARN に付与。
# アプリは sk = STRENGTHS#ALL（全期間スナップショット 1 件／職員あたり）を読み書きします。

param(
    [string] $TableName = "form-site-strengths-snapshot",
    [string] $Region = "ap-northeast-1"
)

# stderr を PowerShell がエラー化しないようにする（AWS CLI は失敗時も stderr に書く）
$ErrorActionPreference = "Continue"

aws dynamodb describe-table --table-name $TableName --region $Region 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Existing table found: $TableName ($Region)"
    aws dynamodb describe-table `
        --table-name $TableName `
        --region $Region `
        --query "Table.{Name:TableName,KeySchema:KeySchema,Billing:BillingModeSummary.BillingMode,Status:TableStatus}" `
        --output table
    Write-Host ""
    Write-Host "web/.env (example):"
    Write-Host "  DYNAMODB_STRENGTHS_SNAPSHOT_TABLE=$TableName"
    Write-Host "  DYNAMODB_REGION=$Region"
    exit 0
}

Write-Host "Creating table: $TableName ($Region)"
aws dynamodb create-table `
    --table-name $TableName `
    --billing-mode PAY_PER_REQUEST `
    --attribute-definitions `
        AttributeName=staffId,AttributeType=S `
        AttributeName=sk,AttributeType=S `
    --key-schema `
        AttributeName=staffId,KeyType=HASH `
        AttributeName=sk,KeyType=RANGE `
    --region $Region

if ($LASTEXITCODE -ne 0) {
    Write-Error "create-table failed."
    exit 1
}

aws dynamodb wait table-exists --table-name $TableName --region $Region

Write-Host "Done."
Write-Host "web/.env:"
Write-Host "  DYNAMODB_STRENGTHS_SNAPSHOT_TABLE=$TableName"
Write-Host "  DYNAMODB_REGION=$Region"
