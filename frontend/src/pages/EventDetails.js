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
  const [imageError, setImageError] = useState(false);

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
    const date = new Date(dateString);
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    };
    return date.toLocaleDateString("en-US", options);
  };

  const formatDateShort = (dateString) => {
    const date = new Date(dateString);
    return {
      month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      day: date.getDate(),
      year: date.getFullYear(),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  const formatPrice = (price, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(price);
  };

  const handlePurchase = () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: `/purchase/${id}` } } });
      return;
    }
    navigate(`/purchase/${id}`);
  };

  const getEventImage = () => {
    return event?.image;
  };

  if (loading) {
    return <Loading message="Loading event details..." />;
  }

  if (error) {
    return (
      <div className="error-page">
        <div className="error-content">
          <div className="error-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <h2>Oops! Something went wrong</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={fetchEvent} className="btn btn-primary">
              <i className="fas fa-redo"></i>
              Try Again
            </button>
            <Link to="/" className="btn btn-outline">
              <i className="fas fa-arrow-left"></i>
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
          <div className="error-icon">
            <i className="fas fa-calendar-times"></i>
          </div>
          <h2>Event Not Found</h2>
          <p>The event you're looking for doesn't exist or has been removed.</p>
          <Link to="/" className="btn btn-primary">
            <i className="fas fa-search"></i>
            Browse Events
          </Link>
        </div>
      </div>
    );
  }

  const dateInfo = formatDateShort(event.date);

  return (
    <div className="event-details-page">
            {/* Hero Section */}
      <div className="event-hero">
        <div className="hero-background">
          {getEventImage() && !imageError ? (
            <img 
              src={getEventImage()} 
              alt={event.name}
              onError={() => setImageError(true)}
              className="hero-image"
            />
          ) : (
            <div className="hero-gradient-bg"></div>
          )}
          <div className="hero-overlay"></div>
        </div>

        <div className="container">
          {/* Breadcrumb */}
          <nav className="breadcrumb">
            <Link to="/">
              <i className="fas fa-home"></i> Events
            </Link>
            <span className="separator">
              <i className="fas fa-chevron-right"></i>
            </span>
            <span className="current">{event.name}</span>
          </nav>

          <div className="hero-content">
            <div className="event-badge">
              <i className="fas fa-calendar-star"></i>
              Featured Event
            </div>
            <h1 className="event-title">{event.name}</h1>
            {event.createdBy && (
              <div className="event-organizer">
                <i className="fas fa-user-circle"></i>
                Organized by{" "}
                <strong>
                  {event.createdBy.username || "LegitEvents Admin"}
                </strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="event-main-content">
        <div className="container">
          <div className="event-content-grid">
            {/* Left Column - Event Details */}
            <div className="event-details-section">
              {/* Quick Info Cards */}
              <div className="quick-info-grid">
                <div className="quick-info-card date-card">
                  <div className="card-icon">
                    <div className="date-display">
                      <span className="month">{dateInfo.month}</span>
                      <span className="day">{dateInfo.day}</span>
                    </div>
                  </div>
                  <div className="card-content">
                    <h3>Date & Time</h3>
                    <p className="primary-text">{formatDate(event.date)}</p>
                  </div>
                </div>

                <div className="quick-info-card location-card">
                  <div className="card-icon">
                    <i className="fas fa-map-marker-alt"></i>
                  </div>
                  <div className="card-content">
                    <h3>Location</h3>
                    <p className="primary-text">{event.location}</p>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(
                        event.location
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="location-link"
                    >
                      <i className="fas fa-external-link-alt"></i> View on Map
                    </a>
                  </div>
                </div>

                <div className="quick-info-card price-card">
                  <div className="card-icon">
                    <i className="fas fa-ticket-alt"></i>
                  </div>
                  <div className="card-content">
                    <h3>Ticket Price</h3>
                    <p className="price-display">
                      {formatPrice(event.charges, event.currency)}
                    </p>
                    <span className="price-note">per person</span>
                  </div>
                </div>
              </div>

              {/* Event Description */}
              {event.description && (
                <div className="event-description-section">
                  <h2>
                    <i className="fas fa-info-circle"></i> About This Event
                  </h2>
                  <div className="description-content">
                    <p>{event.description}</p>
                  </div>
                </div>
              )}

              {/* Event Features */}
              <div className="event-features">
                <h3>
                  <i className="fas fa-star"></i> What's Included
                </h3>
                <div className="features-grid">
                  <div className="feature-item">
                    <i className="fas fa-certificate"></i>
                    <span>Certificate of Completion</span>
                  </div>
                  <div className="feature-item">
                    <i className="fas fa-coffee"></i>
                    <span>Refreshments Included</span>
                  </div>
                  <div className="feature-item">
                    <i className="fas fa-wifi"></i>
                    <span>Free WiFi</span>
                  </div>
                  <div className="feature-item">
                    <i className="fas fa-parking"></i>
                    <span>Free Parking</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Booking Section */}
            <div className="booking-section">
              <div className="booking-card">
                <div className="booking-header">
                  <div className="price-highlight">
                    <span className="price">
                      {formatPrice(event.charges, event.currency)}
                    </span>
                    <span className="price-label">per ticket</span>
                  </div>
                  <div className="availability-status">
                    <i className="fas fa-check-circle"></i>
                    <span>Available Now</span>
                  </div>
                </div>

                <div className="booking-summary">
                  <div className="summary-item">
                    <div className="summary-icon">
                      <i className="fas fa-calendar"></i>
                    </div>
                    <div className="summary-content">
                      <strong>
                        {dateInfo.month} {dateInfo.day}, {dateInfo.year}
                      </strong>
                      <span>{dateInfo.time}</span>
                    </div>
                  </div>

                  <div className="summary-item">
                    <div className="summary-icon">
                      <i className="fas fa-map-marker-alt"></i>
                    </div>
                    <div className="summary-content">
                      <strong>{event.location}</strong>
                    </div>
                  </div>
                </div>

                <div className="booking-actions">
                  {isAuthenticated ? (
                    <button
                      className="btn btn-primary btn-full btn-lg book-now-btn"
                      onClick={handlePurchase}
                    >
                      <i className="fas fa-shopping-cart"></i>
                      Book Your Ticket Now
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn btn-primary btn-full btn-lg book-now-btn"
                        onClick={handlePurchase}
                      >
                        <i className="fas fa-sign-in-alt"></i>
                        Login to Book Ticket
                      </button>
                      <div className="auth-options">
                        <p>Don't have an account?</p>
                        <Link to="/register" className="register-link">
                          <i className="fas fa-user-plus"></i>
                          Create Account
                        </Link>
                      </div>
                    </>
                  )}
                </div>

                <div className="trust-indicators">
                  <div className="trust-item">
                    <i className="fas fa-shield-alt"></i>
                    <span>Secure Payment</span>
                  </div>
                  <div className="trust-item">
                    <i className="fas fa-mobile-alt"></i>
                    <span>Instant E-Tickets</span>
                  </div>
                  <div className="trust-item">
                    <i className="fas fa-headset"></i>
                    <span>24/7 Support</span>
                  </div>
                </div>

                <div className="money-back-guarantee">
                  <i className="fas fa-medal"></i>
                  <span>100% Money Back Guarantee</span>
                </div>
              </div>

              {/* Share Event */}
              <div className="share-section">
                <h4>
                  <i className="fas fa-share-alt"></i> Share This Event
                </h4>
                <div className="share-buttons">
                  <button
                    className="share-btn facebook"
                    title="Share on Facebook"
                  >
                    <i className="fab fa-facebook-f"></i>
                  </button>
                  <button
                    className="share-btn twitter"
                    title="Share on Twitter"
                  >
                    <i className="fab fa-twitter"></i>
                  </button>
                  <button
                    className="share-btn linkedin"
                    title="Share on LinkedIn"
                  >
                    <i className="fab fa-linkedin-in"></i>
                  </button>
                  <button
                    className="share-btn whatsapp"
                    title="Share on WhatsApp"
                  >
                    <i className="fab fa-whatsapp"></i>
                  </button>
                  <button className="share-btn copy" title="Copy Link">
                    <i className="fas fa-copy"></i>
                  </button>
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
