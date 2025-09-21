#!/bin/bash

# Azure Storage Account Setup Script for Focpay2 Demo Application
# This script creates an Azure Storage Account for Table Storage

set -e

# Configuration
RESOURCE_GROUP_NAME="focpay2-rg"
STORAGE_ACCOUNT_NAME="focpay2storage$(date +%s)"
LOCATION="West Europe"
SKU="Standard_LRS"

echo "=== Azure Storage Account Setup for Focpay2 ==="
echo "Resource Group: $RESOURCE_GROUP_NAME"
echo "Storage Account: $STORAGE_ACCOUNT_NAME"
echo "Location: $LOCATION"
echo "SKU: $SKU"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first:"
    echo "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if user is logged in
if ! az account show &> /dev/null; then
    echo "❌ You are not logged in to Azure CLI."
    echo "Please run: az login"
    exit 1
fi

echo "✅ Azure CLI is installed and you are logged in."
echo ""

# Create Resource Group
echo "📦 Creating resource group '$RESOURCE_GROUP_NAME'..."
az group create \
    --name "$RESOURCE_GROUP_NAME" \
    --location "$LOCATION" \
    --output table

echo ""

# Create Storage Account
echo "🏗️  Creating storage account '$STORAGE_ACCOUNT_NAME'..."
az storage account create \
    --name "$STORAGE_ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP_NAME" \
    --location "$LOCATION" \
    --sku "$SKU" \
    --kind "StorageV2" \
    --access-tier "Hot" \
    --output table

echo ""

# Get connection string
echo "🔗 Retrieving connection string..."
CONNECTION_STRING=$(az storage account show-connection-string \
    --name "$STORAGE_ACCOUNT_NAME" \
    --resource-group "$RESOURCE_GROUP_NAME" \
    --query "connectionString" \
    --output tsv)

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "📋 Configuration Details:"
echo "Resource Group: $RESOURCE_GROUP_NAME"
echo "Storage Account: $STORAGE_ACCOUNT_NAME"
echo "Location: $LOCATION"
echo ""
echo "🔐 Connection String:"
echo "$CONNECTION_STRING"
echo ""
echo "📝 Next Steps:"
echo "1. Copy the connection string above"
echo "2. Set it as an environment variable:"
echo "   export AZURE_STORAGE_CONNECTION_STRING=\"$CONNECTION_STRING\""
echo ""
echo "3. Or add it to your .env file:"
echo "   AZURE_STORAGE_CONNECTION_STRING=\"$CONNECTION_STRING\""
echo ""
echo "4. Install dependencies in your server folder:"
echo "   cd server && npm install"
echo ""
echo "5. Start your application with the connection string set"
echo ""
echo "🗑️  To delete these resources later, run:"
echo "   az group delete --name $RESOURCE_GROUP_NAME --yes --no-wait"
echo ""