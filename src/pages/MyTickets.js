import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Loading from "../components/Loading";
import { ticketsAPI } from "../services/api";
import "./MyTickets.css";

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const fetchMyTickets = async () => {
    try {
      setLoading(true);
      const response = await ticketsAPI.getMyTickets();
      setTickets(response.data.tickets || []);
      setError("");
    } catch (error) {
      console.error("Error fetching tickets:", error);
      setError("Failed to load your tickets. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTicket = async (ticketId, ticketNumber) => {
    try {
      const response = await ticketsAPI.downloadTicket(ticketId);

      // Create blob and download
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ticket-${ticketNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading ticket:", error);
      alert("Failed to download ticket. Please try again.");
    }
  };

  const handleDownloadAllTickets = async () => {
    try {
      const response = await ticketsAPI.downloadAllTickets();

      // Create blob and download
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `my-tickets-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading tickets:", error);
      alert("Failed to download tickets. Please try again.");
    }
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

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const isEventPast = (dateString) => {
    return new Date(dateString) < new Date();
  };

  const generateTicketId = (ticket) => {
    return `TK-${ticket._id.slice(-8).toUpperCase()}`;
  };

  const handlePrintTicket = (ticketId) => {
    // Remove any existing print-target class
    const existingTargets = document.querySelectorAll(".print-target");
    existingTargets.forEach((el) => el.classList.remove("print-target"));

    // Add print-target class to the specific ticket
    const ticketElement = document.querySelector(
      `[data-ticket-id="${ticketId}"]`
    );
    if (ticketElement) {
      ticketElement.classList.add("print-target");

      // Small delay to ensure class is applied before printing
      setTimeout(() => {
        window.print();
        // Remove the class after printing
        setTimeout(() => {
          ticketElement.classList.remove("print-target");
        }, 1000);
      }, 100);
    }
  };

  if (loading) {
    return <Loading message="Loading your tickets..." />;
  }

  return (
    <div className="my-tickets-page">
      <div className="container">
        <div className="page-header">
          <h1>My Tickets</h1>
          <p>View and manage your purchased event tickets</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-triangle"></i>
            {error}
            <button onClick={fetchMyTickets} className="btn btn-sm">
              Try Again
            </button>
          </div>
        )}

        {tickets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-content">
              <i className="fas fa-ticket-alt"></i>
              <h2>No Tickets Yet</h2>
              <p>
                You haven't purchased any tickets yet. Discover amazing events
                and get your first ticket!
              </p>
              <Link to="/" className="btn btn-primary">
                <i className="fas fa-search"></i>
                Browse Events
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="tickets-summary">
              <div className="summary-header">
                <h2>My Tickets Summary</h2>
                <button
                  className="btn btn-success"
                  onClick={handleDownloadAllTickets}
                  title="Download all tickets as PDF"
                >
                  <i className="fas fa-download"></i>
                  Download All PDF
                </button>
              </div>
              <div className="summary-stats">
                <div className="stat">
                  <span className="number">{tickets.length}</span>
                  <span className="label">Total Tickets</span>
                </div>
                <div className="stat">
                  <span className="number">
                    {
                      tickets.filter(
                        (ticket) => !isEventPast(ticket.event.date)
                      ).length
                    }
                  </span>
                  <span className="label">Upcoming Events</span>
                </div>
                <div className="stat">
                  <span className="number">
                    {formatPrice(
                      tickets.reduce(
                        (total, ticket) =>
                          total +
                          (ticket.totalAmount ||
                            (ticket.unitPrice || ticket.event.price || 0) *
                              (ticket.quantity || 1)),
                        0
                      )
                    )}
                  </span>
                  <span className="label">Total Spent</span>
                </div>
              </div>
            </div>

            <div className="tickets-list">
              {tickets.map((ticket) => (
                <div
                  key={ticket._id}
                  data-ticket-id={ticket._id}
                  className={`ticket-card ${
                    isEventPast(ticket.event.date) ? "past-event" : ""
                  }`}
                >
                  <div className="ticket-header">
                    <div className="ticket-info">
                      <h3 className="event-name">{ticket.event.name}</h3>
                      <span className="ticket-id">
                        Ticket ID: {generateTicketId(ticket)}
                      </span>
                    </div>
                    <div className="ticket-status">
                      {isEventPast(ticket.event.date) ? (
                        <span className="status past">
                          <i className="fas fa-clock"></i>
                          Past Event
                        </span>
                      ) : (
                        <span className="status upcoming">
                          <i className="fas fa-calendar-check"></i>
                          Upcoming
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="ticket-details">
                    <div className="detail-grid">
                      <div className="detail-item">
                        <i className="fas fa-calendar"></i>
                        <div>
                          <span className="label">Date & Time</span>
                          <span className="value">
                            {formatDate(ticket.event.date)}
                          </span>
                        </div>
                      </div>

                      <div className="detail-item">
                        <i className="fas fa-map-marker-alt"></i>
                        <div>
                          <span className="label">Location</span>
                          <span className="value">{ticket.event.location}</span>
                        </div>
                      </div>

                      <div className="detail-item">
                        <i className="fas fa-money-bill-wave"></i>
                        <div>
                          <span className="label">Price Paid</span>
                          <span className="value">
                            {formatPrice(
                              ticket.totalAmount ||
                                (ticket.unitPrice || ticket.event.price || 0) *
                                  (ticket.quantity || 1)
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="detail-item">
                        <i className="fas fa-shopping-cart"></i>
                        <div>
                          <span className="label">Purchased On</span>
                          <span className="value">
                            {new Date(ticket.purchaseDate).toLocaleDateString(
                              "en-US"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {ticket.event.description && (
                      <div className="event-description">
                        <p>{ticket.event.description}</p>
                      </div>
                    )}
                  </div>

                  <div className="ticket-actions">
                    <Link
                      to={`/events/${ticket.event._id}`}
                      className="btn btn-outline"
                    >
                      <i className="fas fa-info-circle"></i>
                      View Event Details
                    </Link>

                    <button
                      className="btn btn-primary"
                      onClick={() => handlePrintTicket(ticket._id)}
                    >
                      <i className="fas fa-print"></i>
                      Print Ticket
                    </button>

                    <button
                      className="btn btn-success"
                      onClick={() =>
                        handleDownloadTicket(ticket._id, ticket.ticketNumber)
                      }
                    >
                      <i className="fas fa-download"></i>
                      Download PDF
                    </button>
                  </div>

                  {/* QR Code placeholder */}
                  <div className="ticket-qr">
                    <div className="qr-placeholder">
                      <i className="fas fa-qrcode"></i>
                      <span>QR Code</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MyTickets;
