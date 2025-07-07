import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import EventCard from "../components/EventCard";
import Loading from "../components/Loading";
import Modal from "../components/Modal";
import { eventsAPI } from "../services/api";
import "./ManageEvents.css";

const ManageEvents = () => {
  const { user, isAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    date: "",
    location: "",
    charges: "",
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await eventsAPI.getAll();
      setEvents(response.data.events || []);
      setError("");
    } catch (error) {
      console.error("Error fetching events:", error);
      setError("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEvent(null);
    setFormData({
      name: "",
      description: "",
      date: "",
      location: "",
      charges: "",
    });
    setShowModal(true);
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      description: event.description || "",
      date: new Date(event.date).toISOString().slice(0, 16),
      location: event.location,
      charges: event.charges.toString(),
    });
    setShowModal(true);
  };

  const handleDelete = async (eventId) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      try {
        await eventsAPI.delete(eventId);
        setEvents(events.filter((event) => event._id !== eventId));
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
        charges: parseFloat(formData.charges),
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
            {events.map((event) => (
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
              <label htmlFor="name">Event Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
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
              <label htmlFor="charges">Ticket Price *</label>
              <input
                type="number"
                id="charges"
                name="charges"
                value={formData.charges}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
              />
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
