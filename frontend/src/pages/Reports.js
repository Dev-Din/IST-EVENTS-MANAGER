import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import Loading from "../components/Loading";
import DownloadButton from "../components/DownloadButton";
import { adminAPI } from "../services/api";
import "./Reports.css";

const Reports = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [overviewData, setOverviewData] = useState({
    summary: { totalRevenue: 0, totalTickets: 0 },
    eventsByCategory: [],
    topEvents: [],
  });
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDateRange, setSelectedDateRange] = useState("30days");

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

  const handleDownloadReport = async (format) => {
    try {
      const { startDate, endDate } = getDateRange(selectedDateRange);
      const downloadFormat = format || "csv";

      const response = await adminAPI.exportData("tickets", {
        startDate,
        endDate,
        format: downloadFormat,
      });

      // Check if response is valid
      if (!response.data) {
        throw new Error("No data received from server");
      }

      // Check if response is actually an error (empty blob or very small size might indicate error)
      if (response.data instanceof Blob && response.data.size < 100) {
        // Small blob might be an error message, check content type
        const contentType = response.headers["content-type"] || "";
        if (contentType.includes("application/json") || contentType.includes("text")) {
          const text = await response.data.text();
          try {
            const errorData = JSON.parse(text);
            throw new Error(errorData.message || errorData.error || "Failed to generate report");
          } catch (parseError) {
            // Not JSON, might be text error
            if (text.includes("error") || text.includes("Error") || text.includes("failed")) {
              throw new Error(text);
            }
          }
        }
      }

      // Determine file extension and MIME type based on format
      const fileExtension = format === "pdf" ? "pdf" : "csv";
      const mimeType = format === "pdf" ? "application/pdf" : "text/csv";

      // Ensure response.data is a Blob
      const blob = response.data instanceof Blob 
        ? response.data 
        : new Blob([response.data], { type: mimeType });

      // Create download link for the file
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `tickets-report-${selectedDateRange}.${fileExtension}`
      );
      document.body.appendChild(link);
      link.click();
      
      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error("Error exporting report:", error);
      let errorMessage = `Failed to export tickets report. Please try again.`;
      
      // Try to extract error message
      if (error.response?.data) {
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const errorData = JSON.parse(text);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
            // Not JSON, check if it's a text error
            if (typeof error.response.data === "string") {
              errorMessage = error.response.data;
            }
          }
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (typeof error.response.data === "string") {
          errorMessage = error.response.data;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
          <h1 className="creative-header">Reports & Analytics</h1>
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
            <DownloadButton
              onDownloadCSV={() => handleDownloadReport("csv")}
              onDownloadPDF={() => handleDownloadReport("pdf")}
            />
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
              <i className="fas fa-money-bill-wave"></i>
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

          <div
            className="overview-card clickable"
            onClick={() => navigate("/admin/transaction-logs")}
          >
            <div className="card-icon transactions">
              <i className="fas fa-receipt"></i>
            </div>
            <div className="card-content">
              <h3>View</h3>
              <p>Transaction Logs</p>
              <span className="card-trend positive">
                <i className="fas fa-external-link-alt"></i>
                M-Pesa Payments
              </span>
            </div>
          </div>
        </div>

        <div className="reports-content">
          {/* Top Events */}
          <div className="report-section">
              <div className="section-header">
                <h2>Top Performing Events</h2>
              </div>
            <div className="top-events-list">
              {overviewData.topEvents?.map((event, index) => (
                <div
                  key={event._id || index}
                  className="event-performance-item"
                >
                  <div className="event-rank">#{index + 1}</div>
                  <div className="event-details">
                    <h4>{event.title}</h4>
                    <div className="event-stats">
                      <span className="stat">
                        <i className="fas fa-ticket-alt"></i>
                        {event.ticketsSold || 0} tickets
                      </span>
                      <span className="stat">
                        <i className="fas fa-money-bill-wave"></i>
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
      </div>
    </div>
  );
};

export default Reports;
