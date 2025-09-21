@echo off
setlocal EnableDelayedExpansion

REM Azure Storage Account Setup Script for Focpay2 Demo Application
REM This script creates an Azure Storage Account for Table Storage

REM Configuration
set RESOURCE_GROUP_NAME=focpay2-rg
for /f %%i in ('powershell -command "Get-Date -UFormat %%s"') do set TIMESTAMP=%%i
set STORAGE_ACCOUNT_NAME=focpay2storage%TIMESTAMP%
set LOCATION=West Europe
set SKU=Standard_LRS

echo === Azure Storage Account Setup for Focpay2 ===
echo Resource Group: %RESOURCE_GROUP_NAME%
echo Storage Account: %STORAGE_ACCOUNT_NAME%
echo Location: %LOCATION%
echo SKU: %SKU%
echo.

REM Check if Azure CLI is installed
az --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Azure CLI is not installed. Please install it first:
    echo    https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
    exit /b 1
)

REM Check if user is logged in
az account show >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ You are not logged in to Azure CLI.
    echo Please run: az login
    exit /b 1
)

echo ✅ Azure CLI is installed and you are logged in.
echo.

REM Create Resource Group
echo 📦 Creating resource group '%RESOURCE_GROUP_NAME%'...
az group create --name "%RESOURCE_GROUP_NAME%" --location "%LOCATION%" --output table
if %errorlevel% neq 0 (
    echo ❌ Failed to create resource group
    exit /b 1
)

echo.

REM Create Storage Account
echo 🏗️  Creating storage account '%STORAGE_ACCOUNT_NAME%'...
az storage account create --name "%STORAGE_ACCOUNT_NAME%" --resource-group "%RESOURCE_GROUP_NAME%" --location "%LOCATION%" --sku "%SKU%" --kind "StorageV2" --access-tier "Hot" --output table
if %errorlevel% neq 0 (
    echo ❌ Failed to create storage account
    exit /b 1
)

echo.

REM Get connection string
echo 🔗 Retrieving connection string...
for /f "tokens=*" %%i in ('az storage account show-connection-string --name "%STORAGE_ACCOUNT_NAME%" --resource-group "%RESOURCE_GROUP_NAME%" --query "connectionString" --output tsv') do set CONNECTION_STRING=%%i

echo.
echo === Setup Complete! ===
echo.
echo 📋 Configuration Details:
echo Resource Group: %RESOURCE_GROUP_NAME%
echo Storage Account: %STORAGE_ACCOUNT_NAME%
echo Location: %LOCATION%
echo.
echo 🔐 Connection String:
echo %CONNECTION_STRING%
echo.
echo 📝 Next Steps:
echo 1. Copy the connection string above
echo 2. Set it as an environment variable:
echo    set AZURE_STORAGE_CONNECTION_STRING=%CONNECTION_STRING%
echo.
echo 3. Or add it to your .env file:
echo    AZURE_STORAGE_CONNECTION_STRING=%CONNECTION_STRING%
echo.
echo 4. Install dependencies in your server folder:
echo    cd server ^&^& npm install
echo.
echo 5. Start your application with the connection string set
echo.
echo 🗑️  To delete these resources later, run:
echo    az group delete --name %RESOURCE_GROUP_NAME% --yes --no-wait
echo.

pause