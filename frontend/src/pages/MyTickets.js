import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Loading from "../components/Loading";
import TicketDownload from "../components/TicketDownload";
import { ticketsAPI } from "../services/api";
import "./MyTickets.css";

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showTicketDownload, setShowTicketDownload] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const fetchMyTickets = async () => {
    try {
      setLoading(true);
      const response = await ticketsAPI.getMyTickets();
      const ticketsData = response.data.data || [];
      // Filter out tickets with null/undefined events
      const validTickets = ticketsData.filter(
        (ticket) => ticket && ticket.event && ticket.event !== null
      );
      setTickets(validTickets);
      setError("");
    } catch (error) {
      console.error("Error fetching tickets:", error);
      setError("Failed to load your tickets. Please try again later.");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return "Date to be confirmed";
    }
    try {
      const options = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      };
      return new Date(dateString).toLocaleDateString("en-US", options);
    } catch (error) {
      return "Invalid date";
    }
  };

  const formatPrice = (price) => {
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
      if (isNaN(eventDate.getTime())) {
        return false;
      }
      return eventDate < new Date();
    } catch (error) {
      return false;
    }
  };

  const generateTicketId = (ticket) => {
    if (!ticket || !ticket._id) {
      return "TK-UNKNOWN";
    }
    try {
      return `TK-${ticket._id.slice(-8).toUpperCase()}`;
    } catch (error) {
      return "TK-UNKNOWN";
    }
  };

  const handleDownloadTicket = (ticket) => {
    setSelectedTicket(ticket);
    setShowTicketDownload(true);
  };

  const handleCloseTicketDownload = () => {
    setSelectedTicket(null);
    setShowTicketDownload(false);
  };

  // Pagination logic
  const totalPages = Math.ceil(tickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTickets = tickets.slice(startIndex, endIndex);

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
              <div className="summary-stats">
                <div className="stat">
                  <span className="number">{tickets.length}</span>
                  <span className="label">Total Tickets</span>
                </div>
                <div className="stat">
                  <span className="number">
                    {
                      tickets.filter(
                        (ticket) =>
                          ticket?.event?.date &&
                          !isEventPast(ticket.event.date)
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
                            (ticket.unitPrice || ticket?.event?.price || 0) *
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
              {paginatedTickets.map((ticket) => {
                const event = ticket?.event;
                const eventDate = event?.date || null;

                return (
                  <div
                    key={ticket._id}
                    data-ticket-id={ticket._id}
                    className={`ticket-card ${
                      eventDate && isEventPast(eventDate) ? "past-event" : ""
                    }`}
                  >
                    <div className="ticket-header">
                      <div className="ticket-info">
                        <h3 className="event-name">
                          {event?.title || event?.name || "Unnamed Event"}
                        </h3>
                        <span className="ticket-id">
                          Ticket ID: {generateTicketId(ticket)}
                        </span>
                      </div>
                      <div className="ticket-status">
                        {eventDate && isEventPast(eventDate) ? (
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
                              {formatDate(eventDate)}
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
                                ? new Date(
                                    ticket.purchaseDate
                                  ).toLocaleDateString("en-US")
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
                        onClick={() => handleDownloadTicket(ticket)}
                      >
                        <i className="fas fa-download"></i>
                        Download Ticket
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

            {tickets.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={tickets.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                showPageInfo={true}
                showItemsPerPage={true}
                onItemsPerPageChange={(newItemsPerPage) => {
                  setItemsPerPage(newItemsPerPage);
                  setCurrentPage(1);
                }}
              />
            )}
          </>
        )}
      </div>

      {showTicketDownload && selectedTicket && (
        <TicketDownload
          ticket={selectedTicket}
          onClose={handleCloseTicketDownload}
        />
      )}
    </div>
  );
};

export default MyTickets;
