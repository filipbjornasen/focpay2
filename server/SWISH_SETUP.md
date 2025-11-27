# Swish Payment Integration Setup

 FOC NUMMER: 1230814343

This server implements Swish M-ecommerce payment requests using a JavaScript-friendly HTTPS client with proper certificate handling.

## Certificate Setup

### 1. Create certificates directory
```bash
mkdir certs
```

### 2. Obtain Swish certificates
- Download your Swish certificates from the Swish merchant portal
- You'll receive either:
  - A `.p12` file (preferred) - contains private key, certificate, and CA bundle
  - Separate `.crt`, `.key`, and `.ca` files

### 3. Place certificates in the `certs` directory

#### Option A: Using .p12 certificate (recommended)
```bash
cp your-swish-certificate.p12 certs/swish.p12
```

#### Option B: Using separate files
```bash
cp your-certificate.crt certs/swish.crt
cp your-private-key.key certs/swish.key
cp swish-ca.crt certs/swish.ca
```

### 4. Set environment variables

Create a `.env` file in the server directory:

```env
# Swish Configuration
SWISH_ENV=test                                                    # 'test' or 'production'
SWISH_BASE_URL=https://mss.cpc.getswish.net/swish-cpcapi/api/v2  # Test environment
SWISH_ALIAS=1234679304                                           # Your merchant alias

# Certificate configuration (choose one approach)

# Option A: Using .p12 certificate
SWISH_PFX_PATH=./certs/swish.p12
SWISH_PASSPHRASE=swish

# Option B: Using separate certificate files
SWISH_CERT_PATH=./certs/swish.crt
SWISH_KEY_PATH=./certs/swish.key
SWISH_CA_PATH=./certs/swish.ca
```

### 5. For production environment:
```env
SWISH_ENV=production
SWISH_BASE_URL=https://cpc.getswish.net/swish-cpcapi/api/v2
```

## API Endpoints

### Create Payment Request
```http
POST /api/swish/payment-request
Content-Type: application/json

{
  "amount": "100.00",
  "currency": "SEK",
  "message": "Payment for order #123",
  "payerAlias": "46701234567",           // Optional - Swedish phone number
  "callbackUrl": "https://yoursite.com/swish/callback"  // Optional
}
```

Response:
```json
{
  "id": "uuid-generated-id",
  "payeePaymentReference": "uuid-generated-id",
  "paymentReference": "swish-payment-reference-from-api",
  "callbackUrl": "https://yoursite.com/swish/callback",
  "payerAlias": "46701234567",
  "payeeAlias": "1234679304",
  "amount": "100.00",
  "currency": "SEK",
  "message": "Payment for order #123",
  "status": "CREATED",
  "dateCreated": "2023-12-01T10:00:00Z"
}
```

### Check Payment Status
```http
GET /api/swish/payment-request/{id}
```

### Webhook for Callbacks
```http
POST /api/swish/webhook
```

### List All Payments (Debug)
```http
GET /api/swish/payment-requests
```

## Testing without certificates

If no certificates are found, the system will operate in simulation mode:
- Payment requests are created with mock responses
- Status checks simulate payment completion after 30 seconds
- All validation and error handling works normally

This allows development and testing before obtaining real Swish certificates.

## Dependencies

Install required packages:
```bash
npm install axios
```

## Features

- ✅ JavaScript-friendly HTTPS client with axios
- ✅ Automatic certificate detection (.p12 or separate files)
- ✅ Comprehensive input validation and sanitization
- ✅ Structured error responses
- ✅ Request/response logging for debugging
- ✅ Graceful fallback when certificates are unavailable
- ✅ Support for both test and production environments
- ✅ Real-time status checking from Swish API
- ✅ Webhook handling for payment callbacks

## Error Handling

The implementation includes robust error handling for:
- Missing or invalid certificates
- Swish API communication errors
- Invalid input validation
- Network timeouts
- Authentication failures

All errors are logged and return structured responses with appropriate HTTP status codes.