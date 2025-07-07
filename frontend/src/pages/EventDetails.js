import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../App";
import Loading from "../components/Loading";
import { eventsAPI } from "../services/api";
import "./EventDetails.css";

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEvent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await eventsAPI.getById(id);
      setEvent(response.data.event);
      setError("");
    } catch (error) {
      console.error("Error fetching event:", error);
      if (error.response?.status === 404) {
        setError("Event not found");
      } else {
        setError("Failed to load event details. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const handlePurchase = () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: `/purchase/${id}` } } });
      return;
    }
    navigate(`/purchase/${id}`);
  };

  if (loading) {
    return <Loading message="Loading event details..." />;
  }

  if (error) {
    return (
      <div className="error-page">
        <div className="error-content">
          <i className="fas fa-exclamation-triangle"></i>
          <h2>Oops! Something went wrong</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={fetchEvent} className="btn btn-primary">
              Try Again
            </button>
            <Link to="/" className="btn btn-outline">
              Back to Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="error-page">
        <div className="error-content">
          <i className="fas fa-calendar-times"></i>
          <h2>Event Not Found</h2>
          <p>The event you're looking for doesn't exist or has been removed.</p>
          <Link to="/" className="btn btn-primary">
            Browse Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="event-details-page">
      <div className="container">
        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <Link to="/">Events</Link>
          <span className="separator">/</span>
          <span className="current">{event.name}</span>
        </nav>

        <div className="event-details-content">
          {/* Event Header */}
          <div className="event-header">
            <h1 className="event-title">{event.name}</h1>
            <div className="event-meta">
              <span className="price">{formatPrice(event.charges)}</span>
              {event.createdBy && (
                <span className="organizer">
                  by {event.createdBy.username || "Organizer"}
                </span>
              )}
            </div>
          </div>

          <div className="event-details-grid">
            {/* Event Info */}
            <div className="event-info-section">
              <div className="info-cards">
                <div className="info-card">
                  <div className="info-icon">
                    <i className="fas fa-calendar"></i>
                  </div>
                  <div className="info-content">
                    <h3>Date & Time</h3>
                    <p>{formatDate(event.date)}</p>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-icon">
                    <i className="fas fa-map-marker-alt"></i>
                  </div>
                  <div className="info-content">
                    <h3>Location</h3>
                    <p>{event.location}</p>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-icon">
                    <i className="fas fa-ticket-alt"></i>
                  </div>
                  <div className="info-content">
                    <h3>Ticket Price</h3>
                    <p>{formatPrice(event.charges)}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {event.description && (
                <div className="event-description-section">
                  <h2>About This Event</h2>
                  <div className="event-description">
                    <p>{event.description}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Booking Section */}
            <div className="booking-section">
              <div className="booking-card">
                <div className="booking-header">
                  <h3>Book Your Ticket</h3>
                  <div className="price-display">
                    <span className="price">{formatPrice(event.charges)}</span>
                    <span className="price-label">per ticket</span>
                  </div>
                </div>

                <div className="booking-info">
                  <div className="booking-item">
                    <i className="fas fa-calendar"></i>
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="booking-item">
                    <i className="fas fa-map-marker-alt"></i>
                    <span>{event.location}</span>
                  </div>
                </div>

                <div className="booking-actions">
                  {isAuthenticated ? (
                    <button
                      className="btn btn-primary btn-full btn-lg"
                      onClick={handlePurchase}
                    >
                      <i className="fas fa-shopping-cart"></i>
                      Buy Ticket Now
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn btn-primary btn-full btn-lg"
                        onClick={handlePurchase}
                      >
                        <i className="fas fa-sign-in-alt"></i>
                        Login to Buy Ticket
                      </button>
                      <p className="auth-note">
                        <Link to="/register">Create an account</Link> to
                        purchase tickets
                      </p>
                    </>
                  )}
                </div>

                <div className="booking-security">
                  <div className="security-item">
                    <i className="fas fa-shield-alt"></i>
                    <span>Secure checkout</span>
                  </div>
                  <div className="security-item">
                    <i className="fas fa-mobile-alt"></i>
                    <span>Mobile tickets</span>
                  </div>
                  <div className="security-item">
                    <i className="fas fa-undo"></i>
                    <span>Easy refunds</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
