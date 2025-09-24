import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import api from "../services/api";
import "./TransactionLogs.css";

const TransactionLogs = () => {
  const [logs, setLogs] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get("/payments/logs");
      setLogs(response.data.data);
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast.error("Failed to fetch transaction logs");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const response = await api.get("/payments/logs/summary");
      setSummary(response.data.data);
    } catch (error) {
      console.error("Error fetching summary:", error);
      toast.error("Failed to fetch transaction summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "summary") {
      fetchSummary();
    } else {
      fetchLogs();
    }
  }, [activeTab]);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "success";
      case "failed":
        return "error";
      case "initiated":
        return "warning";
      case "cancelled":
        return "info";
      default:
        return "default";
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "STK_PUSH_INITIATED":
        return "primary";
      case "PAYMENT_COMPLETED":
        return "success";
      case "PAYMENT_FAILED":
        return "error";
      case "PAYMENT_CANCELLED":
        return "info";
      default:
        return "default";
    }
  };

  return (
    <div className="transaction-logs">
      <div className="logs-header">
        <h1>M-Pesa Transaction Logs</h1>
        <div className="logs-tabs">
          <button
            className={activeTab === "summary" ? "active" : ""}
            onClick={() => setActiveTab("summary")}
          >
            Summary
          </button>
          <button
            className={activeTab === "logs" ? "active" : ""}
            onClick={() => setActiveTab("logs")}
          >
            All Logs
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading transaction data...</p>
        </div>
      )}

      {activeTab === "summary" && summary && (
        <div className="summary-section">
          <div className="summary-cards">
            <div className="summary-card">
              <h3>Total Transactions</h3>
              <p className="number">{summary.totalTransactions}</p>
            </div>
            <div className="summary-card">
              <h3>By Type</h3>
              <div className="type-stats">
                {Object.entries(summary.byType).map(([type, count]) => (
                  <div key={type} className="type-item">
                    <span className={`type-badge ${getTypeColor(type)}`}>
                      {type}
                    </span>
                    <span className="count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="summary-card">
              <h3>By Status</h3>
              <div className="status-stats">
                {Object.entries(summary.byStatus).map(([status, count]) => (
                  <div key={status} className="status-item">
                    <span className={`status-badge ${getStatusColor(status)}`}>
                      {status}
                    </span>
                    <span className="count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="summary-card">
              <h3>By Phone Number</h3>
              <div className="phone-stats">
                {Object.entries(summary.byPhoneNumber).map(([phone, count]) => (
                  <div key={phone} className="phone-item">
                    <span className="phone">{phone}</span>
                    <span className="count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="recent-transactions">
            <h3>Recent Transactions</h3>
            {summary.recentTransactions.length > 0 ? (
              <div className="recent-list">
                {summary.recentTransactions.map((txn) => (
                  <div key={txn.id} className="recent-item">
                    <div className="recent-info">
                      <span className={`type-badge ${getTypeColor(txn.type)}`}>
                        {txn.type}
                      </span>
                      <span className="phone">{txn.data.phoneNumber}</span>
                      <span className="amount">KES {txn.data.amount}</span>
                    </div>
                    <div className="recent-time">
                      {formatTimestamp(txn.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No recent transactions</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "logs" && logs && (
        <div className="logs-section">
          <div className="logs-meta">
            <p>
              Total Transactions:{" "}
              <strong>{logs.metadata.totalTransactions}</strong>
            </p>
            <p>
              Last Updated:{" "}
              <strong>{formatTimestamp(logs.metadata.lastUpdated)}</strong>
            </p>
          </div>

          {logs.transactions.length > 0 ? (
            <div className="transactions-list">
              {logs.transactions.map((txn) => (
                <div key={txn.id} className="transaction-item">
                  <div className="transaction-header">
                    <div className="transaction-id">
                      <span className="id-label">ID:</span>
                      <span className="id-value">{txn.id}</span>
                    </div>
                    <div className="transaction-time">
                      {formatTimestamp(txn.timestamp)}
                    </div>
                  </div>

                  <div className="transaction-body">
                    <div className="transaction-type">
                      <span className={`type-badge ${getTypeColor(txn.type)}`}>
                        {txn.type}
                      </span>
                    </div>

                    <div className="transaction-details">
                      <div className="detail-row">
                        <span className="label">Phone:</span>
                        <span className="value">{txn.data.phoneNumber}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Amount:</span>
                        <span className="value">KES {txn.data.amount}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Status:</span>
                        <span
                          className={`status-badge ${getStatusColor(
                            txn.data.status
                          )}`}
                        >
                          {txn.data.status}
                        </span>
                      </div>
                      {txn.data.checkoutRequestID && (
                        <div className="detail-row">
                          <span className="label">Checkout ID:</span>
                          <span className="value checkout-id">
                            {txn.data.checkoutRequestID}
                          </span>
                        </div>
                      )}
                      {txn.data.mpesaReceiptNumber && (
                        <div className="detail-row">
                          <span className="label">Receipt:</span>
                          <span className="value receipt">
                            {txn.data.mpesaReceiptNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              <p>No transactions found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionLogs;
