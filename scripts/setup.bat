@echo off
setlocal EnableDelayedExpansion

REM Azure Setup Script for Focpay2 Demo Application
REM This script creates Azure Storage Account and App Service

REM Configuration
set RESOURCE_GROUP_NAME=focpay2-rg
for /f %%i in ('powershell -command "Get-Date -UFormat %%s"') do set TIMESTAMP=%%i
set STORAGE_ACCOUNT_NAME=focpay2storage%TIMESTAMP%
set APP_SERVICE_PLAN_NAME=focpay2-plan
set APP_SERVICE_NAME=focpay2-app-%TIMESTAMP%
set LOCATION=West Europe
set STORAGE_SKU=Standard_LRS
set APP_SERVICE_SKU=B1

echo === Azure Setup for Focpay2 ===
echo Resource Group: %RESOURCE_GROUP_NAME%
echo Storage Account: %STORAGE_ACCOUNT_NAME%
echo App Service Plan: %APP_SERVICE_PLAN_NAME%
echo App Service: %APP_SERVICE_NAME%
echo Location: %LOCATION%
echo Storage SKU: %STORAGE_SKU%
echo App Service SKU: %APP_SERVICE_SKU% (Basic B1 - cheapest non-shared tier)
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
echo 📦 Checking/Creating resource group '%RESOURCE_GROUP_NAME%'...
az group show --name "%RESOURCE_GROUP_NAME%" >nul 2>&1
if %errorlevel% neq 0 (
    echo Creating new resource group...
    az group create --name "%RESOURCE_GROUP_NAME%" --location "%LOCATION%" --output table
    if %errorlevel% neq 0 (
        echo ❌ Failed to create resource group
        exit /b 1
    )
) else (
    echo ✅ Resource group already exists
)

echo.

REM Create Storage Account
echo 🏗️  Checking/Creating storage account '%STORAGE_ACCOUNT_NAME%'...
az storage account show --name "%STORAGE_ACCOUNT_NAME%" --resource-group "%RESOURCE_GROUP_NAME%" >nul 2>&1
if %errorlevel% neq 0 (
    echo Creating new storage account...
    az storage account create --name "%STORAGE_ACCOUNT_NAME%" --resource-group "%RESOURCE_GROUP_NAME%" --location "%LOCATION%" --sku "%STORAGE_SKU%" --kind "StorageV2" --access-tier "Hot" --output table
    if %errorlevel% neq 0 (
        echo ❌ Failed to create storage account
        exit /b 1
    )
) else (
    echo ✅ Storage account already exists
)

echo.

REM Create App Service Plan
echo 🚀 Checking/Creating App Service Plan '%APP_SERVICE_PLAN_NAME%'...
az appservice plan show --name "%APP_SERVICE_PLAN_NAME%" --resource-group "%RESOURCE_GROUP_NAME%" >nul 2>&1
if %errorlevel% neq 0 (
    echo Creating new App Service Plan...
    az appservice plan create --name "%APP_SERVICE_PLAN_NAME%" --resource-group "%RESOURCE_GROUP_NAME%" --location "%LOCATION%" --sku "%APP_SERVICE_SKU%" --is-linux --output table
    if %errorlevel% neq 0 (
        echo ❌ Failed to create App Service Plan
        exit /b 1
    )
) else (
    echo ✅ App Service Plan already exists
)

echo.

REM Create App Service
echo 🌐 Checking/Creating App Service '%APP_SERVICE_NAME%'...
az webapp show --name "%APP_SERVICE_NAME%" --resource-group "%RESOURCE_GROUP_NAME%" >nul 2>&1
if %errorlevel% neq 0 (
    echo Creating new App Service...
    az webapp create --name "%APP_SERVICE_NAME%" --resource-group "%RESOURCE_GROUP_NAME%" --plan "%APP_SERVICE_PLAN_NAME%" --runtime "NODE:18-lts" --output table
    if %errorlevel% neq 0 (
        echo ❌ Failed to create App Service
        exit /b 1
    )
) else (
    echo ✅ App Service already exists
)

echo.

REM Get connection string
echo 🔗 Retrieving storage connection string...
for /f "tokens=*" %%i in ('az storage account show-connection-string --name "%STORAGE_ACCOUNT_NAME%" --resource-group "%RESOURCE_GROUP_NAME%" --query "connectionString" --output tsv') do set CONNECTION_STRING=%%i

REM Get App Service URL
echo 🌍 Retrieving App Service URL...
for /f "tokens=*" %%i in ('az webapp show --name "%APP_SERVICE_NAME%" --resource-group "%RESOURCE_GROUP_NAME%" --query "defaultHostName" --output tsv') do set APP_URL=%%i

echo.
echo === Setup Complete! ===
echo.
echo 📋 Configuration Details:
echo Resource Group: %RESOURCE_GROUP_NAME%
echo Storage Account: %STORAGE_ACCOUNT_NAME%
echo App Service Plan: %APP_SERVICE_PLAN_NAME% (%APP_SERVICE_SKU%)
echo App Service: %APP_SERVICE_NAME%
echo App URL: https://%APP_URL%
echo Location: %LOCATION%
echo.
echo 🔐 Storage Connection String:
echo %CONNECTION_STRING%
echo.
echo 📝 Next Steps:
echo.
echo 1. Configure your app with the storage connection string:
echo    set AZURE_STORAGE_CONNECTION_STRING=%CONNECTION_STRING%
echo.
echo 2. Or add it to your .env file:
echo    AZURE_STORAGE_CONNECTION_STRING=%CONNECTION_STRING%
echo.
echo 3. Deploy your application to the App Service:
echo    cd server ^&^& npm run build
echo    az webapp deployment source config-zip --name %APP_SERVICE_NAME% --resource-group %RESOURCE_GROUP_NAME% --src deployment.zip
echo.
echo 4. Set environment variables on the App Service:
echo    az webapp config appsettings set --name %APP_SERVICE_NAME% --resource-group %RESOURCE_GROUP_NAME% --settings AZURE_STORAGE_CONNECTION_STRING="%CONNECTION_STRING%"
echo.
echo 5. Your app will be available at: https://%APP_URL%
echo.
echo 🗑️  To delete all resources later, run:
echo    az group delete --name %RESOURCE_GROUP_NAME% --yes --no-wait
echo.

pause