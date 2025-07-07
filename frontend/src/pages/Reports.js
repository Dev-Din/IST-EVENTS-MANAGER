import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../App";
import Loading from "../components/Loading";
import { adminAPI } from "../services/api";
import "./Reports.css";

const Reports = () => {
  const { isAdmin } = useAuth();
  const [overviewData, setOverviewData] = useState({
    summary: { totalRevenue: 0, totalTickets: 0 },
    eventsByCategory: [],
    topEvents: [],
  });
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDateRange, setSelectedDateRange] = useState("30days");
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState("");
  const [exportFormat, setExportFormat] = useState("csv");

  // Convert frontend date range to actual dates
  const getDateRange = (range) => {
    const endDate = new Date();
    const startDate = new Date();

    switch (range) {
      case "7days":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30days":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90days":
        startDate.setDate(endDate.getDate() - 90);
        break;
      case "1year":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  };

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { startDate, endDate } = getDateRange(selectedDateRange);

      // Fetch overview and sales data in parallel
      const [overviewResponse, salesResponse] = await Promise.all([
        adminAPI.getReports({ startDate, endDate, type: "overview" }),
        adminAPI.getSalesReport(startDate, endDate),
      ]);

      setOverviewData(
        overviewResponse.data.data || {
          summary: { totalRevenue: 0, totalTickets: 0 },
          eventsByCategory: [],
          topEvents: [],
        }
      );
      setSalesData(salesResponse.data.data || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
      setError(
        error.response?.data?.message ||
          "Failed to load reports. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedDateRange]);

  useEffect(() => {
    if (!isAdmin) {
      setError("Access denied. Admin permissions required.");
      setLoading(false);
      return;
    }
    fetchReports();
  }, [isAdmin, fetchReports]);

  const handleExportReport = (type) => {
    setExportType(type);
    setShowExportModal(true);
  };

  const handleDownloadReport = async () => {
    try {
      setShowExportModal(false);
      const { startDate, endDate } = getDateRange(selectedDateRange);

      const response = await adminAPI.exportData(exportType, {
        startDate,
        endDate,
        format: exportFormat,
      });

      // Determine file extension and MIME type based on format
      const fileExtension = exportFormat === "pdf" ? "pdf" : "csv";
      const mimeType = exportFormat === "pdf" ? "application/pdf" : "text/csv";

      // Create download link for the file
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${exportType}-report-${selectedDateRange}.${fileExtension}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting report:", error);
      const errorMessage =
        error.response?.data?.message ||
        `Failed to export ${exportType} report. Please try again.`;
      alert(errorMessage);
    }
  };

  const formatCurrency = (amount) => {
    // Use KES as default since this is an East African system
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount || 0);
  };

  const formatPercentage = (value) => {
    const num = value || 0;
    return `${num > 0 ? "+" : ""}${num.toFixed(1)}%`;
  };

  if (loading) {
    return <Loading message="Loading reports..." />;
  }

  if (!isAdmin) {
    return (
      <div className="access-denied">
        <i className="fas fa-lock"></i>
        <h2>Access Denied</h2>
        <p>You need admin permissions to access this page.</p>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="container">
        <div className="page-header">
          <h1>Reports & Analytics</h1>
          <p>Comprehensive insights into your event management system</p>
        </div>

        <div className="reports-controls">
          <div className="date-range-selector">
            <label>Date Range:</label>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 3 Months</option>
              <option value="1year">Last Year</option>
            </select>
          </div>

          <div className="report-actions">
            <button
              onClick={() => handleExportReport("comprehensive")}
              className="btn btn-outline"
            >
              <i className="fas fa-download"></i>
              Export Report
            </button>
            <button onClick={fetchReports} className="btn btn-primary">
              <i className="fas fa-sync-alt"></i>
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-triangle"></i>
            {error}
            <button onClick={fetchReports} className="btn btn-sm">
              Try Again
            </button>
          </div>
        )}

        {/* Overview Cards */}
        <div className="overview-cards">
          <div className="overview-card">
            <div className="card-icon events">
              <i className="fas fa-calendar"></i>
            </div>
            <div className="card-content">
              <h3>{overviewData.summary.totalEvents || 0}</h3>
              <p>Total Events</p>
              <span className="card-trend positive">
                <i className="fas fa-arrow-up"></i>
                {overviewData.summary.activeEvents || 0} active
              </span>
            </div>
          </div>

          <div className="overview-card">
            <div className="card-icon tickets">
              <i className="fas fa-ticket-alt"></i>
            </div>
            <div className="card-content">
              <h3>{overviewData.summary.totalTickets || 0}</h3>
              <p>Tickets Sold</p>
              <span className="card-trend positive">
                <i className="fas fa-arrow-up"></i>
                Avg:{" "}
                {formatCurrency(overviewData.summary.averageTicketPrice || 0)}
              </span>
            </div>
          </div>

          <div className="overview-card">
            <div className="card-icon revenue">
              <i className="fas fa-dollar-sign"></i>
            </div>
            <div className="card-content">
              <h3>{formatCurrency(overviewData.summary.totalRevenue || 0)}</h3>
              <p>Total Revenue</p>
              <span className="card-trend positive">
                <i className="fas fa-arrow-up"></i>
                {formatPercentage(overviewData.summary.monthlyGrowth || 0)}
              </span>
            </div>
          </div>

          <div className="overview-card">
            <div className="card-icon users">
              <i className="fas fa-users"></i>
            </div>
            <div className="card-content">
              <h3>{overviewData.summary.activeUsers || 0}</h3>
              <p>Active Users</p>
              <span className="card-trend positive">
                <i className="fas fa-arrow-up"></i>
                {overviewData.summary.newUsers || 0} new
              </span>
            </div>
          </div>
        </div>

        <div className="reports-content">
          {/* Top Events */}
          <div className="report-section">
            <div className="section-header">
              <h2>Top Performing Events</h2>
              <button
                onClick={() => handleExportReport("events")}
                className="btn btn-sm btn-outline"
              >
                Export
              </button>
            </div>
            <div className="top-events-list">
              {overviewData.topEvents?.map((event, index) => (
                <div
                  key={event._id || index}
                  className="event-performance-item"
                >
                  <div className="event-rank">#{index + 1}</div>
                  <div className="event-details">
                    <h4>{event.name}</h4>
                    <div className="event-stats">
                      <span className="stat">
                        <i className="fas fa-ticket-alt"></i>
                        {event.ticketsSold || 0} tickets
                      </span>
                      <span className="stat">
                        <i className="fas fa-dollar-sign"></i>
                        {formatCurrency(event.revenue || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="event-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(
                            (event.ticketsSold / (event.capacity || 1)) * 100,
                            100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              )) || (
                <div className="empty-state">
                  <p>No events data available for the selected period</p>
                </div>
              )}
            </div>
          </div>

          {/* Revenue by Category */}
          <div className="report-section">
            <div className="section-header">
              <h2>Events by Category</h2>
              <button
                onClick={() => handleExportReport("revenue")}
                className="btn btn-sm btn-outline"
              >
                Export
              </button>
            </div>
            <div className="revenue-breakdown">
              {overviewData.eventsByCategory?.map((category, index) => {
                const maxCount = Math.max(
                  ...overviewData.eventsByCategory.map((c) => c.count)
                );
                return (
                  <div key={category._id || index} className="revenue-category">
                    <div className="category-info">
                      <span className="category-name">
                        {category._id || "Uncategorized"}
                      </span>
                      <span className="category-amount">
                        {category.count} events
                      </span>
                    </div>
                    <div className="category-bar">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${(category.count / maxCount) * 100}%`,
                          backgroundColor: `hsl(${index * 120}, 60%, 50%)`,
                        }}
                      ></div>
                    </div>
                    <div className="category-percentage">
                      {(
                        (category.count /
                          overviewData.eventsByCategory.reduce(
                            (sum, c) => sum + c.count,
                            0
                          )) *
                        100
                      ).toFixed(1)}
                      %
                    </div>
                  </div>
                );
              }) || (
                <div className="empty-state">
                  <p>No category data available for the selected period</p>
                </div>
              )}
            </div>
          </div>

          {/* Sales Trend */}
          <div className="report-section">
            <div className="section-header">
              <h2>Sales Trend</h2>
              <button
                onClick={() => handleExportReport("sales")}
                className="btn btn-sm btn-outline"
              >
                Export
              </button>
            </div>
            <div className="sales-chart">
              {salesData && salesData.length > 0 ? (
                <div className="chart-container">
                  <div className="chart-bars">
                    {salesData.map((dayData, index) => {
                      const maxSales = Math.max(
                        ...salesData.map((d) => d.totalSales)
                      );
                      const height =
                        maxSales > 0
                          ? (dayData.totalSales / maxSales) * 100
                          : 0;

                      return (
                        <div
                          key={dayData._id || index}
                          className="chart-bar-item"
                        >
                          <div
                            className="chart-bar"
                            style={{ height: `${height}%` }}
                            title={`${dayData._id}: ${formatCurrency(
                              dayData.totalSales
                            )} (${dayData.ticketCount} tickets)`}
                          ></div>
                          <div className="chart-label">
                            {new Date(dayData._id).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="chart-summary">
                    <p>
                      Total sales in period:{" "}
                      {formatCurrency(
                        salesData.reduce((sum, d) => sum + d.totalSales, 0)
                      )}
                    </p>
                    <p>
                      Total tickets sold:{" "}
                      {salesData.reduce((sum, d) => sum + d.ticketCount, 0)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="chart-placeholder">
                  <i className="fas fa-chart-line"></i>
                  <p>No sales data available for the selected period</p>
                  <p className="chart-note">
                    Sales data will appear here once tickets are purchased
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="report-section">
            <div className="section-header">
              <h2>Key Metrics</h2>
            </div>
            <div className="metrics-grid">
              <div className="metric-item">
                <div className="metric-icon">
                  <i className="fas fa-shopping-cart"></i>
                </div>
                <div className="metric-content">
                  <h4>Average Order Value</h4>
                  <span className="metric-value">
                    {formatCurrency(
                      overviewData.summary.averageOrderValue || 0
                    )}
                  </span>
                </div>
              </div>

              <div className="metric-item">
                <div className="metric-icon">
                  <i className="fas fa-user-plus"></i>
                </div>
                <div className="metric-content">
                  <h4>User Growth Rate</h4>
                  <span className="metric-value">
                    {formatPercentage(overviewData.summary.userGrowth || 0)}
                  </span>
                </div>
              </div>

              <div className="metric-item">
                <div className="metric-icon">
                  <i className="fas fa-calendar-check"></i>
                </div>
                <div className="metric-content">
                  <h4>Upcoming Events</h4>
                  <span className="metric-value">
                    {overviewData.summary.upcomingEvents || 0}
                  </span>
                </div>
              </div>

              <div className="metric-item">
                <div className="metric-icon">
                  <i className="fas fa-chart-bar"></i>
                </div>
                <div className="metric-content">
                  <h4>Revenue Growth</h4>
                  <span className="metric-value">
                    {formatPercentage(overviewData.summary.monthlyGrowth || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Export Format Selection Modal */}
        {showExportModal && (
          <div className="modal-overlay">
            <div className="modal export-modal">
              <div className="modal-header">
                <h3>Export {exportType} Report</h3>
                <button
                  className="modal-close"
                  onClick={() => setShowExportModal(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="modal-body">
                <div className="format-selection">
                  <h4>Choose Export Format:</h4>

                  <div className="format-options">
                    <label className="format-option">
                      <input
                        type="radio"
                        name="exportFormat"
                        value="csv"
                        checked={exportFormat === "csv"}
                        onChange={(e) => setExportFormat(e.target.value)}
                      />
                      <div className="format-card">
                        <i className="fas fa-file-csv"></i>
                        <div className="format-info">
                          <h5>CSV File</h5>
                          <p>
                            Spreadsheet format, easy to import into Excel or
                            Google Sheets
                          </p>
                        </div>
                      </div>
                    </label>

                    <label className="format-option">
                      <input
                        type="radio"
                        name="exportFormat"
                        value="pdf"
                        checked={exportFormat === "pdf"}
                        onChange={(e) => setExportFormat(e.target.value)}
                      />
                      <div className="format-card">
                        <i className="fas fa-file-pdf"></i>
                        <div className="format-info">
                          <h5>PDF Document</h5>
                          <p>
                            Professional report with LegitEvents branding and
                            formatting
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="date-range-info">
                  <p>
                    <strong>Date Range:</strong> {selectedDateRange}
                  </p>
                  <p>
                    <strong>Report Type:</strong> {exportType}
                  </p>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-outline"
                  onClick={() => setShowExportModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleDownloadReport}
                >
                  <i className="fas fa-download"></i>
                  Download {exportFormat.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
