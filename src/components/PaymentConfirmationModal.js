import React, { useState } from "react";
import Modal from "./Modal";
import "./PaymentConfirmationModal.css";

const PaymentConfirmationModal = ({
  isOpen,
  onClose,
  event,
  quantity = 1,
  onConfirmPayment,
  loading = false,
}) => {
  const [paymentMethod, setPaymentMethod] = useState("mpesa");
  const [cardNumber, setCardNumber] = useState("4111 1111 1111 1111");
  const [expiryDate, setExpiryDate] = useState("12/25");
  const [cvv, setCvv] = useState("123");
  const [cardName, setCardName] = useState("Demo User");
  const [phoneNumber, setPhoneNumber] = useState("+254712345678");
  const [formError, setFormError] = useState("");

  const formatPrice = (price, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(price);
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

  const handleConfirmPayment = () => {
    setFormError(""); // Clear any previous errors

    // Validate M-PESA phone number if M-PESA is selected
    if (paymentMethod === "mpesa") {
      const cleanPhone = phoneNumber.replace(/\s+/g, "");
      if (!cleanPhone || cleanPhone.length < 10) {
        setFormError("Please enter a valid M-PESA phone number");
        return;
      }
      if (!cleanPhone.startsWith("+254")) {
        setFormError(
          "Please enter a valid Kenyan phone number starting with +254"
        );
        return;
      }
    }

    const paymentDetails = {
      method: paymentMethod,
      transactionId: `TXN-${Date.now()}`,
      paymentProcessor:
        paymentMethod === "mpesa" ? "M-PESA" : "Demo Payment Gateway",
      currency: event.currency || "USD",
    };

    // Add method-specific details
    if (paymentMethod === "credit_card" || paymentMethod === "debit_card") {
      paymentDetails.cardNumber = cardNumber.replace(/\s/g, "").slice(-4); // Only last 4 digits
      paymentDetails.cardName = cardName;
    } else if (paymentMethod === "mpesa") {
      paymentDetails.phoneNumber = phoneNumber;
      paymentDetails.mpesaCode = `MP${Date.now().toString().slice(-8)}`;
    }

    console.log("Payment Details:", paymentDetails); // Debug log
    onConfirmPayment(paymentDetails);
  };

  const formatCardNumber = (value) => {
    // Add spaces every 4 digits
    return value
      .replace(/\s+/g, "")
      .replace(/[^0-9]/gi, "")
      .substr(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();
  };

  const formatExpiryDate = (value) => {
    // Add slash after 2 digits
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "$1/$2")
      .substr(0, 5);
  };

  const formatPhoneNumber = (value) => {
    // Remove all non-digit characters except +
    let cleaned = value.replace(/[^\d+]/g, "");

    // Handle different input formats
    if (cleaned.startsWith("0")) {
      cleaned = "+254" + cleaned.substring(1);
    } else if (cleaned.startsWith("254") && !cleaned.startsWith("+254")) {
      cleaned = "+" + cleaned;
    } else if (
      !cleaned.startsWith("+254") &&
      cleaned.length > 0 &&
      !cleaned.startsWith("+")
    ) {
      cleaned = "+254" + cleaned;
    }

    return cleaned.substring(0, 13); // Limit to +254XXXXXXXXX format
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Payment"
      size="large"
      closeOnOverlayClick={!loading}
    >
      <div className="payment-confirmation">
        {/* Order Summary */}
        <div className="order-summary-section">
          <h3>
            <i className="fas fa-receipt"></i>
            Order Summary
          </h3>
          <div className="order-details">
            <div className="order-item">
              <div className="item-info">
                <h4>{event?.name}</h4>
                <p>
                  <i className="fas fa-calendar"></i>
                  {new Date(event?.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p>
                  <i className="fas fa-map-marker-alt"></i>
                  {event?.location}
                </p>
              </div>
              <div className="item-price">
                <span className="price">
                  {formatPrice(event?.price, event?.currency)}
                </span>
                <span className="quantity">
                  × {quantity} ticket{quantity > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="pricing-breakdown">
              <div className="price-row">
                <span>
                  {quantity} Ticket{quantity > 1 ? "s" : ""}
                </span>
                <span>{formatPrice(calculateTotal(), event?.currency)}</span>
              </div>
              <div className="price-row">
                <span>Processing Fee</span>
                <span>
                  {formatPrice(calculateProcessingFee(), event?.currency)}
                </span>
              </div>
              <div className="price-divider"></div>
              <div className="price-row total">
                <span>Total</span>
                <span>
                  {formatPrice(calculateGrandTotal(), event?.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="payment-method-section">
          <h3>
            <i className="fas fa-credit-card"></i>
            Payment Method
          </h3>

          <div className="payment-methods">
            <label className="payment-option">
              <input
                type="radio"
                value="mpesa"
                checked={paymentMethod === "mpesa"}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  setFormError(""); // Clear error when changing payment method
                }}
              />
              <div className="option-content">
                <img
                  src="/m-pesa-logo.png"
                  alt="M-PESA"
                  className="mpesa-logo"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "block";
                  }}
                />
                <div
                  className="mpesa-logo-fallback"
                  style={{ display: "none" }}
                >
                  <span className="mpesa-text">M-PESA</span>
                </div>
                <span>M-PESA</span>
              </div>
            </label>

            <label className="payment-option">
              <input
                type="radio"
                value="credit_card"
                checked={paymentMethod === "credit_card"}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  setFormError(""); // Clear error when changing payment method
                }}
              />
              <div className="option-content">
                <i className="fas fa-credit-card"></i>
                <span>Credit Card</span>
              </div>
            </label>

            <label className="payment-option">
              <input
                type="radio"
                value="debit_card"
                checked={paymentMethod === "debit_card"}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  setFormError(""); // Clear error when changing payment method
                }}
              />
              <div className="option-content">
                <i className="fas fa-money-check-alt"></i>
                <span>Debit Card</span>
              </div>
            </label>

            <label className="payment-option">
              <input
                type="radio"
                value="paypal"
                checked={paymentMethod === "paypal"}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  setFormError(""); // Clear error when changing payment method
                }}
              />
              <div className="option-content">
                <i className="fab fa-paypal"></i>
                <span>PayPal</span>
              </div>
            </label>
          </div>

          {(paymentMethod === "credit_card" ||
            paymentMethod === "debit_card") && (
            <div className="card-details">
              <div className="card-form">
                <div className="form-group">
                  <label>Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) =>
                      setCardNumber(formatCardNumber(e.target.value))
                    }
                    placeholder="1234 5678 9012 3456"
                    maxLength="19"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input
                      type="text"
                      value={expiryDate}
                      onChange={(e) =>
                        setExpiryDate(formatExpiryDate(e.target.value))
                      }
                      placeholder="MM/YY"
                      maxLength="5"
                    />
                  </div>
                  <div className="form-group">
                    <label>CVV</label>
                    <input
                      type="text"
                      value={cvv}
                      onChange={(e) =>
                        setCvv(e.target.value.replace(/\D/g, "").substr(0, 4))
                      }
                      placeholder="123"
                      maxLength="4"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Cardholder Name</label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
              </div>
            </div>
          )}

          {paymentMethod === "mpesa" && (
            <div className="mpesa-details">
              <div className="mpesa-form">
                <div className="form-group">
                  <label>M-PESA Phone Number</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(formatPhoneNumber(e.target.value));
                      setFormError(""); // Clear error when user types
                    }}
                    placeholder="+254712345678"
                    maxLength="13"
                    required
                  />
                  <small className="form-hint">
                    Enter your M-PESA registered phone number
                  </small>
                </div>
                <div className="mpesa-info">
                  <div className="info-item">
                    <i className="fas fa-mobile-alt"></i>
                    <span>You will receive an M-PESA prompt on your phone</span>
                  </div>
                  <div className="info-item">
                    <i className="fas fa-clock"></i>
                    <span>Transaction will be processed within 2 minutes</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="security-notice">
          <div className="demo-notice">
            <i className="fas fa-info-circle"></i>
            <div>
              <strong>Demo Mode:</strong> This is a demonstration. No actual
              payment will be processed. You can use any card details for
              testing.
            </div>
          </div>

          <div className="security-features">
            <div className="security-item">
              <i className="fas fa-shield-alt"></i>
              <span>SSL Encrypted</span>
            </div>
            <div className="security-item">
              <i className="fas fa-lock"></i>
              <span>Secure Payment</span>
            </div>
            <div className="security-item">
              <i className="fas fa-user-shield"></i>
              <span>Privacy Protected</span>
            </div>
          </div>
        </div>

        {/* Form Error */}
        {formError && (
          <div className="form-error">
            <i className="fas fa-exclamation-triangle"></i>
            {formError}
          </div>
        )}

        {/* Action Buttons */}
        <div className="payment-actions">
          <button
            className="btn btn-outline btn-full"
            onClick={onClose}
            disabled={loading}
          >
            <i className="fas fa-arrow-left"></i>
            Back
          </button>

          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={handleConfirmPayment}
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Processing Payment...
              </>
            ) : (
              <>
                <i className="fas fa-check-circle"></i>
                {paymentMethod === "mpesa"
                  ? "Pay with M-PESA"
                  : "Confirm Payment"}{" "}
                - {formatPrice(calculateGrandTotal(), event?.currency)}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PaymentConfirmationModal;
