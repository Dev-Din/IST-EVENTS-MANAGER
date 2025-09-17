import React, { useState, useEffect } from "react";
import EventCard from "../components/EventCard";
import Loading from "../components/Loading";
import Modal from "../components/Modal";
import { eventsAPI } from "../services/api";
import {
  EVENT_CURRENCIES,
  DEFAULT_EVENT_CURRENCY,
} from "../utils/eastAfricanCountries";
import "./ManageEvents.css";

const ManageEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    price: "",
    capacity: "",
    currency: DEFAULT_EVENT_CURRENCY.code,
    category: "conference",
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await eventsAPI.getAll();

      // Ensure we have valid data
      const eventsData = response.data?.data || [];

      // Filter out any invalid events
      const validEvents = eventsData.filter(
        (event) => event && event._id && typeof event === "object"
      );

      setEvents(validEvents);
      setError("");
    } catch (error) {
      console.error("Error fetching events:", error);
      setError("Failed to load events");
      setEvents([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEvent(null);
    setFormData({
      title: "",
      description: "",
      date: "",
      location: "",
      price: "",
      capacity: "",
      currency: DEFAULT_EVENT_CURRENCY.code,
      category: "conference",
    });
    setShowModal(true);
  };

  const handleEdit = (event) => {
    // Safety check for valid event
    if (!event || !event._id) {
      console.error("Invalid event provided to handleEdit");
      return;
    }

    setEditingEvent(event);
    setFormData({
      title: event.title || "",
      description: event.description || "",
      date: event.date ? new Date(event.date).toISOString().slice(0, 16) : "",
      location: event.location || "",
      price: event.price ? event.price.toString() : "0",
      capacity: event.capacity ? event.capacity.toString() : "1",
      currency: event.currency || DEFAULT_EVENT_CURRENCY.code,
      category: event.category || "conference",
    });
    setShowModal(true);
  };

  const handleDelete = async (eventId) => {
    // Safety check for valid eventId
    if (!eventId) {
      console.error("Invalid eventId provided to handleDelete");
      return;
    }

    if (window.confirm("Are you sure you want to delete this event?")) {
      try {
        await eventsAPI.delete(eventId);
        setEvents(events.filter((event) => event && event._id !== eventId));
      } catch (error) {
        console.error("Error deleting event:", error);
        alert("Failed to delete event");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const eventData = {
        ...formData,
        price: parseFloat(formData.price),
        capacity: parseInt(formData.capacity),
      };

      if (editingEvent) {
        await eventsAPI.update(editingEvent._id, eventData);
        setEvents(
          events.map((event) =>
            event._id === editingEvent._id ? { ...event, ...eventData } : event
          )
        );
      } else {
        const response = await eventsAPI.create(eventData);
        setEvents([response.data.event, ...events]);
      }

      setShowModal(false);
      setEditingEvent(null);
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Failed to save event");
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (loading) {
    return <Loading message="Loading events..." />;
  }

  return (
    <div className="manage-events-page">
      <div className="container">
        <div className="page-header">
          <h1>Manage Events</h1>
          <p>Create, edit, and manage all events in the system</p>
        </div>

        <div className="actions-bar">
          <button onClick={handleCreate} className="btn btn-primary">
            <i className="fas fa-plus"></i>
            Create New Event
          </button>
          <div className="events-count">{events.length} Events Total</div>
        </div>

        {error && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-triangle"></i>
            {error}
            <button onClick={fetchEvents} className="btn btn-sm">
              Try Again
            </button>
          </div>
        )}

        {events.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-calendar-plus"></i>
            <h3>No Events Yet</h3>
            <p>Create your first event to get started!</p>
            <button onClick={handleCreate} className="btn btn-primary">
              Create Event
            </button>
          </div>
        ) : (
          <div className="events-grid">
            {events
              .filter((event) => event && event._id) // Filter out undefined/null events
              .map((event) => (
                <EventCard
                  key={event._id}
                  event={event}
                  showActions={true}
                  onEdit={() => handleEdit(event)}
                  onDelete={() => handleDelete(event._id)}
                />
              ))}
          </div>
        )}

        {/* Event Form Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingEvent ? "Edit Event" : "Create New Event"}
          size="medium"
        >
          <form onSubmit={handleSubmit} className="event-form">
            <div className="form-group">
              <label htmlFor="title">Event Name *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Enter event name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Event description (optional)"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label htmlFor="date">Date & Time *</label>
              <input
                type="datetime-local"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">Location *</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                placeholder="Event location"
              />
            </div>

            <div className="form-group">
              <label htmlFor="price">Ticket Price *</label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label htmlFor="capacity">Event Capacity *</label>
              <input
                type="number"
                id="capacity"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                required
                min="1"
                placeholder="100"
              />
            </div>

            <div className="form-group">
              <label htmlFor="currency">Currency *</label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                required
              >
                {EVENT_CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.flag} {currency.name} ({currency.symbol})
                    {currency.isDefault && " - Default"}
                    {currency.isInternational && " - International"}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="conference">Conference</option>
                <option value="workshop">Workshop</option>
                <option value="seminar">Seminar</option>
                <option value="concert">Concert</option>
                <option value="festival">Festival</option>
                <option value="sports">Sports</option>
                <option value="networking">Networking</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingEvent ? "Update Event" : "Create Event"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};

export default ManageEvents;
