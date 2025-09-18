const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const https = require("https");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 5000;
const ENV = process.env.NODE_ENV || "development";
const certDir = path.join(__dirname, "certs", ENV === "production" ? "prod" : "test");

app.use(cors());
app.use(express.json());


// In-memory storage for payment requests (use database in production)
const paymentRequests = new Map();
// Swish M-ecommerce configuration (set these via environment variables)
const SWISH_CONFIG = {
  baseUrl: 'https://mss.cpc.getswish.net/swish-cpcapi/api/v2',
  certPath: certDir + '/swish.pem',
  keyPath: certDir + '/swish.key',
  caPath: certDir + '/root-swish.pem',
  passphrase: process.env.SWISH_PASSPHRASE || 'swish',
  alias: process.env.SWISH_ALIAS || '1234679304',
  environment: process.env.SWISH_ENV || 'test' // 'test' or 'production'
};

const agent = new https.Agent({
    cert: fs.readFileSync(SWISH_CONFIG.certPath, {encoding: 'utf8'}),
    key: fs.readFileSync(SWISH_CONFIG.keyPath, {encoding: 'utf8'}),
    ca: fs.readFileSync(SWISH_CONFIG.caPath, {encoding: 'utf8'}),
});

const swishClient = axios.create({
    httpsAgent: agent
});

// Add request/response interceptors for debugging
swishClient.interceptors.request.use(
  (config) => {
    console.log(`Making Swish API request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Swish API request error:', error);
    return Promise.reject(error);
  }
);

swishApiClient.interceptors.response.use(
  (response) => {
    console.log(`Swish API response: ${response.status} ${response.statusText}`);
    return response;
  },
  (error) => {
    console.error('Swish API response error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

// Swish API helper functions
async function createSwishPaymentRequest(payeeAlias) {
  const instructionId = crypto.randomUUID();
  const data = {
    payeePaymentReference: paymentData.payeePaymentReference,
    callbackUrl: `https://localhost:5000/api/swish/callback`, 
    payerAlias: SWISH_CONFIG.alias,
    amount: '10',
    currency: 'SEK',
    message: 'GET HIPPER WITH FLIPPER!',
    callbackIdentifier: instructionId
  };
  try {
    const response = await swishClient.put(`${SWISH_CONFIG.baseUrl}/paymentrequests/${instructionId}`, data);
    if (response.status === 201) {
      const { paymentrequesttoken } = response.headers;
      return { id: instructionId, token: paymentrequesttoken };
    }
  } catch (error) {
    console.error(error);
    throw new Error('Failed to create Swish payment request');
  }
}

// Create Swish payment request
app.post("/api/swish/payment-request", async (req, res) => {
  try {
    const swishResponse = await createSwishPaymentRequest(swishPaymentData);

      const paymentRequest = {
        id: swishResponse.id,
        token: swishResponse.token,
        dateCreated: new Date().toISOString(),
        status: 'CREATED',
        amount: 10,
        currency: 'SEK',
      };

      // Store payment request (use database in production)
      paymentRequests.set(paymentRequest.id, paymentRequest);

      // Return standardized response
      const userCallbackUrl = 'https://localhost:5000/receipt?token=' + paymentRequest.id;
      const redirectUrl = `swish://paymentrequest?token=${paymentRequest.token}&callbackurl=${userCallbackUrl}`;
      const responseData = {
        token: paymentRequest.token,
        callbackUrl: userCallbackUrl,
        redirectUrl: redirectUrl,
        payeeAlias: SWISH_CONFIG.alias,
        amount: 10,
        currency: "SEK",
        message: 'GET HIPPER WITH FLIPPER!',
        status: 'CREATED',
        dateCreated: new Date().toISOString()
      };

      res.status(201).json(responseData);

    } catch (swishError) {
      console.error('Failed to create Swish payment request:', swishError.message);
      return sendErrorResponse(res, 502, "Swish API error", swishError.message);
    }

});

app.post("/api/swish/callback", async (req, res) => {
  try {
    const callbackData = req.body;

    console.log("Received Swish callback:", JSON.stringify(callbackData, null, 2));

    if (!callbackData.id) {
      return sendErrorResponse(res, 400, "Invalid callback data", "Payment ID is required in callback");
    }

    const paymentRequest = paymentRequests.get(callbackData.id);

    if (!paymentRequest) {
      console.warn(`Received callback for unknown payment ID: ${callbackData.id}`);
      return sendErrorResponse(res, 404, "Payment not found", `Payment with ID ${callbackData.id} does not exist`);
    }

    const previousStatus = paymentRequest.status;
    paymentRequest.status = callbackData.status || paymentRequest.status;
    paymentRequest.dateUpdated = new Date().toISOString();
    paymentRequest.payerAlias = callbackData.payerAlias;

    // Add additional fields based on callback data
    if (callbackData.datePaid) {
      paymentRequest.datePaid = callbackData.datePaid;
    }
    if (callbackData.errorCode) {
      paymentRequest.errorCode = callbackData.errorCode;
      paymentRequest.errorMessage = callbackData.errorMessage;
    }

    // Log status change
    console.log(`Payment ${callbackData.id} status changed from ${previousStatus} to ${paymentRequest.status}`);

    res.status(200).json({
      message: "Callback processed successfully",
      paymentId: callbackData.id,
      status: paymentRequest.status
    });

  } catch (error) {
    console.error("Error processing webhook:", error);
    return sendErrorResponse(res, 500, "Internal server error", "Failed to process webhook");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


app.use(express.static(path.join(__dirname, "../client/build")));

app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build/index.html"));
});