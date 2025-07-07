import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import Loading from "../components/Loading";
import { adminAPI } from "../services/api";
import "./Reports.css";

const Reports = () => {
  const { user, isAdmin } = useAuth();
  const [reports, setReports] = useState({
    eventSummary: {},
    ticketSales: {},
    userActivity: {},
    revenue: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDateRange, setSelectedDateRange] = useState("30days");
  const [selectedReportType, setSelectedReportType] = useState("overview");

  useEffect(() => {
    if (!isAdmin) {
      setError("Access denied. Admin permissions required.");
      setLoading(false);
      return;
    }
    fetchReports();
  }, [isAdmin, selectedDateRange]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getReports(selectedDateRange);
      setReports(response.data.reports || {});
      setError("");
    } catch (error) {
      console.error("Error fetching reports:", error);
      setError("Failed to load reports");
      // Mock data for demo purposes
      setReports({
        eventSummary: {
          totalEvents: 15,
          activeEvents: 8,
          upcomingEvents: 5,
          pastEvents: 10,
          topEvents: [
            { name: "Tech Conference 2024", tickets: 450, revenue: 22500 },
            { name: "Music Festival", tickets: 320, revenue: 19200 },
            { name: "Food & Wine Expo", tickets: 280, revenue: 14000 },
          ],
        },
        ticketSales: {
          totalTickets: 1250,
          totalRevenue: 65700,
          averageTicketPrice: 52.56,
          salesByDate: [
            { date: "2024-01-20", sales: 45 },
            { date: "2024-01-21", sales: 67 },
            { date: "2024-01-22", sales: 89 },
            { date: "2024-01-23", sales: 112 },
            { date: "2024-01-24", sales: 95 },
          ],
        },
        userActivity: {
          totalUsers: 892,
          newUsers: 48,
          activeUsers: 324,
          userGrowth: 12.5,
        },
        revenue: {
          totalRevenue: 65700,
          monthlyGrowth: 18.3,
          averageOrderValue: 87.5,
          revenueByCategory: [
            { category: "Conferences", amount: 35000 },
            { category: "Entertainment", amount: 20000 },
            { category: "Workshops", amount: 10700 },
          ],
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = (type) => {
    // In a real app, this would trigger a download
    alert(`Exporting ${type} report... (Feature not implemented in demo)`);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
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
              <h3>{reports.eventSummary?.totalEvents || 0}</h3>
              <p>Total Events</p>
              <span className="card-trend positive">
                <i className="fas fa-arrow-up"></i>
                {reports.eventSummary?.activeEvents || 0} active
              </span>
            </div>
          </div>

          <div className="overview-card">
            <div className="card-icon tickets">
              <i className="fas fa-ticket-alt"></i>
            </div>
            <div className="card-content">
              <h3>{reports.ticketSales?.totalTickets || 0}</h3>
              <p>Tickets Sold</p>
              <span className="card-trend positive">
                <i className="fas fa-arrow-up"></i>
                Avg:{" "}
                {formatCurrency(reports.ticketSales?.averageTicketPrice || 0)}
              </span>
            </div>
          </div>

          <div className="overview-card">
            <div className="card-icon revenue">
              <i className="fas fa-dollar-sign"></i>
            </div>
            <div className="card-content">
              <h3>{formatCurrency(reports.revenue?.totalRevenue || 0)}</h3>
              <p>Total Revenue</p>
              <span className="card-trend positive">
                <i className="fas fa-arrow-up"></i>
                {formatPercentage(reports.revenue?.monthlyGrowth || 0)}
              </span>
            </div>
          </div>

          <div className="overview-card">
            <div className="card-icon users">
              <i className="fas fa-users"></i>
            </div>
            <div className="card-content">
              <h3>{reports.userActivity?.activeUsers || 0}</h3>
              <p>Active Users</p>
              <span className="card-trend positive">
                <i className="fas fa-arrow-up"></i>
                {reports.userActivity?.newUsers || 0} new
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
              {reports.eventSummary?.topEvents?.map((event, index) => (
                <div key={index} className="event-performance-item">
                  <div className="event-rank">#{index + 1}</div>
                  <div className="event-details">
                    <h4>{event.name}</h4>
                    <div className="event-stats">
                      <span className="stat">
                        <i className="fas fa-ticket-alt"></i>
                        {event.tickets} tickets
                      </span>
                      <span className="stat">
                        <i className="fas fa-dollar-sign"></i>
                        {formatCurrency(event.revenue)}
                      </span>
                    </div>
                  </div>
                  <div className="event-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${(event.tickets / 500) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="report-section">
            <div className="section-header">
              <h2>Revenue by Category</h2>
              <button
                onClick={() => handleExportReport("revenue")}
                className="btn btn-sm btn-outline"
              >
                Export
              </button>
            </div>
            <div className="revenue-breakdown">
              {reports.revenue?.revenueByCategory?.map((category, index) => (
                <div key={index} className="revenue-category">
                  <div className="category-info">
                    <span className="category-name">{category.category}</span>
                    <span className="category-amount">
                      {formatCurrency(category.amount)}
                    </span>
                  </div>
                  <div className="category-bar">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${
                          (category.amount / reports.revenue.totalRevenue) * 100
                        }%`,
                        backgroundColor: `hsl(${index * 120}, 60%, 50%)`,
                      }}
                    ></div>
                  </div>
                  <div className="category-percentage">
                    {(
                      (category.amount / reports.revenue.totalRevenue) *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                </div>
              ))}
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
              <div className="chart-placeholder">
                <i className="fas fa-chart-line"></i>
                <p>Sales trend visualization would appear here</p>
                <p className="chart-note">
                  Total sales over the last {selectedDateRange}:{" "}
                  {reports.ticketSales?.totalTickets || 0} tickets
                </p>
              </div>
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
                    {formatCurrency(reports.revenue?.averageOrderValue || 0)}
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
                    {formatPercentage(reports.userActivity?.userGrowth || 0)}
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
                    {reports.eventSummary?.upcomingEvents || 0}
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
                    {formatPercentage(reports.revenue?.monthlyGrowth || 0)}
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
