import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../App";
import {
  formatEventCurrency,
  DEFAULT_EVENT_CURRENCY,
} from "../utils/eastAfricanCountries";
import "./EventCard.css";

const EventCard = ({ event, onEdit, onDelete, showActions = false }) => {
  const { isAuthenticated, isAdmin } = useAuth();

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

  const formatPrice = (price, currency) => {
    // Use event's currency or default to KES
    return formatEventCurrency(price, currency || DEFAULT_EVENT_CURRENCY.code);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { class: "status-draft", text: "Draft", icon: "fas fa-edit" },
      published: {
        class: "status-published",
        text: "Published",
        icon: "fas fa-check-circle",
      },
      cancelled: {
        class: "status-cancelled",
        text: "Cancelled",
        icon: "fas fa-times-circle",
      },
      completed: {
        class: "status-completed",
        text: "Completed",
        icon: "fas fa-check",
      },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`status-badge ${config.class}`}>
        <i className={config.icon}></i>
        {config.text}
      </span>
    );
  };

  return (
    <div className="event-card">
      <div className="event-card-header">
        <h3 className="event-title">{event.name}</h3>
        <div className="event-header-actions">
          {getStatusBadge(event.status)}
          {showActions && (
            <div className="event-actions">
              <button
                className="btn btn-sm btn-primary"
                onClick={() => onEdit(event)}
                title="Edit Event"
              >
                <i className="fas fa-edit"></i>
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => onDelete(event)}
                title="Delete Event"
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="event-details">
        <div className="event-info">
          <div className="info-item">
            <i className="fas fa-calendar"></i>
            <span>{formatDate(event.date)}</span>
          </div>

          <div className="info-item">
            <i className="fas fa-map-marker-alt"></i>
            <span>{event.location}</span>
          </div>

          <div className="info-item">
            <i className="fas fa-dollar-sign"></i>
            <span>{formatPrice(event.charges, event.currency)}</span>
          </div>
        </div>

        {event.description && (
          <p className="event-description">
            {event.description.length > 100
              ? `${event.description.substring(0, 100)}...`
              : event.description}
          </p>
        )}
      </div>

      <div className="event-card-footer">
        <Link to={`/events/${event._id}`} className="btn btn-outline">
          View Details
        </Link>

        {isAuthenticated && !showActions && (
          <Link to={`/purchase/${event._id}`} className="btn btn-primary">
            <i className="fas fa-ticket-alt"></i>
            Buy Ticket
          </Link>
        )}
      </div>

      {event.createdBy && (
        <div className="event-meta">
          <small>Created by: {event.createdBy.username || "Admin"}</small>
        </div>
      )}
    </div>
  );
};

export default EventCard;
