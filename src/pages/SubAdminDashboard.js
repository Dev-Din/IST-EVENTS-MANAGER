import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../App";
import Loading from "../components/Loading";
import { eventsAPI } from "../services/api";
import "./Dashboard.css";

const SubAdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalEvents: 0,
    myEvents: 0,
    totalTickets: 0,
    recentEvents: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch events (in real app, this would be filtered to sub-admin's events)
      const eventsResponse = await eventsAPI
        .getAll()
        .catch(() => ({ data: { events: [] } }));

      setStats({
        totalEvents: eventsResponse.data.events?.length || 0,
        myEvents: eventsResponse.data.events?.length || 0, // In real app, filter by creator
        totalTickets: 0, // Would be calculated from actual ticket sales
        recentEvents: eventsResponse.data.events?.slice(0, 5) || [],
      });

      setError("");
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  if (loading) {
    return <Loading message="Loading dashboard..." />;
  }

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header">
          <h1>Sub-Admin Dashboard</h1>
          <p>
            Welcome back, {user?.username}! Manage your events and track
            performance.
          </p>
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
              <h3>{stats.myEvents}</h3>
              <p>My Events</p>
            </div>
            <Link to="/admin/events" className="stat-link">
              Manage Events <i className="fas fa-arrow-right"></i>
            </Link>
          </div>

          <div className="stat-card">
            <div className="stat-icon clients">
              <i className="fas fa-ticket-alt"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.totalTickets}</h3>
              <p>Tickets Sold</p>
            </div>
            <span className="stat-link">
              View Details <i className="fas fa-arrow-right"></i>
            </span>
          </div>

          <div className="stat-card">
            <div className="stat-icon revenue">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="stat-content">
              <h3>$0</h3>
              <p>Revenue</p>
            </div>
            <span className="stat-link">
              View Reports <i className="fas fa-arrow-right"></i>
            </span>
          </div>

          <div className="stat-card">
            <div className="stat-icon users">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-content">
              <h3>0</h3>
              <p>Attendees</p>
            </div>
            <span className="stat-link">
              View All <i className="fas fa-arrow-right"></i>
            </span>
          </div>
        </div>

        <div className="dashboard-content">
          {/* Recent Events */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>My Recent Events</h2>
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
                        {formatPrice(event.price)}
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

              <Link to="/admin/events" className="action-card">
                <div className="action-icon">
                  <i className="fas fa-edit"></i>
                </div>
                <div className="action-content">
                  <h4>Manage Events</h4>
                  <p>Edit your existing events</p>
                </div>
              </Link>

              <div
                className="action-card"
                style={{ opacity: 0.6, cursor: "not-allowed" }}
              >
                <div className="action-icon">
                  <i className="fas fa-chart-bar"></i>
                </div>
                <div className="action-content">
                  <h4>View Analytics</h4>
                  <p>Track event performance</p>
                </div>
              </div>

              <div
                className="action-card"
                style={{ opacity: 0.6, cursor: "not-allowed" }}
              >
                <div className="action-icon">
                  <i className="fas fa-download"></i>
                </div>
                <div className="action-content">
                  <h4>Export Data</h4>
                  <p>Download attendance reports</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubAdminDashboard;
