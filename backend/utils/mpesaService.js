const axios = require("axios");
const crypto = require("crypto");

class MpesaService {
  constructor() {
    this.baseURL = "https://sandbox.safaricom.co.ke";
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.passkey = process.env.MPESA_PASSKEY;
    this.shortcode = process.env.MPESA_SHORTCODE;
    this.callbackURL =
      process.env.MPESA_CALLBACK_URL ||
      `${process.env.BACKEND_URL}/api/payments/mpesa/callback`;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Generate access token
  async getAccessToken() {
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
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000 - 60000; // 1 minute buffer

      return this.accessToken;
    } catch (error) {
      console.error(
        "Error getting M-Pesa access token:",
        error.response?.data || error.message
      );
      throw new Error("Failed to get M-Pesa access token");
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

  // Initiate STK Push (Lip na M-Pesa Online)
  async initiateSTKPush(
    phoneNumber,
    amount,
    accountReference,
    transactionDesc
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

      const response = await axios.post(
        `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
        stkPushData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
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
        "Error initiating STK Push:",
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message,
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
        };
      } else {
        // Payment failed
        return {
          success: false,
          merchantRequestID: stkCallback.MerchantRequestID,
          checkoutRequestID: stkCallback.CheckoutRequestID,
          resultCode: stkCallback.ResultCode,
          resultDesc: stkCallback.ResultDesc,
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
}

module.exports = new MpesaService();
