import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import api from "../services/api";
import {
  formatTimestamp,
  formatDate,
  formatTime,
} from "../utils/dateFormatter";
import "./TransactionLogs.css";

const TransactionLogs = () => {
  const [logs, setLogs] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");

  // Filter states
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    phoneNumber: "",
  });

  // Dropdown states
  const [dropdowns, setDropdowns] = useState({
    type: false,
    status: false,
    phoneNumber: false,
  });

  // Search states
  const [searchTerms, setSearchTerms] = useState({
    type: "",
    status: "",
    phoneNumber: "",
  });

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown-container")) {
        setDropdowns({
          type: false,
          status: false,
          phoneNumber: false,
        });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  // Filter functions
  const toggleDropdown = (dropdownType) => {
    setDropdowns((prev) => ({
      ...prev,
      [dropdownType]: !prev[dropdownType],
    }));
  };

  const handleFilterSelect = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
    setDropdowns((prev) => ({
      ...prev,
      [filterType]: false,
    }));
  };

  const handleSearchChange = (filterType, value) => {
    setSearchTerms((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const clearFilter = (filterType) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: "",
    }));
    setSearchTerms((prev) => ({
      ...prev,
      [filterType]: "",
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      type: "",
      status: "",
      phoneNumber: "",
    });
    setSearchTerms({
      type: "",
      status: "",
      phoneNumber: "",
    });
  };

  // Filter data based on search terms
  const getFilteredData = (data, filterType, searchTerm) => {
    if (!searchTerm) return data;
    return data.filter((item) =>
      item.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Get filtered transactions based on active filters
  const getFilteredTransactions = (transactions) => {
    if (!transactions) return [];

    return transactions.filter((txn) => {
      const typeMatch = !filters.type || txn.type === filters.type;
      const statusMatch = !filters.status || txn.data.status === filters.status;
      const phoneMatch =
        !filters.phoneNumber || txn.data.phoneNumber === filters.phoneNumber;

      return typeMatch && statusMatch && phoneMatch;
    });
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
          {/* Filter Controls */}
          <div className="filter-controls">
            <div className="filter-header">
              <h3>Filter Transactions</h3>
              <button className="clear-all-btn" onClick={clearAllFilters}>
                Clear All Filters
              </button>
            </div>

            <div className="filter-dropdowns">
              {/* By Type Filter */}
              <div className="filter-dropdown">
                <label>By Type</label>
                <div className="dropdown-container">
                  <button
                    className={`dropdown-toggle ${
                      filters.type ? "has-filter" : ""
                    }`}
                    onClick={() => toggleDropdown("type")}
                  >
                    <span>{filters.type || "All Types"}</span>
                    <i
                      className={`fas fa-chevron-${
                        dropdowns.type ? "up" : "down"
                      }`}
                    ></i>
                  </button>

                  {dropdowns.type && (
                    <div className="dropdown-menu">
                      <div className="search-box">
                        <i className="fas fa-search"></i>
                        <input
                          type="text"
                          placeholder="Search types..."
                          value={searchTerms.type}
                          onChange={(e) =>
                            handleSearchChange("type", e.target.value)
                          }
                        />
                      </div>
                      <div className="dropdown-options">
                        <div
                          className={`dropdown-option ${
                            !filters.type ? "selected" : ""
                          }`}
                          onClick={() => handleFilterSelect("type", "")}
                        >
                          <span>All Types</span>
                          <span className="count">
                            {summary.totalTransactions}
                          </span>
                        </div>
                        {getFilteredData(
                          Object.keys(summary.byType),
                          "type",
                          searchTerms.type
                        ).map((type) => (
                          <div
                            key={type}
                            className={`dropdown-option ${
                              filters.type === type ? "selected" : ""
                            }`}
                            onClick={() => handleFilterSelect("type", type)}
                          >
                            <span
                              className={`type-badge ${getTypeColor(type)}`}
                            >
                              {type}
                            </span>
                            <span className="count">
                              {summary.byType[type]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* By Status Filter */}
              <div className="filter-dropdown">
                <label>By Status</label>
                <div className="dropdown-container">
                  <button
                    className={`dropdown-toggle ${
                      filters.status ? "has-filter" : ""
                    }`}
                    onClick={() => toggleDropdown("status")}
                  >
                    <span>{filters.status || "All Statuses"}</span>
                    <i
                      className={`fas fa-chevron-${
                        dropdowns.status ? "up" : "down"
                      }`}
                    ></i>
                  </button>

                  {dropdowns.status && (
                    <div className="dropdown-menu">
                      <div className="search-box">
                        <i className="fas fa-search"></i>
                        <input
                          type="text"
                          placeholder="Search statuses..."
                          value={searchTerms.status}
                          onChange={(e) =>
                            handleSearchChange("status", e.target.value)
                          }
                        />
                      </div>
                      <div className="dropdown-options">
                        <div
                          className={`dropdown-option ${
                            !filters.status ? "selected" : ""
                          }`}
                          onClick={() => handleFilterSelect("status", "")}
                        >
                          <span>All Statuses</span>
                          <span className="count">
                            {summary.totalTransactions}
                          </span>
                        </div>
                        {getFilteredData(
                          Object.keys(summary.byStatus),
                          "status",
                          searchTerms.status
                        ).map((status) => (
                          <div
                            key={status}
                            className={`dropdown-option ${
                              filters.status === status ? "selected" : ""
                            }`}
                            onClick={() => handleFilterSelect("status", status)}
                          >
                            <span
                              className={`status-badge ${getStatusColor(
                                status
                              )}`}
                            >
                              {status}
                            </span>
                            <span className="count">
                              {summary.byStatus[status]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* By Phone Number Filter */}
              <div className="filter-dropdown">
                <label>By Phone Number</label>
                <div className="dropdown-container">
                  <button
                    className={`dropdown-toggle ${
                      filters.phoneNumber ? "has-filter" : ""
                    }`}
                    onClick={() => toggleDropdown("phoneNumber")}
                  >
                    <span>{filters.phoneNumber || "All Phone Numbers"}</span>
                    <i
                      className={`fas fa-chevron-${
                        dropdowns.phoneNumber ? "up" : "down"
                      }`}
                    ></i>
                  </button>

                  {dropdowns.phoneNumber && (
                    <div className="dropdown-menu">
                      <div className="search-box">
                        <i className="fas fa-search"></i>
                        <input
                          type="text"
                          placeholder="Search phone numbers..."
                          value={searchTerms.phoneNumber}
                          onChange={(e) =>
                            handleSearchChange("phoneNumber", e.target.value)
                          }
                        />
                      </div>
                      <div className="dropdown-options">
                        <div
                          className={`dropdown-option ${
                            !filters.phoneNumber ? "selected" : ""
                          }`}
                          onClick={() => handleFilterSelect("phoneNumber", "")}
                        >
                          <span>All Phone Numbers</span>
                          <span className="count">
                            {summary.totalTransactions}
                          </span>
                        </div>
                        {getFilteredData(
                          Object.keys(summary.byPhoneNumber),
                          "phoneNumber",
                          searchTerms.phoneNumber
                        ).map((phone) => (
                          <div
                            key={phone}
                            className={`dropdown-option ${
                              filters.phoneNumber === phone ? "selected" : ""
                            }`}
                            onClick={() =>
                              handleFilterSelect("phoneNumber", phone)
                            }
                          >
                            <span className="phone">{phone}</span>
                            <span className="count">
                              {summary.byPhoneNumber[phone]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="recent-transactions">
            <h3>Recent Transactions</h3>
            {getFilteredTransactions(summary.recentTransactions).length > 0 ? (
              <div className="transactions-table-container">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Date</th>
                      <th>Transaction ID</th>
                      <th>M-Pesa Receipt</th>
                      <th>Status</th>
                      <th>Phone Number</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredTransactions(summary.recentTransactions).map(
                      (txn, index) => (
                        <tr key={txn.id} className="transaction-row">
                          <td className="transaction-number">{index + 1}</td>
                          <td className="transaction-date">
                            <div className="date-main">
                              {formatDate(txn.timestamp)}
                            </div>
                            <div className="date-time">
                              {formatTime(txn.timestamp)}
                            </div>
                          </td>
                          <td className="transaction-id">
                            TXN{(index + 1).toString().padStart(3, "0")}
                          </td>
                          <td className="transaction-code">
                            {txn.data.mpesaReceiptNumber ||
                              txn.data.checkoutRequestID ||
                              "N/A"}
                          </td>
                          <td className="transaction-status">
                            <span
                              className={`status-badge ${getStatusColor(
                                txn.data.status
                              )}`}
                            >
                              {txn.data.status}
                            </span>
                          </td>
                          <td className="transaction-phone">
                            {txn.data.phoneNumber}
                          </td>
                          <td className="transaction-amount">
                            KES {txn.data.amount}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="no-data">
                {Object.values(filters).some((filter) => filter)
                  ? "No transactions match the selected filters"
                  : "No recent transactions"}
              </p>
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
              Filtered Results:{" "}
              <strong>
                {getFilteredTransactions(logs.transactions).length}
              </strong>
            </p>
            <p>
              Last Updated:{" "}
              <strong>{formatTimestamp(logs.metadata.lastUpdated)}</strong>
            </p>
          </div>

          {getFilteredTransactions(logs.transactions).length > 0 ? (
            <div className="transactions-list">
              {getFilteredTransactions(logs.transactions).map((txn) => (
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
              <p>
                {Object.values(filters).some((filter) => filter)
                  ? "No transactions match the selected filters"
                  : "No transactions found"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionLogs;
