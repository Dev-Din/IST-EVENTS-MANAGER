import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../services/api";
import "./MpesaPaymentForm.css";

const MpesaPaymentForm = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    phoneNumber: "",
    quantity: 1,
  });

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initiating, setInitiating] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState(null);

  useEffect(() => {
    fetchEventDetails();
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/events/${eventId}`);
      setEvent(response.data.data);
    } catch (error) {
      console.error("Error fetching event details:", error);
      toast.error("Failed to fetch event details");
      navigate("/events");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validatePhoneNumber = (phoneNumber) => {
    const cleaned = phoneNumber.replace(/\D/g, "");
    const mpesaPattern = /^2547\d{8}$/;
    return mpesaPattern.test(cleaned);
  };

  const formatPhoneNumber = (phoneNumber) => {
    const cleaned = phoneNumber.replace(/\D/g, "");

    // Auto-format as user types
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `254${cleaned.slice(3)}`;
    } else if (cleaned.length <= 9) {
      return `254${cleaned.slice(3, 6)}${cleaned.slice(6)}`;
    } else {
      return `254${cleaned.slice(3, 6)}${cleaned.slice(6, 9)}${cleaned.slice(
        9,
        12
      )}`;
    }
  };

  const handlePhoneNumberChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData((prev) => ({
      ...prev,
      phoneNumber: formatted,
    }));
  };

  const initiatePayment = async (e) => {
    e.preventDefault();

    if (!validatePhoneNumber(formData.phoneNumber)) {
      toast.error("Please enter a valid M-Pesa number (2547XXXXXXXX)");
      return;
    }

    if (formData.quantity < 1 || formData.quantity > 10) {
      toast.error("Quantity must be between 1 and 10");
      return;
    }

    try {
      setInitiating(true);
      const response = await api.post("/payments/mpesa/initiate", {
        eventId,
        phoneNumber: formData.phoneNumber,
        quantity: parseInt(formData.quantity),
      });

      setPaymentData(response.data.data);
      toast.success(
        "M-Pesa payment initiated! Check your phone for the STK Push prompt."
      );

      // Start checking payment status
      startStatusCheck(response.data.data.checkoutRequestID);
    } catch (error) {
      console.error("Error initiating payment:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to initiate payment";
      toast.error(errorMessage);
    } finally {
      setInitiating(false);
    }
  };

  const startStatusCheck = (checkoutRequestID) => {
    const interval = setInterval(async () => {
      try {
        setCheckingStatus(true);
        const response = await api.get(
          `/payments/mpesa/status/${checkoutRequestID}`
        );
        const { resultCode, resultDesc, transaction, ticket } =
          response.data.data;

        if (resultCode === 0) {
          // Payment successful
          clearInterval(interval);
          setStatusCheckInterval(null);
          toast.success("Payment successful! Your ticket has been confirmed.");
          navigate("/my-tickets");
        } else if (resultCode !== 1032) {
          // Payment failed (1032 means still processing)
          clearInterval(interval);
          setStatusCheckInterval(null);
          toast.error(`Payment failed: ${resultDesc}`);
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
      } finally {
        setCheckingStatus(false);
      }
    }, 5000); // Check every 5 seconds

    setStatusCheckInterval(interval);

    // Stop checking after 5 minutes
    setTimeout(() => {
      if (interval) {
        clearInterval(interval);
        setStatusCheckInterval(null);
        toast.info(
          "Payment status check timed out. Please check your tickets page."
        );
      }
    }, 300000);
  };

  const cancelPayment = () => {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
    setPaymentData(null);
    toast.info("Payment cancelled");
  };

  if (loading) {
    return (
      <div className="payment-form-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="payment-form-container">
        <div className="error-message">
          <h2>Event not found</h2>
          <p>The event you're looking for doesn't exist.</p>
          <button onClick={() => navigate("/events")} className="btn-primary">
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-form-container">
      <div className="payment-form-card">
        <div className="payment-header">
          <h2>Complete Your Purchase</h2>
          <div className="event-summary">
            <h3>{event.title}</h3>
            <p className="event-date">
              {new Date(event.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="event-location">📍 {event.location}</p>
          </div>
        </div>

        {!paymentData ? (
          <form onSubmit={initiatePayment} className="payment-form">
            <div className="form-group">
              <label htmlFor="phoneNumber">M-Pesa Phone Number</label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handlePhoneNumberChange}
                placeholder="254712345678"
                required
                className="phone-input"
              />
              <small className="form-help">
                Enter your M-Pesa number in format: 2547XXXXXXXX
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="quantity">Number of Tickets</label>
              <select
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                required
                className="quantity-select"
              >
                {[...Array(Math.min(10, event.availableTickets))].map(
                  (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} ticket{i + 1 > 1 ? "s" : ""}
                    </option>
                  )
                )}
              </select>
              <small className="form-help">
                {event.availableTickets} tickets available
              </small>
            </div>

            <div className="payment-summary">
              <div className="summary-row">
                <span>Tickets ({formData.quantity})</span>
                <span>KES 1.00</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>KES 1.00</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={
                initiating || !validatePhoneNumber(formData.phoneNumber)
              }
              className="btn-pay"
            >
              {initiating ? (
                <>
                  <div className="spinner-small"></div>
                  Initiating Payment...
                </>
              ) : (
                "Pay with M-Pesa"
              )}
            </button>
          </form>
        ) : (
          <div className="payment-status">
            <div className="status-header">
              <div className="status-icon processing">
                <div className="spinner"></div>
              </div>
              <h3>Payment in Progress</h3>
              <p>Check your phone for the M-Pesa STK Push prompt</p>
            </div>

            <div className="payment-details">
              <div className="detail-row">
                <span>Amount:</span>
                <span>KES {paymentData.amount}</span>
              </div>
              <div className="detail-row">
                <span>Phone:</span>
                <span>{paymentData.phoneNumber}</span>
              </div>
              <div className="detail-row">
                <span>Reference:</span>
                <span>{paymentData.accountReference}</span>
              </div>
            </div>

            <div className="status-actions">
              <button
                onClick={() => {
                  // Manual status check
                  if (paymentData.checkoutRequestID) {
                    startStatusCheck(paymentData.checkoutRequestID);
                  }
                }}
                disabled={checkingStatus}
                className="btn-secondary"
              >
                {checkingStatus ? "Checking..." : "Check Status"}
              </button>
              <button onClick={cancelPayment} className="btn-danger">
                Cancel Payment
              </button>
            </div>

            <div className="help-text">
              <p>
                💡 <strong>Instructions:</strong>
              </p>
              <ul>
                <li>Enter your M-Pesa PIN when prompted</li>
                <li>Wait for confirmation message</li>
                <li>Your ticket will be automatically confirmed</li>
              </ul>
            </div>
          </div>
        )}

        <div className="payment-footer">
          <p className="security-note">
            🔒 Your payment is secured by M-Pesa's encryption
          </p>
          <p className="test-note">
            ⚠️ This is a test environment. All payments are KES 1.00
          </p>
        </div>
      </div>
    </div>
  );
};

export default MpesaPaymentForm;
