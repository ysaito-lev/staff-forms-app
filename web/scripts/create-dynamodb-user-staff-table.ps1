# Create DynamoDB table for user <-> staff link (pk String only).
# Usage: .\create-dynamodb-user-staff-table.ps1
#        .\create-dynamodb-user-staff-table.ps1 -TableName "my-table" -Region "ap-northeast-1"

param(
    [string] $TableName = "form-site-user-staff-link",
    [string] $Region = "ap-northeast-1"
)

$ErrorActionPreference = "Stop"

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
    Write-Host "  DYNAMODB_USER_STAFF_TABLE=$TableName"
    Write-Host "  DYNAMODB_REGION=$Region"
    exit 0
}

Write-Host "Creating table: $TableName ($Region)"
aws dynamodb create-table `
    --table-name $TableName `
    --billing-mode PAY_PER_REQUEST `
    --attribute-definitions AttributeName=pk,AttributeType=S `
    --key-schema AttributeName=pk,KeyType=HASH `
    --region $Region

if ($LASTEXITCODE -ne 0) {
    Write-Error "create-table failed."
    exit 1
}

aws dynamodb wait table-exists --table-name $TableName --region $Region

Write-Host "Done."
Write-Host "web/.env:"
Write-Host "  DYNAMODB_USER_STAFF_TABLE=$TableName"
Write-Host "  DYNAMODB_REGION=$Region"
