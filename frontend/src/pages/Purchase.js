import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../App";
import Loading from "../components/Loading";
import PaymentConfirmationModal from "../components/PaymentConfirmationModal";
import TicketDownload from "../components/TicketDownload";
import { eventsAPI, ticketsAPI } from "../services/api";
import axios from "axios";
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
  const [mpesaPayment, setMpesaPayment] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(""); // pending, success, failed

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

  // Debug: Log success state changes
  useEffect(() => {
    console.log("🎯 Success state changed:", success);
    console.log("🎯 Payment status:", paymentStatus);
  }, [success, paymentStatus]);

  // Persist success state to prevent loss on re-render
  useEffect(() => {
    if (success) {
      localStorage.setItem("purchaseSuccess", "true");
      localStorage.setItem("purchaseEventId", eventId);
      localStorage.setItem("purchaseQuantity", quantity.toString());
    } else {
      localStorage.removeItem("purchaseSuccess");
      localStorage.removeItem("purchaseEventId");
      localStorage.removeItem("purchaseQuantity");
    }
  }, [success, eventId, quantity]);

  // Check for persisted success state on component mount
  useEffect(() => {
    const persistedSuccess = localStorage.getItem("purchaseSuccess");
    const persistedEventId = localStorage.getItem("purchaseEventId");

    if (persistedSuccess === "true" && persistedEventId === eventId) {
      console.log("🔄 Restoring success state from localStorage");
      setSuccess(true);
      setPaymentStatus("success");
      const persistedQuantity = localStorage.getItem("purchaseQuantity");
      if (persistedQuantity) {
        setPurchasedQuantity(parseInt(persistedQuantity));
      }
    }
  }, [eventId]);

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  // Clear success state for new purchases
  const clearSuccessState = () => {
    setSuccess(false);
    setPaymentStatus("");
    setPurchasedTicket(null);
    setPurchasedQuantity(1);
    setMpesaPayment(null);
    localStorage.removeItem("purchaseSuccess");
    localStorage.removeItem("purchaseEventId");
    localStorage.removeItem("purchaseQuantity");
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

  const handleMpesaPayment = async (phoneNumber) => {
    if (!phoneNumber || !phoneNumber.trim()) {
      setError("Please enter your phone number");
      return;
    }

    try {
      setPurchasing(true);
      setError("");
      setPaymentStatus("pending");

      const token = localStorage.getItem("token");

      const requestPayload = {
        eventId: eventId,
        quantity: quantity,
        phoneNumber: phoneNumber.trim(), // Remove any whitespace
      };

      console.log("🚀 Frontend M-Pesa Payment Request:", requestPayload);
      console.log("🔑 Token:", token ? "Present" : "Missing");

      const response = await axios.post(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:5000/api"
        }/payments/mpesa/initiate`,
        requestPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Frontend M-Pesa Response:", response.data);
      setMpesaPayment(response.data.data);
      setShowPaymentModal(false);

      // Start polling for payment status
      pollPaymentStatus(response.data.data.checkoutRequestID);

      // Also start a more frequent check for the first 2 minutes
      setTimeout(() => {
        checkPaymentSuccess(response.data.data.checkoutRequestID);
      }, 30000); // Check after 30 seconds

      setTimeout(() => {
        checkPaymentSuccess(response.data.data.checkoutRequestID);
      }, 60000); // Check after 1 minute

      setTimeout(() => {
        checkPaymentSuccess(response.data.data.checkoutRequestID);
      }, 120000); // Check after 2 minutes
    } catch (error) {
      console.error("❌ Frontend M-Pesa Error:", error);
      console.error("❌ Error Response:", error.response?.data);

      // Handle rate limiting specifically
      if (error.response?.data?.message?.includes("System is busy")) {
        setError(
          "M-Pesa system is currently busy. Please wait 5-10 minutes and try again, or use a different phone number."
        );
      } else {
        setError(
          error.response?.data?.message ||
            "Failed to initiate M-Pesa payment. Please try again."
        );
      }
      setPaymentStatus("failed");
    } finally {
      setPurchasing(false);
    }
  };

  const pollPaymentStatus = async (checkoutRequestID) => {
    const maxAttempts = 30; // Poll for 5 minutes (30 * 10 seconds)
    let attempts = 0;

    const poll = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${
            process.env.REACT_APP_API_URL || "http://localhost:5000/api"
          }/payments/mpesa/status/${checkoutRequestID}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const { resultCode, ticket, transaction } = response.data.data;

        // Convert resultCode to number for comparison
        const numericResultCode = parseInt(resultCode);

        if (numericResultCode === 0) {
          // Payment successful
          console.log("🎉 Payment successful! Setting success state...");
          setPaymentStatus("success");
          setPurchasedQuantity(quantity);
          setPurchasedTicket(ticket);
          setSuccess(true);
          return;
        } else if (numericResultCode === 1032) {
          // User cancelled
          setPaymentStatus("failed");
          setError("Payment was cancelled. Please try again.");
          return;
        } else if (attempts >= maxAttempts) {
          // Timeout - check if payment was actually successful
          console.log(
            "Polling timeout - checking if payment was successful..."
          );
          await checkPaymentSuccess(checkoutRequestID);
          return;
        }

        attempts++;
        setTimeout(poll, 10000); // Poll every 10 seconds
      } catch (error) {
        console.error("Error polling payment status:", error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000);
        } else {
          // Final attempt - check if payment was successful
          console.log("Polling failed - checking if payment was successful...");
          await checkPaymentSuccess(checkoutRequestID);
        }
      }
    };

    poll();
  };

  // Fallback function to check if payment was successful
  const checkPaymentSuccess = async (checkoutRequestID) => {
    try {
      // First, check transaction logs for successful payment
      const logsResponse = await axios.get(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:5000/api"
        }/payments/logs`
      );

      const logs = logsResponse.data.data;
      if (logs && logs.transactions) {
        // Look for a successful payment completion log
        const successfulPayment = logs.transactions.find(
          (log) =>
            log.data.checkoutRequestID === checkoutRequestID &&
            log.type === "PAYMENT_COMPLETED"
        );

        if (successfulPayment) {
          console.log(
            "Payment was successful (from logs) - redirecting to success page"
          );
          setPaymentStatus("success");
          setPurchasedQuantity(quantity);
          setSuccess(true);
          return;
        }
      }

      // If not found in logs, check transactions table
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:5000/api"
        }/payments/transactions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Look for a successful transaction with this checkout ID
      const successfulTransaction = response.data.data.find(
        (txn) =>
          txn.checkoutRequestID === checkoutRequestID &&
          txn.status === "success"
      );

      if (successfulTransaction) {
        console.log(
          "Payment was successful (from transactions) - redirecting to success page"
        );
        setPaymentStatus("success");
        setPurchasedQuantity(quantity);
        setSuccess(true);
        return;
      }

      // If no successful transaction found, show error
      setPaymentStatus("failed");
      setError(
        "Payment status unclear. Please check your phone or contact support."
      );
    } catch (error) {
      console.error("Error checking payment success:", error);
      setPaymentStatus("failed");
      setError("Failed to verify payment status. Please contact support.");
    }
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
            <p>Your ticket has been purchased successfully via M-Pesa.</p>
            <div className="success-message">
              <i className="fas fa-check-circle"></i>
              <span>
                Payment confirmed! You will receive a confirmation SMS from
                M-Pesa.
              </span>
            </div>

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
                {purchasedTicket && (
                  <div className="info-row">
                    <span className="label">Ticket Number:</span>
                    <span className="value">
                      {purchasedTicket.ticketNumber}
                    </span>
                  </div>
                )}
                <div className="info-row">
                  <span className="label">Payment Method:</span>
                  <span className="value">
                    <i className="fas fa-mobile-alt"></i> M-Pesa Mobile Money
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
              <button className="btn btn-secondary" onClick={clearSuccessState}>
                <i className="fas fa-plus"></i>
                Purchase Another Ticket
              </button>
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

            {paymentStatus === "pending" && (
              <div className="alert alert-info">
                <i className="fas fa-spinner fa-spin"></i>
                <div>
                  <strong>M-Pesa Payment Initiated!</strong>
                  <p>
                    Please check your phone and complete the payment. We're
                    waiting for confirmation...
                  </p>
                  {mpesaPayment && (
                    <div className="payment-details">
                      <p>
                        <strong>Amount:</strong> KES {mpesaPayment.amount}
                      </p>
                      <p>
                        <strong>Phone:</strong> {mpesaPayment.phoneNumber}
                      </p>
                      <p>
                        <strong>Reference:</strong>{" "}
                        {mpesaPayment.checkoutRequestID}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {paymentStatus === "failed" && (
              <div className="alert alert-error">
                <i className="fas fa-times-circle"></i>
                <div>
                  <strong>Payment Failed</strong>
                  <p>
                    Please try again or contact support if the issue persists.
                  </p>
                </div>
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
          onMpesaPayment={handleMpesaPayment}
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
