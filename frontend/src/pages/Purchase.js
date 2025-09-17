import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../App";
import Loading from "../components/Loading";
import PaymentConfirmationModal from "../components/PaymentConfirmationModal";
import TicketDownload from "../components/TicketDownload";
import { eventsAPI, ticketsAPI } from "../services/api";
import "./Purchase.css";

const Purchase = () => {
  const { eventId } = useParams();
  const { user } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [purchasedQuantity, setPurchasedQuantity] = useState(1);
  const [purchasedTicket, setPurchasedTicket] = useState(null);
  const [showTicketDownload, setShowTicketDownload] = useState(false);

  const fetchEvent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await eventsAPI.getById(eventId);
      setEvent(response.data.data);
      setError("");
    } catch (error) {
      console.error("Error fetching event:", error);
      if (error.response?.status === 404) {
        setError("Event not found");
      } else {
        setError("Failed to load event details");
      }
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const calculateTotal = () => {
    return event ? event.price * quantity : 0;
  };

  const calculateProcessingFee = () => {
    // Fixed processing fee: 1.5 for all currencies
    return 1.5;
  };

  const calculateGrandTotal = () => {
    return calculateTotal() + calculateProcessingFee();
  };

  const handleInitiatePurchase = () => {
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async (paymentDetails) => {
    try {
      setPurchasing(true);
      setError("");

      const purchaseData = {
        eventId: eventId,
        quantity: quantity,
        paymentMethod: "mobile_money", // M-PESA is a mobile money service
      };

      const response = await ticketsAPI.purchase(purchaseData);
      setPurchasedQuantity(quantity);
      setPurchasedTicket(response.data.data);
      setSuccess(true);
      setShowPaymentModal(false);
    } catch (error) {
      console.error("Error purchasing ticket:", error);
      setError(
        error.response?.data?.message ||
          "Failed to purchase ticket. Please try again."
      );
    } finally {
      setPurchasing(false);
    }
  };

  const formatPrice = (price, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(price);
  };

  const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  const handleDownloadTicket = () => {
    setShowTicketDownload(true);
  };

  const handleCloseTicketDownload = () => {
    setShowTicketDownload(false);
  };

  if (loading) {
    return <Loading message="Loading event details..." />;
  }

  if (error && !event) {
    return (
      <div className="error-page">
        <div className="error-content">
          <i className="fas fa-exclamation-triangle"></i>
          <h2>Error</h2>
          <p>{error}</p>
          <Link to="/" className="btn btn-primary">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="purchase-page">
        <div className="container">
          <div className="purchase-success">
            <div className="success-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h1>Purchase Successful!</h1>
            <p>Your ticket has been purchased successfully.</p>

            <div className="ticket-summary">
              <h3>Ticket Details</h3>
              <div className="ticket-info">
                <div className="info-row">
                  <span className="label">Event:</span>
                  <span className="value">{event.title}</span>
                </div>
                <div className="info-row">
                  <span className="label">Date:</span>
                  <span className="value">{formatDate(event.date)}</span>
                </div>
                <div className="info-row">
                  <span className="label">Location:</span>
                  <span className="value">{event.location}</span>
                </div>
                <div className="info-row">
                  <span className="label">Quantity:</span>
                  <span className="value">
                    {purchasedQuantity} ticket{purchasedQuantity > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="info-row">
                  <span className="label">Price per ticket:</span>
                  <span className="value">
                    {formatPrice(event.price, event.currency)}
                  </span>
                </div>
                <div className="info-row">
                  <span className="label">Total paid:</span>
                  <span className="value">
                    {formatPrice(
                      event.price * purchasedQuantity,
                      event.currency
                    )}
                  </span>
                </div>
                <div className="info-row">
                  <span className="label">Buyer:</span>
                  <span className="value">
                    {user.username} ({user.email})
                  </span>
                </div>
              </div>
            </div>

            <div className="success-actions">
              {purchasedTicket && (
                <button
                  className="btn btn-success"
                  onClick={handleDownloadTicket}
                >
                  <i className="fas fa-download"></i>
                  Download Ticket with QR Code
                </button>
              )}
              <Link to="/my-tickets" className="btn btn-primary">
                <i className="fas fa-ticket-alt"></i>
                View My Tickets
              </Link>
              <Link to="/" className="btn btn-outline">
                Browse More Events
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="purchase-page">
      <div className="container">
        <div className="purchase-header">
          <nav className="breadcrumb">
            <Link to="/">Events</Link>
            <span className="separator">/</span>
            <Link to={`/events/${eventId}`}>{event.title}</Link>
            <span className="separator">/</span>
            <span className="current">Purchase</span>
          </nav>
          <h1>Purchase Ticket</h1>
        </div>

        <div className="purchase-content">
          {/* Event Details */}
          <div className="event-summary">
            <h2>Event Details</h2>
            <div className="event-card">
              <h3>{event.title}</h3>
              <div className="event-details">
                <div className="detail-item">
                  <i className="fas fa-calendar"></i>
                  <span>{formatDate(event.date)}</span>
                </div>
                <div className="detail-item">
                  <i className="fas fa-map-marker-alt"></i>
                  <span>{event.location}</span>
                </div>
                <div className="detail-item">
                  <i className="fas fa-dollar-sign"></i>
                  <span>{formatPrice(event.price, event.currency)}</span>
                </div>
              </div>
              {event.description && (
                <p className="event-description">{event.description}</p>
              )}
            </div>
          </div>

          {/* Purchase Form */}
          <div className="purchase-form">
            <h2>Complete Purchase</h2>

            {error && (
              <div className="alert alert-error">
                <i className="fas fa-exclamation-triangle"></i>
                {error}
              </div>
            )}

            <div className="buyer-info">
              <h3>Buyer Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Name:</label>
                  <span>{user.username}</span>
                </div>
                <div className="info-item">
                  <label>Email:</label>
                  <span>{user.email}</span>
                </div>
              </div>
            </div>

            <div className="quantity-section">
              <h3>Ticket Quantity</h3>
              <div className="quantity-selector">
                <div className="quantity-controls">
                  <button
                    type="button"
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                  >
                    <i className="fas fa-minus"></i>
                  </button>
                  <div className="quantity-display">
                    <span className="quantity-number">{quantity}</span>
                    <span className="quantity-label">
                      ticket{quantity > 1 ? "s" : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= 10}
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
                <div className="quantity-info">
                  <p>
                    <i className="fas fa-info-circle"></i>
                    Maximum 10 tickets per transaction
                  </p>
                  <div className="price-calculation">
                    <span>
                      {formatPrice(event.price, event.currency)} × {quantity} ={" "}
                    </span>
                    <strong>
                      {formatPrice(calculateTotal(), event.currency)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-summary">
              <h3>Order Summary</h3>
              <div className="summary-items">
                <div className="summary-item">
                  <span>
                    {quantity} Ticket{quantity > 1 ? "s" : ""} ({event.title})
                  </span>
                  <span>{formatPrice(calculateTotal(), event.currency)}</span>
                </div>
                <div className="summary-item">
                  <span>Processing Fee</span>
                  <span>
                    {formatPrice(calculateProcessingFee(), event.currency)}
                  </span>
                </div>
                <div className="summary-divider"></div>
                <div className="summary-item total">
                  <span>Total</span>
                  <span>
                    {formatPrice(calculateGrandTotal(), event.currency)}
                  </span>
                </div>
              </div>
            </div>

            <div className="payment-section">
              <h3>Payment Method</h3>
              <div className="payment-info">
                <i className="fas fa-credit-card"></i>
                <span>Demo Payment (No actual payment required)</span>
              </div>
            </div>

            <div className="purchase-actions">
              <button
                className="btn btn-primary"
                onClick={handleInitiatePurchase}
                disabled={purchasing || showPaymentModal}
              >
                {purchasing ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <i className="fas fa-shopping-cart"></i>
                    Purchase {quantity} Ticket{quantity > 1 ? "s" : ""} -{" "}
                    {formatPrice(calculateGrandTotal(), event.currency)}
                  </>
                )}
              </button>

              <Link to={`/events/${eventId}`} className="btn btn-outline">
                <i className="fas fa-arrow-left"></i>
                Back to Event
              </Link>
            </div>

            <div className="security-info">
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

      {showPaymentModal && (
        <PaymentConfirmationModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          event={event}
          quantity={quantity}
          onConfirmPayment={handleConfirmPayment}
          loading={purchasing}
        />
      )}

      {showTicketDownload && purchasedTicket && (
        <TicketDownload
          ticket={purchasedTicket}
          onClose={handleCloseTicketDownload}
        />
      )}
    </div>
  );
};

export default Purchase;
