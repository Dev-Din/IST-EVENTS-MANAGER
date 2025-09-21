import React, { useRef, useState, useEffect } from "react";
import QRCode from "qrcode";
import "./TicketDownload.css";

const TicketDownload = ({ ticket, onClose }) => {
  const canvasRef = useRef(null);
  const ticketRef = useRef(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");

  useEffect(() => {
    if (ticket) {
      // Generate QR code with ticket information
      const qrData = JSON.stringify({
        ticketNumber: ticket.ticketNumber,
        eventId: ticket.event._id,
        eventTitle: ticket.event.title,
        attendee: ticket.user.fullName || ticket.user.username,
        date: ticket.event.date,
        quantity: ticket.quantity,
      });

      console.log("Generating QR code with data:", qrData);

      // Generate QR code as data URL
      QRCode.toDataURL(qrData, {
        width: 150,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "M",
      })
        .then((dataUrl) => {
          console.log("QR Code generated successfully as data URL");
          setQrCodeDataUrl(dataUrl);
        })
        .catch((error) => {
          console.error("QR Code generation error:", error);
        });
    }
  }, [ticket]);

  const formatDate = (dateString) => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  const formatPrice = (price, currency = "KES") => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const downloadTicket = () => {
    const ticketElement = ticketRef.current;

    // Use html2canvas or similar library for better PDF generation
    // For now, we'll use the browser's print functionality
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Event Ticket - ${ticket.event.title}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: white;
            }
            .ticket-container {
              max-width: 600px;
              margin: 0 auto;
              border: 2px solid #4F46E5;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .ticket-header {
              background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
              color: white;
              padding: 20px;
              text-align: center;
            }
            .ticket-body {
              padding: 30px;
              background: white;
            }
            .ticket-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .info-item {
              display: flex;
              flex-direction: column;
            }
            .info-label {
              font-size: 12px;
              color: #6B7280;
              margin-bottom: 5px;
              text-transform: uppercase;
              font-weight: 600;
            }
            .info-value {
              font-size: 16px;
              color: #111827;
              font-weight: 500;
            }
            .qr-section {
              text-align: center;
              border-top: 1px solid #E5E7EB;
              padding-top: 20px;
            }
            .qr-code {
              margin: 0 auto 15px;
            }
            .ticket-number {
              font-family: 'Courier New', monospace;
              font-size: 14px;
              color: #6B7280;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="ticket-container">
            <div class="ticket-header">
              <h1 style="margin: 0; font-size: 24px;">🎫 Event Ticket</h1>
              <p style="margin: 5px 0 0; opacity: 0.9;">${
                ticket.event.title
              }</p>
            </div>
            <div class="ticket-body">
              <div class="ticket-info">
                <div class="info-item">
                  <span class="info-label">Event</span>
                  <span class="info-value">${ticket.event.title}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Date & Time</span>
                  <span class="info-value">${formatDate(
                    ticket.event.date
                  )}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Location</span>
                  <span class="info-value">${ticket.event.location}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Attendee</span>
                  <span class="info-value">${ticket.user.fullName}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Quantity</span>
                  <span class="info-value">${ticket.quantity} ticket${
      ticket.quantity > 1 ? "s" : ""
    }</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Total Paid</span>
                  <span class="info-value">${formatPrice(ticket.totalPrice)} ${
      ticket.event.currency || "KES"
    }</span>
                </div>
              </div>
              <div class="qr-section">
                <div class="qr-code">
                  ${
                    qrCodeDataUrl
                      ? `<img src="${qrCodeDataUrl}" style="width: 150px; height: 150px;" />`
                      : ""
                  }
                </div>
                <p style="margin: 0; font-size: 12px; color: #6B7280;">
                  Scan this QR code at the event entrance
                </p>
                <div class="ticket-number">
                  Ticket #${ticket.ticketNumber}
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  if (!ticket) return null;

  return (
    <div className="ticket-download-overlay">
      <div className="ticket-download-modal">
        <div className="modal-header">
          <h2>Your Ticket</h2>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="ticket-preview" ref={ticketRef}>
          <div className="ticket-container">
            <div className="ticket-header">
              <h3>🎫 Event Ticket</h3>
              <p>{ticket.event.title}</p>
            </div>

            <div className="ticket-body">
              <div className="ticket-info">
                <div className="info-row">
                  <div className="info-item">
                    <span className="info-label">Event</span>
                    <span className="info-value">{ticket.event.title}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Date & Time</span>
                    <span className="info-value">
                      {formatDate(ticket.event.date)}
                    </span>
                  </div>
                </div>

                <div className="info-row">
                  <div className="info-item">
                    <span className="info-label">Location</span>
                    <span className="info-value">{ticket.event.location}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Attendee</span>
                    <span className="info-value">{ticket.user.fullName}</span>
                  </div>
                </div>

                <div className="info-row">
                  <div className="info-item">
                    <span className="info-label">Quantity</span>
                    <span className="info-value">
                      {ticket.quantity} ticket{ticket.quantity > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Total Paid</span>
                    <span className="info-value">
                      {formatPrice(ticket.totalPrice)}{" "}
                      {ticket.event.currency || "KES"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="qr-section">
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="QR Code" className="qr-code" />
                ) : (
                  <div className="qr-code qr-loading">
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>Generating QR Code...</span>
                  </div>
                )}
                <p className="qr-instruction">
                  Scan this QR code at the event entrance
                </p>
                <div className="ticket-number">
                  Ticket #{ticket.ticketNumber}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={downloadTicket}>
            <i className="fas fa-download"></i>
            Download Ticket
          </button>
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketDownload;
