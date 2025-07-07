import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../App";
import Loading from "../components/Loading";
import { adminAPI, eventsAPI } from "../services/api";
import "./Dashboard.css";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalClients: 0,
    totalSubAdmins: 0,
    totalRevenue: 0,
    recentEvents: [],
    recentTickets: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch dashboard stats (this would be a single endpoint in real app)
      const [statsResponse, eventsResponse] = await Promise.all([
        adminAPI.getDashboardStats().catch(() => ({ data: {} })),
        eventsAPI.getAll().catch(() => ({ data: { events: [] } })),
      ]);

      setStats({
        totalEvents: eventsResponse.data.events?.length || 0,
        totalClients: statsResponse.data.totalClients || 0,
        totalSubAdmins: statsResponse.data.totalSubAdmins || 0,
        totalRevenue: statsResponse.data.totalRevenue || 0,
        recentEvents: eventsResponse.data.events?.slice(0, 5) || [],
        recentTickets: statsResponse.data.recentTickets || [],
      });

      setError("");
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return <Loading message="Loading dashboard..." />;
  }

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header">
          <h1>Admin Dashboard</h1>
          <p>Welcome back, {user?.username}! Here's your system overview.</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-triangle"></i>
            {error}
            <button onClick={fetchDashboardData} className="btn btn-sm">
              Try Again
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon events">
              <i className="fas fa-calendar"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.totalEvents}</h3>
              <p>Total Events</p>
            </div>
            <Link to="/admin/events" className="stat-link">
              View Events <i className="fas fa-arrow-right"></i>
            </Link>
          </div>

          <div className="stat-card">
            <div className="stat-icon users">
              <i className="fas fa-users-cog"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.totalSubAdmins}</h3>
              <p>Sub Admins</p>
            </div>
            <Link to="/admin/sub-admins" className="stat-link">
              Manage <i className="fas fa-arrow-right"></i>
            </Link>
          </div>

          <div className="stat-card">
            <div className="stat-icon clients">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.totalClients}</h3>
              <p>Clients</p>
            </div>
            <Link to="/admin/clients" className="stat-link">
              View Clients <i className="fas fa-arrow-right"></i>
            </Link>
          </div>

          <div className="stat-card">
            <div className="stat-icon revenue">
              <i className="fas fa-dollar-sign"></i>
            </div>
            <div className="stat-content">
              <h3>{formatPrice(stats.totalRevenue)}</h3>
              <p>Total Revenue</p>
            </div>
            <Link to="/admin/reports" className="stat-link">
              View Reports <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
        </div>

        <div className="dashboard-content">
          {/* Recent Events */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>Recent Events</h2>
              <Link to="/admin/events" className="btn btn-outline btn-sm">
                View All
              </Link>
            </div>

            {stats.recentEvents.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-calendar-plus"></i>
                <p>No events yet. Create your first event!</p>
                <Link to="/admin/events" className="btn btn-primary">
                  Create Event
                </Link>
              </div>
            ) : (
              <div className="events-list">
                {stats.recentEvents.map((event) => (
                  <div key={event._id} className="event-item">
                    <div className="event-info">
                      <h4>{event.name}</h4>
                      <p className="event-details">
                        <i className="fas fa-calendar"></i>
                        {formatDate(event.date)}
                        <span className="separator">•</span>
                        <i className="fas fa-map-marker-alt"></i>
                        {event.location}
                        <span className="separator">•</span>
                        <i className="fas fa-dollar-sign"></i>
                        {formatPrice(event.charges)}
                      </p>
                    </div>
                    <div className="event-actions">
                      <Link
                        to={`/events/${event._id}`}
                        className="btn btn-outline btn-sm"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>Quick Actions</h2>
            </div>

            <div className="quick-actions">
              <Link to="/admin/events" className="action-card">
                <div className="action-icon">
                  <i className="fas fa-plus"></i>
                </div>
                <div className="action-content">
                  <h4>Create Event</h4>
                  <p>Add a new event to the system</p>
                </div>
              </Link>

              <Link to="/admin/sub-admins" className="action-card">
                <div className="action-icon">
                  <i className="fas fa-user-plus"></i>
                </div>
                <div className="action-content">
                  <h4>Add Sub Admin</h4>
                  <p>Create a new sub-admin account</p>
                </div>
              </Link>

              <Link to="/admin/reports" className="action-card">
                <div className="action-icon">
                  <i className="fas fa-download"></i>
                </div>
                <div className="action-content">
                  <h4>Generate Report</h4>
                  <p>Download CSV or PDF reports</p>
                </div>
              </Link>

              <Link to="/admin/clients" className="action-card">
                <div className="action-icon">
                  <i className="fas fa-users"></i>
                </div>
                <div className="action-content">
                  <h4>Manage Clients</h4>
                  <p>View and manage client accounts</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
