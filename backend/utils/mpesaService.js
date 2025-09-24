const axios = require("axios");
const crypto = require("crypto");

class MpesaService {
  constructor() {
    this.baseURL =
      process.env.MPESA_BASE_URL?.split("/oauth")[0] ||
      "https://sandbox.safaricom.co.ke";
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.passkey = process.env.MPESA_PASSKEY;
    this.shortcode = process.env.MPESA_SHORTCODE;
    this.callbackURL = process.env.MPESA_CALLBACK_URL;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.isInitialized = false;

    // Validate required environment variables
    this.validateConfig();

    // Pre-warm the access token
    this.initialize();
  }

  // Initialize and pre-warm access token
  async initialize() {
    try {
      console.log("🔄 Initializing M-Pesa service...");
      await this.getAccessToken();
      this.isInitialized = true;
      console.log("✅ M-Pesa service initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize M-Pesa service:", error.message);
      this.isInitialized = false;
    }
  }

  // Check if service is ready
  isReady() {
    return (
      this.isInitialized &&
      this.accessToken &&
      this.tokenExpiry &&
      Date.now() < this.tokenExpiry
    );
  }

  // Wait for service to be ready
  async waitForReady(timeout = 10000) {
    const startTime = Date.now();
    while (!this.isReady() && Date.now() - startTime < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return this.isReady();
  }

  validateConfig() {
    const required = [
      "consumerKey",
      "consumerSecret",
      "passkey",
      "shortcode",
      "callbackURL",
    ];
    const missing = required.filter((key) => !this[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required M-Pesa configuration: ${missing.join(", ")}`
      );
    }
  }

  // Generate access token with retry logic and better error handling
  async getAccessToken(retryCount = 0) {
    try {
      // Check if we have a valid token
      if (
        this.accessToken &&
        this.tokenExpiry &&
        Date.now() < this.tokenExpiry
      ) {
        return this.accessToken;
      }

      const auth = Buffer.from(
        `${this.consumerKey}:${this.consumerSecret}`
      ).toString("base64");

      const response = await axios.get(
        `${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          timeout: 10000, // 10 second timeout
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000 - 60000; // 1 minute buffer

      console.log("✅ M-Pesa access token refreshed successfully");
      return this.accessToken;
    } catch (error) {
      console.error(
        "❌ Error getting access token:",
        error.response?.data || error.message
      );

      // Retry logic for network issues
      if (
        retryCount < 2 &&
        (error.code === "ECONNRESET" || error.code === "ETIMEDOUT")
      ) {
        console.log(
          `🔄 Retrying access token request (attempt ${retryCount + 1})`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (retryCount + 1))
        ); // Exponential backoff
        return this.getAccessToken(retryCount + 1);
      }

      throw new Error(
        `Failed to get M-Pesa access token: ${
          error.response?.data?.errorMessage || error.message
        }`
      );
    }
  }

  // Generate password for STK Push
  generatePassword() {
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, -3);
    const password = Buffer.from(
      `${this.shortcode}${this.passkey}${timestamp}`
    ).toString("base64");
    return { password, timestamp };
  }

  // Initiate STK Push (Lip na M-Pesa Online) with retry logic
  async initiateSTKPush(
    phoneNumber,
    amount,
    accountReference,
    transactionDesc,
    retryCount = 0
  ) {
    try {
      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();

      // Format phone number using the service method
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const stkPushData = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: this.shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackURL,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc,
      };

      console.log(
        `📱 Initiating STK Push to ${formattedPhone} for KES ${amount}`
      );

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
        stkPushData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 15000, // 15 second timeout
        }
      );

      console.log(
        `✅ STK Push initiated successfully: ${response.data.ResponseDescription}`
      );

