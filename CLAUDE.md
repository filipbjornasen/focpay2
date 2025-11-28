# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FocPay2 is a Swedish payment processing application integrating with Swish M-commerce API. It consists of:
- **Server**: Node.js/Express backend handling Swish payment requests and Azure Table Storage
- **Client**: React frontend with a single Dricko payment interface
- **Scripts**: Azure Storage setup automation

## Development Commands

### Server Development
```bash
cd server
node index.js                    # Start server on port 5000
```

### Client Development
```bash
cd client
npm start                        # Start React dev server on port 3000
npm run build                    # Build for production
npm test                         # Run tests
```

### Azure Setup
```bash
scripts/setup.bat               # Windows: Setup Azure Table Storage
```

## Architecture

### Server Structure (server/)
- **index.js**: Main Express server with Swish payment endpoints
- **database.js**: Azure Table Storage abstraction layer with PaymentDatabase class
- **SWISH_SETUP.md**: Comprehensive Swish integration documentation

### Key Server Components
- **Swish Integration**: Uses HTTPS client certificates for secure API communication
- **Payment States**: CREATED → PAID → CREDITED workflow
- **Database Layer**: Single PaymentDatabase class managing Azure Table Storage operations
- **Environment-based Configuration**: Supports test/production Swish environments

### Client Structure (client/)
- **App.js**: Router setup with single route to Dricko component
- **Dricko.js**: Main payment interface component
- Uses React Router, Ant Design for UI components

### Database Schema
All payments stored in Azure Table Storage with partition key "payment":
```javascript
{
  partitionKey: "payment",
  rowKey: paymentId,
  id: string,
  token: string,
  status: "CREATED|PAID|DECLINED|ERROR|CANCELLED|CREDITED",
  amount: number,
  currency: "SEK",
  dateCreated: ISO string,
  datePaid: ISO string,
  payerAlias: string,
  payeeAlias: string
}
```

## Key API Endpoints

- **POST /api/swish-dricko**: Create Swish payment request
- **POST /api/swish/callback**: Handle Swish payment callbacks
- **GET /api/payments/oldest-paid**: Get oldest paid payment
- **PATCH /api/payments/:id/credit**: Mark payment as credited

## Environment Configuration

### Required Environment Variables
```bash
# Azure Table Storage
TABLE_STORAGE_CONNECTION_STRING="your-azure-connection-string"

# Swish Configuration
SWISH_PASSPHRASE="swish"                    # Certificate passphrase
SWISH_ALIAS="1234679304"                    # Merchant alias
SWISH_ENV="test"                            # test|production

# Payment Configuration
UNIT_PRICE="12"                             # Price per unit in SEK (defaults to 12)
```

### Certificate Setup
Place Swish certificates in `server/certs/test/` or `server/certs/prod/`:
- `swish.pem` - Certificate file
- `swish.key` - Private key
- `root-swish.pem` - CA certificate

## Development Notes

- Server serves client build files in production (static middleware)
- Client proxies API requests to server:5000 in development
- All certificate paths are environment-dependent (test/prod folders)
- Swish API communication uses mutual TLS authentication
- Payment status updates are logged for audit trail