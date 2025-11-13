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
  async getAccessToken(retryCount = 0, forceRefresh = false) {
    try {
      // Check if we have a valid token (unless forcing refresh)
      if (
        !forceRefresh &&
        this.accessToken &&
        this.tokenExpiry &&
        Date.now() < this.tokenExpiry
      ) {
        return this.accessToken;
      }

      // Validate credentials are present
      if (!this.consumerKey || !this.consumerSecret) {
        throw new Error(
          "M-Pesa Consumer Key and Consumer Secret are required. Please check your environment variables."
        );
      }

      const auth = Buffer.from(
        `${this.consumerKey}:${this.consumerSecret}`
      ).toString("base64");

      console.log("🔄 Requesting new M-Pesa access token...");
      const response = await axios.get(
        `${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          timeout: 10000, // 10 second timeout
          validateStatus: function (status) {
            return status < 500; // Don't throw for 4xx errors, handle them below
          },
        }
      );

      // Check for error responses
      if (response.status !== 200) {
        const errorMsg =
          response.data?.errorMessage ||
          response.data?.error_description ||
          `HTTP ${response.status}`;
        throw new Error(`M-Pesa OAuth failed: ${errorMsg}`);
      }

      if (!response.data || !response.data.access_token) {
        throw new Error(
          "Invalid response from M-Pesa OAuth endpoint - no access token received"
        );
      }

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000 - 60000; // 1 minute buffer

      console.log("✅ M-Pesa access token refreshed successfully");
      return this.accessToken;
    } catch (error) {
      console.error(
        "❌ Error getting access token:",
        error.response?.data || error.message
      );

      // Check for authentication errors (invalid credentials)
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error(
          `M-Pesa authentication failed (${
            error.response?.status
          }). Please verify your Consumer Key and Consumer Secret are correct and match your environment (sandbox vs production). Error: ${
            error.response?.data?.errorMessage || error.message
          }`
        );
      }

      // Check for bad request (often means invalid credentials or wrong environment)
      if (error.response?.status === 400) {
        throw new Error(
          `M-Pesa bad request (400). This usually means your Consumer Key/Secret are invalid, expired, or don't match the environment (sandbox vs production). Please verify your credentials in the Daraja Developer Portal.`
        );
      }

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
          error.response?.data?.errorMessage ||
          error.response?.data?.error_description ||
          error.message
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
      // Always get a fresh token for STK Push to avoid expired tokens
      const accessToken = await this.getAccessToken(0, true); // Force refresh
      const { password, timestamp } = this.generatePassword();

      // Format phone number using the service method
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      // Verify token is valid before proceeding
      if (!accessToken || accessToken.length < 10) {
        throw new Error("Invalid access token received from M-Pesa");
      }

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
      console.log("📋 STK Push Request Data:", {
        BusinessShortCode: this.shortcode,
        CallBackURL: this.callbackURL,
        PhoneNumber: formattedPhone,
        Amount: amount,
        AccountReference: accountReference,
      });

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
        stkPushData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 15000, // 15 second timeout
          validateStatus: function (status) {
            return status < 500; // Don't throw for 4xx errors, handle them below
          },
        }
      );

      // Check for error responses
      if (response.status !== 200) {
        const errorMsg =
          response.data?.errorMessage ||
          response.data?.error_description ||
          `HTTP ${response.status}`;
        throw new Error(
          `STK Push failed: ${errorMsg} (Status: ${response.status})`
        );
      }

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

      // Handle invalid access token or forbidden errors - force refresh and retry
      const errorCode = error.response?.data?.errorCode;
      const statusCode = error.response?.status;
      const isInvalidToken =
        errorCode === "404.001.03" ||
        errorCode === "401.002.01" ||
        statusCode === 401 ||
        statusCode === 403 ||
        (error.response?.data?.errorMessage &&
          (error.response.data.errorMessage.includes("Invalid Access Token") ||
            error.response.data.errorMessage.includes("Forbidden")));

      if (isInvalidToken && retryCount < 2) {
        console.log(
          `🔄 Authentication error (${statusCode}) detected, forcing token refresh...`
        );
        // Force token refresh by clearing current token
        this.accessToken = null;
        this.tokenExpiry = null;

        // Wait a moment before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));

        console.log(
          `🔄 Retrying STK Push with fresh token (attempt ${retryCount + 1})`
        );
        return this.initiateSTKPush(
          phoneNumber,
          amount,
          accountReference,
          transactionDesc,
          retryCount + 1
        );
      }

      // Handle 403 Forbidden specifically
      if (statusCode === 403) {
        console.error("❌ M-Pesa 403 Forbidden Error Details:");
        console.error("   Error Code:", errorCode);
        console.error("   Error Message:", error.response?.data?.errorMessage);
        console.error("   Request Data:", {
          BusinessShortCode: this.shortcode,
          CallBackURL: this.callbackURL,
          PhoneNumber: formattedPhone,
        });

        return {
          success: false,
          error: `M-Pesa access forbidden (403). This usually means:
1. Your Consumer Key/Secret don't have STK Push permissions
2. Your shortcode/passkey combination is incorrect
3. Your callback URL is not whitelisted
4. Your app is not approved for STK Push in the Daraja portal

Please verify your credentials and app permissions in the Daraja Developer Portal.`,
          errorCode: errorCode || "403",
          errorMessage: error.response?.data?.errorMessage || "Forbidden",
        };
      }

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
      const finalErrorCode =
        errorCode || error.response?.data?.errorCode || error.code;

      return {
        success: false,
        error: `STK Push failed: ${errorMessage} (Code: ${finalErrorCode})`,
        errorCode: finalErrorCode,
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
    if (!phoneNumber) {
      return false;
    }

    const cleaned = phoneNumber.replace(/\D/g, "");

    // Allow Safaricom numbers that start with 7 (07x/7xx) or 1 (01x/1xx)
    const canonicalPattern = /^254(7|1)\d{8}$/;
    return canonicalPattern.test(cleaned);
  }

  // Format phone number for M-Pesa - only accept 2547XXXXXXXX format
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) {
      throw new Error(
        "Invalid M-Pesa phone number format. Must be 2547XXXXXXXX or 2541XXXXXXXX."
      );
    }

    const cleaned = phoneNumber.replace(/\D/g, "");

    // Support common Safaricom number formats: 2547/2541, 07/01, 7/1, +2547/+2541
    const convertiblePattern = /^(?:254|0)?(7|1)\d{8}$/;

    if (!convertiblePattern.test(cleaned)) {
      throw new Error(
        "Invalid M-Pesa phone number format. Use formats like 254712345678 or 254112345678."
      );
    }

    let subscriberPortion;

    if (cleaned.startsWith("254")) {
      subscriberPortion = cleaned.slice(3);
    } else if (cleaned.startsWith("0")) {
      subscriberPortion = cleaned.slice(1);
    } else {
      subscriberPortion = cleaned;
    }

    return `254${subscriberPortion}`;
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
