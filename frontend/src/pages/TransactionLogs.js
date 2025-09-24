import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { paymentsAPI } from "../services/api";
import { formatDate, formatTime } from "../utils/dateFormatter";
import "./TransactionLogs.css";

const TransactionLogs = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    phoneNumber: "",
    dateRange: "",
  });

  // Dropdown states
  const [dropdowns, setDropdowns] = useState({
    type: false,
    status: false,
    phoneNumber: false,
    dateRange: false,
  });

  // Search states
  const [searchTerms, setSearchTerms] = useState({
    type: "",
    status: "",
    phoneNumber: "",
    dateRange: "",
  });

  // Custom date range states
  const [customDateRange, setCustomDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const response = await paymentsAPI.getTransactionSummary();
      setSummary(response.data.data);
    } catch (error) {
      console.error("Error fetching summary:", error);
      toast.error("Failed to fetch transaction summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

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
      dateRange: "",
    });
    setSearchTerms({
      type: "",
      status: "",
      phoneNumber: "",
      dateRange: "",
    });
    setCustomDateRange({
      startDate: "",
      endDate: "",
    });
  };

  const handleCustomDateChange = (field, value) => {
    setCustomDateRange((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Auto-apply custom filter when both dates are selected
    if (field === "endDate" && value && customDateRange.startDate) {
      setFilters((prev) => ({
        ...prev,
        dateRange: "custom",
      }));
    }
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

      // Date filtering
      let dateMatch = true;
      if (filters.dateRange) {
        const transactionDate = new Date(txn.timestamp);
        const today = new Date();

        switch (filters.dateRange) {
          case "today":
            dateMatch = transactionDate.toDateString() === today.toDateString();
            break;
          case "yesterday":
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            dateMatch =
              transactionDate.toDateString() === yesterday.toDateString();
            break;
          case "last7days":
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            dateMatch = transactionDate >= weekAgo;
            break;
          case "last30days":
            const monthAgo = new Date(today);
            monthAgo.setDate(monthAgo.getDate() - 30);
            dateMatch = transactionDate >= monthAgo;
            break;
          case "custom":
            if (customDateRange.startDate && customDateRange.endDate) {
              const startDate = new Date(customDateRange.startDate);
              const endDate = new Date(customDateRange.endDate);
              // Set end date to end of day
              endDate.setHours(23, 59, 59, 999);
              dateMatch =
                transactionDate >= startDate && transactionDate <= endDate;
            } else {
              dateMatch = true;
            }
            break;
          default:
            dateMatch = true;
        }
      }

      return typeMatch && statusMatch && phoneMatch && dateMatch;
    });
  };

  // Download functions
  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const response = await paymentsAPI.exportPDF();

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `legitevents-transactions-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      setDownloading(true);
      const response = await paymentsAPI.exportCSV();

      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `legitevents-transactions-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("CSV downloaded successfully!");
    } catch (error) {
      console.error("Error downloading CSV:", error);
      toast.error("Failed to download CSV");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="transaction-logs">
      <div className="logs-header">
        <h1>M-Pesa Transaction Logs</h1>
        <div className="download-buttons">
          <button
            className="download-btn pdf-btn"
            onClick={handleDownloadPDF}
            disabled={downloading}
          >
            <i className="fas fa-file-pdf"></i>
            {downloading ? "Generating..." : "Download PDF"}
          </button>
          <button
            className="download-btn csv-btn"
            onClick={handleDownloadCSV}
            disabled={downloading}
          >
            <i className="fas fa-file-csv"></i>
            {downloading ? "Generating..." : "Download CSV"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading transaction data...</p>
        </div>
      )}

      {summary && (
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
              {/* By Date Filter - MOVED TO FIRST */}
              <div className="filter-dropdown">
                <label>By Date</label>
                <div className="dropdown-container">
                  <button
                    className={`dropdown-toggle ${
                      filters.dateRange ? "has-filter" : ""
                    }`}
                    onClick={() => toggleDropdown("dateRange")}
                  >
                    <span>
                      {filters.dateRange === "custom" &&
                      customDateRange.startDate &&
                      customDateRange.endDate
                        ? `${formatDate(
                            customDateRange.startDate
                          )} - ${formatDate(customDateRange.endDate)}`
                        : filters.dateRange || "All Dates"}
                    </span>
                    <i
                      className={`fas fa-chevron-${
                        dropdowns.dateRange ? "up" : "down"
                      }`}
                    ></i>
                  </button>

                  {dropdowns.dateRange && (
                    <div className="dropdown-menu">
                      <div className="dropdown-options">
                        <div
                          className={`dropdown-option ${
                            !filters.dateRange ? "selected" : ""
                          }`}
                          onClick={() => handleFilterSelect("dateRange", "")}
                        >
                          <span>All Dates</span>
                          <span className="count">
                            {summary.totalTransactions}
                          </span>
                        </div>
                        <div
                          className={`dropdown-option ${
                            filters.dateRange === "today" ? "selected" : ""
                          }`}
                          onClick={() =>
                            handleFilterSelect("dateRange", "today")
                          }
                        >
                          <span>Today</span>
                          <span className="count">
                            {
                              summary.recentTransactions.filter((txn) => {
                                const transactionDate = new Date(txn.timestamp);
                                const today = new Date();
                                return (
                                  transactionDate.toDateString() ===
                                  today.toDateString()
                                );
                              }).length
                            }
                          </span>
                        </div>
                        <div
                          className={`dropdown-option ${
                            filters.dateRange === "yesterday" ? "selected" : ""
                          }`}
                          onClick={() =>
                            handleFilterSelect("dateRange", "yesterday")
                          }
                        >
                          <span>Yesterday</span>
                          <span className="count">
                            {
                              summary.recentTransactions.filter((txn) => {
                                const transactionDate = new Date(txn.timestamp);
                                const yesterday = new Date();
                                yesterday.setDate(yesterday.getDate() - 1);
                                return (
                                  transactionDate.toDateString() ===
                                  yesterday.toDateString()
                                );
                              }).length
                            }
                          </span>
                        </div>
                        <div
                          className={`dropdown-option ${
                            filters.dateRange === "last7days" ? "selected" : ""
                          }`}
                          onClick={() =>
                            handleFilterSelect("dateRange", "last7days")
                          }
                        >
                          <span>Last 7 Days</span>
                          <span className="count">
                            {
                              summary.recentTransactions.filter((txn) => {
                                const transactionDate = new Date(txn.timestamp);
                                const weekAgo = new Date();
                                weekAgo.setDate(weekAgo.getDate() - 7);
                                return transactionDate >= weekAgo;
                              }).length
                            }
                          </span>
                        </div>
                        <div
                          className={`dropdown-option ${
                            filters.dateRange === "last30days" ? "selected" : ""
                          }`}
                          onClick={() =>
                            handleFilterSelect("dateRange", "last30days")
                          }
                        >
                          <span>Last 30 Days</span>
                          <span className="count">
                            {
                              summary.recentTransactions.filter((txn) => {
                                const transactionDate = new Date(txn.timestamp);
                                const monthAgo = new Date();
                                monthAgo.setDate(monthAgo.getDate() - 30);
                                return transactionDate >= monthAgo;
                              }).length
                            }
                          </span>
                        </div>
                        <div
                          className={`dropdown-option ${
                            filters.dateRange === "custom" ? "selected" : ""
                          }`}
                          onClick={() =>
                            handleFilterSelect("dateRange", "custom")
                          }
                        >
                          <span>Custom Dates</span>
                          <span className="count">
                            {customDateRange.startDate &&
                            customDateRange.endDate
                              ? summary.recentTransactions.filter((txn) => {
                                  const transactionDate = new Date(
                                    txn.timestamp
                                  );
                                  const startDate = new Date(
                                    customDateRange.startDate
                                  );
                                  const endDate = new Date(
                                    customDateRange.endDate
                                  );
                                  endDate.setHours(23, 59, 59, 999);
                                  return (
                                    transactionDate >= startDate &&
                                    transactionDate <= endDate
                                  );
                                }).length
                              : "Select dates"}
                          </span>
                        </div>
                      </div>

                      {/* Custom Date Range Picker */}
                      {filters.dateRange === "custom" && (
                        <div className="custom-date-range">
                          <div className="date-inputs">
                            <div className="date-input-group">
                              <label>From:</label>
                              <input
                                type="date"
                                value={customDateRange.startDate}
                                onChange={(e) =>
                                  handleCustomDateChange(
                                    "startDate",
                                    e.target.value
                                  )
                                }
                                max={new Date().toISOString().split("T")[0]}
                              />
                            </div>
                            <div className="date-input-group">
                              <label>To:</label>
                              <input
                                type="date"
                                value={customDateRange.endDate}
                                onChange={(e) =>
                                  handleCustomDateChange(
                                    "endDate",
                                    e.target.value
                                  )
                                }
                                min={customDateRange.startDate || undefined}
                                max={new Date().toISOString().split("T")[0]}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

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
    </div>
  );
};

export default TransactionLogs;
