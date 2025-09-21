# Azure Storage Setup Scripts

This folder contains scripts to set up Azure Table Storage for the Focpay2 demo application.

## Prerequisites

1. **Azure CLI**: Install the Azure CLI from [here](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
2. **Azure Account**: You need an active Azure subscription
3. **Login**: Run `az login` to authenticate with Azure

## Scripts

### For Windows Users
Run the batch file:
```bash
scripts\setup-azure-storage.bat
```

### For Linux/Mac Users
Make the script executable and run:
```bash
chmod +x scripts/setup-azure-storage.sh
./scripts/setup-azure-storage.sh
```

## What the Script Does

1. Creates a new Resource Group named `focpay2-rg`
2. Creates a Storage Account with a unique name (includes timestamp)
3. Configures the storage account for Table Storage
4. Retrieves the connection string
5. Provides instructions for next steps

## After Running the Script

1. Copy the connection string provided by the script
2. Set it as an environment variable:
   ```bash
   # Windows
   set AZURE_STORAGE_CONNECTION_STRING="your-connection-string-here"

   # Linux/Mac
   export AZURE_STORAGE_CONNECTION_STRING="your-connection-string-here"
   ```
3. Or add it to a `.env` file in your server folder
4. Install the new dependencies:
   ```bash
   cd server
   npm install
   ```

## Usage in Your Application

The database operations are available in `server/database.js`:

```javascript
const { paymentDb } = require('./database');

// Create a payment
await paymentDb.createPayment({
    id: 'payment-123',
    amount: 100,
    currency: 'SEK'
});

// Update payment status
await paymentDb.updatePaymentStatus('payment-123', 'PAID', {
    payerAlias: '1234567890',
    datePaid: new Date().toISOString()
});

// Get oldest paid payment
const oldestPaid = await paymentDb.getOldestPaidPayment();
```

## Cleanup

To delete all Azure resources created by this script:
```bash
az group delete --name focpay2-rg --yes --no-wait
```

## Troubleshooting

- **Azure CLI not found**: Install Azure CLI and restart your terminal
- **Not logged in**: Run `az login` and follow the authentication process
- **Permission errors**: Ensure your Azure account has sufficient permissions to create resource groups and storage accounts
- **Storage account name conflicts**: The script uses timestamps to ensure unique names, but you can modify the name if needed