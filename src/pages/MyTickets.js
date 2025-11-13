import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Loading from "../components/Loading";
import { ticketsAPI } from "../services/api";
import { formatDate, formatDateTime } from "../utils/dateFormatter";
import "./MyTickets.css";

const MyTickets = () => {
  // Initialize state safely with empty array
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingTicketId, setDownloadingTicketId] = useState(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const fetchMyTickets = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await ticketsAPI.getMyTickets();

      // Normalize API response - handle different response structures
      let ticketsData = [];

      if (response?.data) {
        // Backend returns { success: true, data: tickets } or { success: true, tickets: tickets }
        ticketsData = response.data.data || response.data.tickets || [];
      }

      // Ensure we always have an array and filter out invalid entries
      const validTickets = Array.isArray(ticketsData)
        ? ticketsData.filter(
            (ticket) =>
              ticket !== null &&
              ticket !== undefined &&
              typeof ticket === "object" &&
              !Array.isArray(ticket)
          )
        : [];

      setTickets(validTickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      setError("Failed to load your tickets. Please try again later.");
      // Set empty array on error to prevent crashes
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTicket = async (ticketId, ticketNumber) => {
    if (!ticketId || !ticketNumber) {
      alert("Invalid ticket information");
      return;
    }

    try {
      setDownloadingTicketId(ticketId);
      const response = await ticketsAPI.downloadTicket(ticketId);

      // Validate response data
      if (!response.data) {
        throw new Error("No data received from server");
      }

      // Create blob and download
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ticket-${ticketNumber || ticketId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading ticket:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to download ticket. Please try again.";
      alert(errorMessage);
    } finally {
      setDownloadingTicketId(null);
    }
  };

  const handleDownloadAllTickets = async () => {
    if (safeTickets.length === 0) {
      alert("No tickets available to download");
      return;
    }

    try {
      setDownloadingAll(true);
      const response = await ticketsAPI.downloadAllTickets();

      // Validate response data
      if (!response.data) {
        throw new Error("No data received from server");
      }

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
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to download tickets. Please try again.";
      alert(errorMessage);
    } finally {
      setDownloadingAll(false);
    }
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined || isNaN(price)) {
      return "0.00";
    }
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const isEventPast = (dateString) => {
    if (!dateString) {
      return false;
    }
    try {
      const eventDate = new Date(dateString);
      if (Number.isNaN(eventDate.getTime())) {
        return false;
      }
      return eventDate < new Date();
    } catch (error) {
      return false;
    }
  };

  const generateTicketId = (ticket) => {
    if (!ticket?._id) {
      return "TK-UNKNOWN";
    }
    try {
      return `TK-${ticket._id.slice(-8).toUpperCase()}`;
    } catch (error) {
      return "TK-UNKNOWN";
    }
  };

  const handlePrintTicket = (ticketId) => {
    if (!ticketId) return;

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

  // Memoize safe tickets to prevent unnecessary recalculations
  // This filter ensures we never have null/undefined tickets
  const safeTickets = useMemo(() => {
    if (!Array.isArray(tickets)) {
      return [];
    }

    return tickets.filter((ticket) => {
      // Filter out null, undefined, or non-object values
      if (!ticket || typeof ticket !== "object") {
        return false;
      }
      // All tickets are valid, even if event is missing
      return true;
    });
  }, [tickets]);

  // Calculate stats safely
  const stats = useMemo(() => {
    const totalTickets = safeTickets.length;

    let upcomingEvents = 0;
    let totalSpent = 0;

    safeTickets.forEach((ticket) => {
      // Safely check for upcoming events
      const event = ticket?.event;
      if (event && event.date) {
        if (!isEventPast(event.date)) {
          upcomingEvents++;
        }
      }

      // Safely calculate total spent
      const amount =
        ticket.totalAmount ||
        (ticket.unitPrice || event?.price || 0) * (ticket.quantity || 1);
      totalSpent += amount || 0;
    });

    return { totalTickets, upcomingEvents, totalSpent };
  }, [safeTickets]);

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

        {safeTickets.length === 0 ? (
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
                  disabled={downloadingAll || safeTickets.length === 0}
                >
                  {downloadingAll ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-download"></i>
                      Download All PDF
                    </>
                  )}
                </button>
              </div>
              <div className="summary-stats">
                <div className="stat">
                  <span className="number">{stats.totalTickets}</span>
                  <span className="label">Total Tickets</span>
                </div>
                <div className="stat">
                  <span className="number">{stats.upcomingEvents}</span>
                  <span className="label">Upcoming Events</span>
                </div>
                <div className="stat">
                  <span className="number">
                    {formatPrice(stats.totalSpent)}
                  </span>
                  <span className="label">Total Spent</span>
                </div>
              </div>
            </div>

            <div className="tickets-list">
              {safeTickets.map((ticket) => {
                // Safely extract event data
                const event = ticket?.event;
                const eventDate = event?.date || null;

                // Handle tickets with missing event data
                if (!event || !eventDate) {
                  return (
                    <div
                      key={ticket._id || `missing-${Math.random()}`}
                      data-ticket-id={ticket._id}
                      className="ticket-card missing-event"
                    >
                      <div className="ticket-header">
                        <div className="ticket-info">
                          <h3 className="event-name">
                            Event details unavailable
                          </h3>
                          <span className="ticket-id">
                            Ticket ID: {generateTicketId(ticket)}
                          </span>
                        </div>
                        <div className="ticket-status">
                          <span className="status pending">
                            <i className="fas fa-info-circle"></i>
                            Pending Update
                          </span>
                        </div>
                      </div>
                      <div className="ticket-details">
                        <p className="missing-event-message">
                          This ticket is still linked to your account, but the
                          event information could not be loaded. Please contact
                          support if this persists.
                        </p>
                      </div>
                    </div>
                  );
                }

                // Render ticket with valid event data
                return (
                  <div
                    key={ticket._id}
                    data-ticket-id={ticket._id}
                    className={`ticket-card ${
                      isEventPast(eventDate) ? "past-event" : ""
                    }`}
                  >
                    <div className="ticket-header">
                      <div className="ticket-info">
                        <h3 className="event-name">
                          {event?.name || event?.title || "Unnamed Event"}
                        </h3>
                        <span className="ticket-id">
                          Ticket ID: {generateTicketId(ticket)}
                        </span>
                      </div>
                      <div className="ticket-status">
                        {isEventPast(eventDate) ? (
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
                              {eventDate
                                ? formatDateTime(eventDate)
                                : "Date to be confirmed"}
                            </span>
                          </div>
                        </div>

                        <div className="detail-item">
                          <i className="fas fa-map-marker-alt"></i>
                          <div>
                            <span className="label">Location</span>
                            <span className="value">
                              {event?.location || "TBA"}
                            </span>
                          </div>
                        </div>

                        <div className="detail-item">
                          <i className="fas fa-money-bill-wave"></i>
                          <div>
                            <span className="label">Price Paid</span>
                            <span className="value">
                              {formatPrice(
                                ticket.totalAmount ||
                                  (ticket.unitPrice || event?.price || 0) *
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
                              {ticket.purchaseDate
                                ? formatDate(ticket.purchaseDate)
                                : "Unknown date"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {event?.description && (
                        <div className="event-description">
                          <p>{event.description}</p>
                        </div>
                      )}
                    </div>

                    <div className="ticket-actions">
                      {event?._id && (
                        <Link
                          to={`/events/${event._id}`}
                          className="btn btn-outline"
                        >
                          <i className="fas fa-info-circle"></i>
                          View Event Details
                        </Link>
                      )}

                      <button
                        className="btn btn-primary"
                        onClick={() => handlePrintTicket(ticket._id)}
                        disabled={!ticket._id}
                      >
                        <i className="fas fa-print"></i>
                        Print Ticket
                      </button>

                      <button
                        className="btn btn-success"
                        onClick={() =>
                          handleDownloadTicket(ticket._id, ticket.ticketNumber)
                        }
                        disabled={
                          !ticket._id ||
                          !ticket.ticketNumber ||
                          downloadingTicketId === ticket._id
                        }
                      >
                        {downloadingTicketId === ticket._id ? (
                          <>
                            <i className="fas fa-spinner fa-spin"></i>
                            Downloading...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-download"></i>
                            Download PDF
                          </>
                        )}
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
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MyTickets;