      return {
        success: true,
        checkoutRequestID: response.data.CheckoutRequestID,
        merchantRequestID: response.data.MerchantRequestID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        customerMessage: response.data.CustomerMessage,
      };
    } catch (error) {
      console.error(
        "❌ STK Push error:",
        error.response?.data || error.message
      );

      // Retry logic for network issues or temporary failures
      if (
        retryCount < 2 &&
        (error.code === "ECONNRESET" ||
          error.code === "ETIMEDOUT" ||
          error.response?.status === 500 ||
          error.response?.status === 502 ||
          error.response?.status === 503)
      ) {
        console.log(`🔄 Retrying STK Push (attempt ${retryCount + 1})`);
        await new Promise((resolve) =>
          setTimeout(resolve, 2000 * (retryCount + 1))
        ); // Exponential backoff
        return this.initiateSTKPush(
          phoneNumber,
          amount,
          accountReference,
          transactionDesc,
          retryCount + 1
        );
      }

      // Handle M-Pesa specific rate limiting errors
      if (error.response?.data?.errorCode === "500.003.02") {
        console.log(
          "⚠️ M-Pesa rate limit exceeded - please wait a few minutes"
        );
        return {
          success: false,
          error:
            "M-Pesa system is busy. Please wait 5-10 minutes and try again.",
          errorCode: "500.003.02",
          errorMessage: "Rate limit exceeded",
          retryAfter: 300, // 5 minutes
        };
      }

      // Handle specific M-Pesa errors
      const errorMessage = error.response?.data?.errorMessage || error.message;
      const errorCode = error.response?.data?.errorCode || error.code;

      return {
        success: false,
        error: `STK Push failed: ${errorMessage} (Code: ${errorCode})`,
        errorCode: errorCode,
        errorMessage: errorMessage,
      };
    }
  }

  // Query STK Push status
  async querySTKPushStatus(checkoutRequestID) {
    try {
      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();

      const queryData = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID,
      };

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpushquery/v1/query`,
        queryData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        success: true,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        merchantRequestID: response.data.MerchantRequestID,
        checkoutRequestID: response.data.CheckoutRequestID,
        resultCode: response.data.ResultCode,
        resultDesc: response.data.ResultDesc,
      };
    } catch (error) {
      console.error(
        "Error querying STK Push status:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message,
      };
    }
  }

  // Process payment callback
  async processCallback(callbackData) {
    try {
      const { Body } = callbackData;
      const { stkCallback } = Body;

      if (stkCallback.ResultCode === 0) {
        // Payment successful
        const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];
        const metadata = {};

        callbackMetadata.forEach((item) => {
          metadata[item.Name] = item.Value;
        });

        return {
          success: true,
          merchantRequestID: stkCallback.MerchantRequestID,
          checkoutRequestID: stkCallback.CheckoutRequestID,
          resultCode: stkCallback.ResultCode,
          resultDesc: stkCallback.ResultDesc,
          amount: metadata.Amount,
          mpesaReceiptNumber: metadata.MpesaReceiptNumber,
          transactionDate: metadata.TransactionDate,
          phoneNumber: metadata.PhoneNumber,
          accountReference:
            metadata.AccountReference || stkCallback.CheckoutRequestID,
        };
      } else {
        // Payment failed
        return {
          success: false,
          merchantRequestID: stkCallback.MerchantRequestID,
          checkoutRequestID: stkCallback.CheckoutRequestID,
          resultCode: stkCallback.ResultCode,
          resultDesc: stkCallback.ResultDesc,
          accountReference: stkCallback.CheckoutRequestID,
        };
      }
    } catch (error) {
      console.error("Error processing M-Pesa callback:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Validate phone number format - only allow 2547XXXXXXXX format
  validatePhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, "");

    // Only allow 2547XXXXXXXX format (best practice for M-Pesa)
    const mpesaPattern = /^2547\d{8}$/;
    return mpesaPattern.test(cleaned);
  }

  // Format phone number for M-Pesa - only accept 2547XXXXXXXX format
  formatPhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, "");

    // Only allow 2547XXXXXXXX format (best practice for M-Pesa)
    const mpesaPattern = /^2547\d{8}$/;

    if (mpesaPattern.test(cleaned)) {
      return cleaned;
    }

    // If invalid format, throw error instead of using fallback
    throw new Error(
      "Invalid M-Pesa phone number format. Must be 2547XXXXXXXX (e.g., 254712345678)"
    );
  }

  // Test M-Pesa connection
  async testConnection() {
    try {
      const token = await this.getAccessToken();
      return {
        success: true,
        message: "M-Pesa connection successful",
        token: token ? "Valid" : "Invalid",
      };
    } catch (error) {
      return {
        success: false,
        message: "M-Pesa connection failed",
        error: error.message,
      };
    }
  }

  // Get transaction status with retry logic
  async getTransactionStatus(checkoutRequestID, maxRetries = 3) {
    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        const result = await this.querySTKPushStatus(checkoutRequestID);
        if (result.success) {
          return result;
        }
        attempts++;

        if (attempts < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempts) * 1000)
          );
        }
      } catch (error) {
        attempts++;
        if (attempts >= maxRetries) {
          throw error;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempts) * 1000)
        );
      }
    }

    throw new Error(
      `Failed to get transaction status after ${maxRetries} attempts`
    );
  }

  // Validate transaction amount
  validateAmount(amount) {
    if (typeof amount !== "number" || amount <= 0) {
      throw new Error("Amount must be a positive number");
    }

    if (amount < 1) {
      throw new Error("Minimum transaction amount is 1 KES");
    }

    if (amount > 70000) {
      throw new Error("Maximum transaction amount is 70,000 KES");
    }

    return true;
  }

  // Generate unique account reference
  generateAccountReference(prefix = "TKT") {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // Log transaction for debugging
  logTransaction(action, data) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[M-Pesa ${action}]`, JSON.stringify(data, null, 2));
    }
  }
}

module.exports = new MpesaService();
