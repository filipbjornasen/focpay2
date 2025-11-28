const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const https = require("https");
const axios = require("axios");
const { PaymentDatabase } = require("./database");
require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 5000;
const ENV = (process.env.NODE_ENV || "development").toLowerCase();
const certDir = path.join(__dirname, "certs", ENV === "production" ? "prod" : "test");
console.log("Using environment:", ENV);
console.log("Using certificate directory:", certDir);

app.use(cors());
app.use(express.json());
const AUTH_TOKEN = process.env.FOC_PAY_AUTH_TOKEN
const UNIT_PRICE = process.env.UNIT_PRICE || '12';
const paymentDb = new PaymentDatabase();
const SWISH_CONFIG = {
  baseUrl: process.env.SWISH_BASE_URL,
  certPath: certDir + '/swish.pem',
  keyPath: certDir + '/swish.key',
  caPath: certDir + '/root-swish.pem',
  alias: process.env.SWISH_ALIAS,
  callbackUrl: process.env.SWISH_CALLBACK_URL,
  userCallbackUrl: process.env.USER_CALLBACK_URL
};

console.log(SWISH_CONFIG);

if (!SWISH_CONFIG.baseUrl || !SWISH_CONFIG.certPath || !SWISH_CONFIG.keyPath || !SWISH_CONFIG.caPath || !SWISH_CONFIG.alias || !SWISH_CONFIG.callbackUrl) {
    console.error("Missing required Swish configuration in environment variables");
    process.exit(1);
}

const agent = new https.Agent({
    cert: fs.readFileSync(SWISH_CONFIG.certPath, {encoding: 'utf8'}),
    key: fs.readFileSync(SWISH_CONFIG.keyPath, {encoding: 'utf8'}),
    ca: fs.readFileSync(SWISH_CONFIG.caPath, {encoding: 'utf8'}),
});

const swishClient = axios.create({
    httpsAgent: agent
});

// Helper function for error responses
function sendErrorResponse(res, statusCode, error, details) {
  return res.status(statusCode).json({
    error: error,
    details: details,
    timestamp: new Date().toISOString()
  });
}

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

swishClient.interceptors.response.use(
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
async function createSwishPaymentRequest() {
  const instructionId = crypto.randomUUID().replace(/-/g, '').toUpperCase();
  const data = {
    callbackUrl: SWISH_CONFIG.callbackUrl,
    payeeAlias: SWISH_CONFIG.alias,
    amount: UNIT_PRICE,
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

// Dricko-specific endpoint that client is calling
app.post("/api/swish-dricko", async (req, res) => {
  try {
    const swishResponse = await createSwishPaymentRequest();

      const paymentData = {
        id: swishResponse.id,
        token: swishResponse.token,
        amount: UNIT_PRICE,
        currency: 'SEK',
        message: 'GET HIPPER WITH FLIPPER!',
        payeeAlias: SWISH_CONFIG.alias,
        callbackUrl: SWISH_CONFIG.callbackUrl + '?token=' + swishResponse.id
      };

      // Store payment request in Azure Table Storage
      const paymentRequest = await paymentDb.createPayment(paymentData);
      // Return standardized response
      const userCallbackUrl =  SWISH_CONFIG.userCallbackUrl + '?token=' + paymentRequest.id;
      const redirectUrl = `swish://paymentrequest?token=${paymentRequest.token}&callbackurl=${encodeURIComponent(userCallbackUrl)}`;
      const responseData = {
        token: paymentRequest.token,
        callbackUrl: userCallbackUrl,
        redirectUrl: redirectUrl,
        payeeAlias: SWISH_CONFIG.alias,
        amount: UNIT_PRICE,
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

    const existingPayment = await paymentDb.getPayment(callbackData.id);

    if (!existingPayment) {
      console.warn(`Received callback for unknown payment ID: ${callbackData.id}`);
      return sendErrorResponse(res, 404, "Payment not found", `Payment with ID ${callbackData.id} does not exist`);
    }

    const previousStatus = existingPayment.status;

    // Prepare additional data for update
    const additionalData = {};
    if (callbackData.payerAlias) additionalData.payerAlias = callbackData.payerAlias;
    if (callbackData.datePaid) additionalData.datePaid = callbackData.datePaid;
    if (callbackData.errorCode) {
      additionalData.errorCode = callbackData.errorCode;
      additionalData.errorMessage = callbackData.errorMessage;
    }

    // Update payment status in database
    const updatedPayment = await paymentDb.updatePaymentStatus(
      callbackData.id,
      callbackData.status || existingPayment.status,
      additionalData
    );

    // Log status change
    console.log(`Payment ${callbackData.id} status changed from ${previousStatus} to ${updatedPayment.status}`);

    res.status(200).json({
      message: "Callback processed successfully",
      paymentId: callbackData.id,
      status: updatedPayment.status
    });

  } catch (error) {
    console.error("Error processing webhook:", error);
    return sendErrorResponse(res, 500, "Internal server error", error.message);
  }
});

// Get oldest paid payment
app.get("/api/payments/oldest-paid", async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
    return sendErrorResponse(res, 401, "Unauthorized", "Invalid or missing authorization token");
  }

  try {
    const oldestPaidPayment = await paymentDb.getOldestPaidPayment();

    if (!oldestPaidPayment) {
      return res.status(404).json({
        message: "No paid payments found",
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      payment: {
        id: oldestPaidPayment.id,
        status: oldestPaidPayment.status,
        amount: oldestPaidPayment.amount,
        currency: oldestPaidPayment.currency,
        dateCreated: oldestPaidPayment.dateCreated,
        datePaid: oldestPaidPayment.datePaid,
        payerAlias: oldestPaidPayment.payerAlias,
        payeeAlias: oldestPaidPayment.payeeAlias
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error getting oldest paid payment:", error);
    return sendErrorResponse(res, 500, "Internal server error", error.message);
  }
});

// Change payment status to credited
app.patch("/api/payments/:paymentId/credit", async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || authHeader !== `Bearer ${process.env.FOC_PAY_AUTH_TOKEN}`) {
    return sendErrorResponse(res, 401, "Unauthorized", "Invalid or missing authorization token");
  }
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return sendErrorResponse(res, 400, "Bad request", "Payment ID is required");
    }

    // Check if payment exists and is in PAID status
    const existingPayment = await paymentDb.getPayment(paymentId);

    if (!existingPayment) {
      return sendErrorResponse(res, 404, "Payment not found", `Payment with ID ${paymentId} does not exist`);
    }

    if (existingPayment.status !== 'PAID') {
      return sendErrorResponse(res, 400, "Invalid operation", `Payment must be in PAID status to be credited. Current status: ${existingPayment.status}`);
    }

    // Update status to CREDITED
    const updatedPayment = await paymentDb.updatePaymentStatus(paymentId, 'CREDITED');

    console.log(`Payment ${paymentId} status changed from ${existingPayment.status} to CREDITED`);

    res.status(200).json({
      message: "Payment successfully credited",
      payment: {
        id: updatedPayment.id,
        status: updatedPayment.status,
        amount: updatedPayment.amount,
        currency: updatedPayment.currency,
        dateCreated: updatedPayment.dateCreated,
        dateUpdated: updatedPayment.dateUpdated,
        datePaid: updatedPayment.datePaid
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error crediting payment:", error);
    return sendErrorResponse(res, 500, "Internal server error", error.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


app.use(function(req, res, next) {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(express.static(path.join(__dirname, "build")));

app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "build/index.html"));
});