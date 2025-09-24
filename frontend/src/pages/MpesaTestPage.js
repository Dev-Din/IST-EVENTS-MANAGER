import React, { useState } from "react";
import { toast } from "react-toastify";
import api from "../services/api";
import "./MpesaTestPage.css";

const MpesaTestPage = () => {
  const [testData, setTestData] = useState({
    phoneNumber: "254708374149", // Safaricom test number
    amount: 1,
    accountReference: "TEST-" + Date.now(),
    transactionDesc: "Test Payment",
  });

  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [testResults, setTestResults] = useState([]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTestData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      const response = await api.get("/payments/mpesa/test");
      setConnectionStatus(response.data);

      if (response.data.success) {
        toast.success("M-Pesa connection successful!");
      } else {
        toast.error("M-Pesa connection failed: " + response.data.message);
      }
    } catch (error) {
      console.error("Connection test error:", error);
      toast.error("Failed to test M-Pesa connection");
      setConnectionStatus({
        success: false,
        message: "Connection test failed",
        error: error.response?.data?.message || error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const runSTKPushTest = async () => {
    try {
      setLoading(true);

      // This would normally be called from the payment form
      // For testing, we'll simulate the STK Push initiation
      const response = await api.post("/payments/mpesa/initiate", {
        eventId: "test-event-id", // You'll need a real event ID
        phoneNumber: testData.phoneNumber,
        quantity: 1,
      });

      const result = {
        timestamp: new Date().toISOString(),
        type: "STK Push Test",
        success: true,
        data: response.data.data,
        message: "STK Push initiated successfully",
      };

      setTestResults((prev) => [result, ...prev]);
      toast.success("STK Push test initiated! Check your phone.");
    } catch (error) {
      console.error("STK Push test error:", error);
      const result = {
        timestamp: new Date().toISOString(),
        type: "STK Push Test",
        success: false,
        error: error.response?.data?.message || error.message,
        message: "STK Push test failed",
      };

      setTestResults((prev) => [result, ...prev]);
      toast.error("STK Push test failed: " + result.error);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="mpesa-test-page">
      <div className="test-container">
        <div className="test-header">
          <h1>M-Pesa Integration Test</h1>
          <p>Test M-Pesa STK Push functionality in sandbox environment</p>
        </div>

        <div className="test-sections">
          {/* Connection Test */}
          <div className="test-section">
            <h2>1. Connection Test</h2>
            <p>Test M-Pesa API connection and authentication</p>

            <div className="test-controls">
              <button
                onClick={testConnection}
                disabled={loading}
                className="btn-test"
              >
                {loading ? "Testing..." : "Test Connection"}
              </button>
            </div>

            {connectionStatus && (
              <div
                className={`test-result ${
                  connectionStatus.success ? "success" : "error"
                }`}
              >
                <div className="result-header">
                  <span className="result-icon">
                    {connectionStatus.success ? "✅" : "❌"}
                  </span>
                  <span className="result-title">
                    {connectionStatus.success
                      ? "Connection Successful"
                      : "Connection Failed"}
                  </span>
                </div>
                <div className="result-details">
                  <p>
                    <strong>Message:</strong> {connectionStatus.message}
                  </p>
                  {connectionStatus.error && (
                    <p>
                      <strong>Error:</strong> {connectionStatus.error}
                    </p>
                  )}
                  <p>
                    <strong>Timestamp:</strong> {new Date().toISOString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* STK Push Test */}
          <div className="test-section">
            <h2>2. STK Push Test</h2>
            <p>Test M-Pesa STK Push payment initiation</p>

            <div className="test-form">
              <div className="form-group">
                <label htmlFor="phoneNumber">Test Phone Number</label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={testData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="254708374149"
                  className="test-input"
                />
                <small>Safaricom test number: 254708374149</small>
              </div>

              <div className="form-group">
                <label htmlFor="amount">Test Amount (KES)</label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={testData.amount}
                  onChange={handleInputChange}
                  min="1"
                  max="70000"
                  className="test-input"
                />
                <small>Sandbox amount (will be charged KES 1)</small>
              </div>

              <div className="form-group">
                <label htmlFor="accountReference">Account Reference</label>
                <input
                  type="text"
                  id="accountReference"
                  name="accountReference"
                  value={testData.accountReference}
                  onChange={handleInputChange}
                  className="test-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="transactionDesc">Transaction Description</label>
                <input
                  type="text"
                  id="transactionDesc"
                  name="transactionDesc"
                  value={testData.transactionDesc}
                  onChange={handleInputChange}
                  className="test-input"
                />
              </div>

              <button
                onClick={runSTKPushTest}
                disabled={loading}
                className="btn-test-primary"
              >
                {loading ? "Testing..." : "Run STK Push Test"}
              </button>
            </div>
          </div>

          {/* Test Results */}
          <div className="test-section">
            <h2>3. Test Results</h2>
            <div className="results-header">
              <p>View all test results and responses</p>
              <button onClick={clearResults} className="btn-clear">
                Clear Results
              </button>
            </div>

            <div className="test-results">
              {testResults.length === 0 ? (
                <div className="no-results">
                  <p>
                    No test results yet. Run some tests to see results here.
                  </p>
                </div>
              ) : (
                testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`test-result ${
                      result.success ? "success" : "error"
                    }`}
                  >
                    <div className="result-header">
                      <span className="result-icon">
                        {result.success ? "✅" : "❌"}
                      </span>
                      <span className="result-title">{result.type}</span>
                      <span className="result-time">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="result-details">
                      <p>
                        <strong>Status:</strong>{" "}
                        {result.success ? "Success" : "Failed"}
                      </p>
                      <p>
                        <strong>Message:</strong> {result.message}
                      </p>
                      {result.error && (
                        <p>
                          <strong>Error:</strong> {result.error}
                        </p>
                      )}
                      {result.data && (
                        <div className="result-data">
                          <p>
                            <strong>Response Data:</strong>
                          </p>
                          <pre>{JSON.stringify(result.data, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="test-section">
            <h2>4. Testing Instructions</h2>
            <div className="instructions">
              <div className="instruction-item">
                <h3>🔧 Setup Requirements</h3>
                <ul>
                  <li>Ensure M-Pesa sandbox credentials are configured</li>
                  <li>Use Safaricom test number: 254708374149</li>
                  <li>Have ngrok running for callback testing</li>
                </ul>
              </div>

              <div className="instruction-item">
                <h3>📱 STK Push Testing</h3>
                <ul>
                  <li>Enter test phone number (254708374149)</li>
                  <li>Click "Run STK Push Test"</li>
                  <li>Check your phone for M-Pesa prompt</li>
                  <li>Enter test PIN: 1234</li>
                  <li>Monitor callback responses</li>
                </ul>
              </div>

              <div className="instruction-item">
                <h3>🔍 Monitoring</h3>
                <ul>
                  <li>Check browser console for logs</li>
                  <li>Monitor backend logs for callbacks</li>
                  <li>Verify database transaction records</li>
                  <li>Test payment status queries</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MpesaTestPage;
