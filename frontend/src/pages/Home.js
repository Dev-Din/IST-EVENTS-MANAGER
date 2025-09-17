import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import EventCard from "../components/EventCard";
import Loading from "../components/Loading";
import { eventsAPI } from "../services/api";
import "./Home.css";

const Home = () => {
  const { isAuthenticated, user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await eventsAPI.getAll();
      setEvents(response.data.data || []);
      setError("");
    } catch (error) {
      console.error("Error fetching events:", error);
      setError("Failed to load events. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedEvents = events
    .filter(
      (event) =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(a.date) - new Date(b.date);
        case "name":
          return a.title.localeCompare(b.title);
        case "price":
          return a.price - b.price;
        default:
          return 0;
      }
    });

  if (loading) {
    return <Loading message="Loading events..." />;
  }

  return (
    <div className="home-page">
      {/* Hero Section */}
      <div
        className="hero-section"
        style={{
          backgroundImage: `url('/event-hero.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="hero-content">
          <div className="hero-logo">
            <img
              src="/legit-events.png"
              alt="LegitEvents Logo"
              className="hero-logo-img"
              onError={(e) => {
                console.log("Hero logo failed to load:", e);
                // Fallback to text logo if image fails
                e.target.style.display = "none";
                e.target.parentElement.innerHTML =
                  '<div class="hero-logo-fallback">🎉 LegitEvents</div>';
              }}
              onLoad={() => console.log("Hero logo loaded successfully")}
            />
          </div>
          <h1>Welcome to LegitEvents™</h1>
          <p>
            Discover Amazing Events Across East Africa - From Nairobi to
            Kampala, Book Your Next Unforgettable Experience
          </p>
          {!isAuthenticated && (
            <div className="hero-actions">
              <a href="/register" className="btn btn-primary">
                Get Started
              </a>
              <a href="/login" className="btn btn-outline">
                Sign In
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Events Section */}
      <div className="events-section">
        <div className="container">
          <div className="section-header">
            <h2>
              {isAuthenticated
                ? `Welcome back, ${user?.username}!`
                : "Upcoming Events"}
            </h2>

            {/* Search and Filter */}
            <div className="events-controls">
              <div className="search-bar">
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="price">Sort by Price</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
              <button onClick={fetchEvents} className="btn btn-sm">
                Try Again
              </button>
            </div>
          )}

          {filteredAndSortedEvents.length === 0 ? (
            <div className="no-events">
              <i className="fas fa-calendar-times"></i>
              <h3>No events found</h3>
              <p>
                {searchTerm
                  ? "Try adjusting your search criteria."
                  : "Check back later for upcoming events."}
              </p>
            </div>
          ) : (
            <div className="events-grid">
              {filteredAndSortedEvents.map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Call to Action */}
      {!isAuthenticated && (
        <div className="cta-section">
          <div className="container">
            <h2>Ready to discover events?</h2>
            <p>
              Join thousands of event-goers and never miss out on amazing
              experiences.
            </p>
            <a href="/register" className="btn btn-primary btn-lg">
              Create Your Account
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
