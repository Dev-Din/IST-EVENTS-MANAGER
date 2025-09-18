import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import Loading from "../components/Loading";
import { adminAPI } from "../services/api";
import "./ManageUsers.css";

const ManageClients = () => {
  const { isAdmin } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      setError("Access denied. Admin permissions required.");
      setLoading(false);
      return;
    }
    fetchClients();
  }, [isAdmin]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getClients();
      const clientsData = response.data.clients || [];
      setClients(clientsData);
      setError("");
    } catch (error) {
      console.error("Error fetching clients:", error);
      setError(
        "Failed to load clients. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (clientId, currentStatus) => {
    try {
      await adminAPI.toggleClientStatus(clientId, !currentStatus);
      setClients(
        clients.map((client) =>
          client._id === clientId
            ? { ...client, isActive: !currentStatus }
            : client
        )
      );
    } catch (error) {
      console.error("Error toggling client status:", error);
      alert("Failed to update client status");
    }
  };

  const handleSendEmail = (client) => {
    // In a real app, this would open an email composer or send via API
    window.open(`mailto:${client.email}`, "_blank");
  };

  const handleDeleteClick = (client) => {
    setClientToDelete(client);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;

    try {
      await adminAPI.deleteClient(clientToDelete._id);
      setClients(clients.filter((client) => client._id !== clientToDelete._id));
      setShowDeleteModal(false);
      setClientToDelete(null);
      // Show success message (you could add a toast notification here)
      console.log("Client deleted successfully");
    } catch (error) {
      console.error("Error deleting client:", error);
      setError("Failed to delete client. Please try again.");
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setClientToDelete(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown Date";

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      !searchTerm ||
      client.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && client.isActive) ||
      (filterStatus === "inactive" && !client.isActive);

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <Loading message="Loading clients..." />;
  }

  if (!isAdmin) {
    return (
      <div className="access-denied">
        <i className="fas fa-lock"></i>
        <h2>Access Denied</h2>
        <p>You need admin permissions to access this page.</p>
      </div>
    );
  }

  return (
    <div className="manage-users-page">
      <div className="container">
        <div className="page-header">
          <h1>Manage Clients</h1>
          <p>View and manage client accounts and activity</p>
        </div>

        <div className="filters-bar">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <div className="users-count">
            {filteredClients.length} of {clients.length} Clients
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-triangle"></i>
            {error}
            <button onClick={fetchClients} className="btn btn-sm">
              Try Again
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="summary-content">
              <h3>{clients.length}</h3>
              <p>Total Clients</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon">
              <i className="fas fa-user-check"></i>
            </div>
            <div className="summary-content">
              <h3>{clients.filter((c) => c.isActive).length}</h3>
              <p>Active Clients</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon">
              <i className="fas fa-ticket-alt"></i>
            </div>
            <div className="summary-content">
              <h3>
                {clients.reduce(
                  (sum, c) => sum + (c.stats?.totalTickets || 0),
                  0
                )}
              </h3>
              <p>Total Tickets Sold</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon">
              <i className="fas fa-dollar-sign"></i>
            </div>
            <div className="summary-content">
              <h3>
                {formatCurrency(
                  clients.reduce(
                    (sum, c) => sum + (c.stats?.totalSpent || 0),
                    0
                  )
                )}
              </h3>
              <p>Total Revenue</p>
            </div>
          </div>
        </div>

        {filteredClients.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-users"></i>
            <h3>No Clients Found</h3>
            <p>
              {searchTerm
                ? "No clients match your search criteria."
                : "No clients have registered yet."}
            </p>
          </div>
        ) : (
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Activity</th>
                  <th>Last Login</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client._id}>
                    <td>
                      <div className="user-info">
                        <div className="user-avatar">
                          <i className="fas fa-user"></i>
                        </div>
                        <div>
                          <div className="user-name">
                            {client.fullName || client.username}
                          </div>
                          <div className="user-username">
                            @{client.username}
                          </div>
                          <div className="user-meta">
                            Joined{" "}
                            {client.createdAt
                              ? formatDate(client.createdAt)
                              : "Unknown Date"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="contact-info">
                        <div>{client.email}</div>
                        {client.phone && (
                          <div className="phone">{client.phone}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="activity-info">
                        <div className="activity-stat">
                          <i className="fas fa-ticket-alt"></i>
                          {client.stats?.totalTickets || 0} tickets
                        </div>
                        <div className="activity-stat">
                          <i className="fas fa-money-bill-wave"></i>
                          {formatCurrency(client.stats?.totalSpent || 0)}
                        </div>
                      </div>
                    </td>
                    <td>
                      {client.lastLogin
                        ? formatDate(client.lastLogin)
                        : "Never"}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          client.isActive ? "active" : "inactive"
                        }`}
                      >
                        {client.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleSendEmail(client)}
                          className="btn btn-sm btn-outline"
                          title="Send Email"
                        >
                          <i className="fas fa-envelope"></i>
                        </button>
                        <button
                          onClick={() =>
                            handleToggleStatus(client._id, client.isActive)
                          }
                          className={`btn btn-sm ${
                            client.isActive ? "btn-outline" : "btn-success"
                          }`}
                          title={client.isActive ? "Deactivate" : "Activate"}
                        >
                          <i
                            className={`fas ${
                              client.isActive ? "fa-ban" : "fa-check"
                            }`}
                          ></i>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(client)}
                          className="btn btn-sm btn-danger"
                          title="Delete Client"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Confirm Delete</h3>
              <button className="modal-close" onClick={handleDeleteCancel}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="delete-confirmation">
                <div className="warning-icon">
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <p>
                  Are you sure you want to delete the client{" "}
                  <strong>
                    {clientToDelete?.fullName || clientToDelete?.username}
                  </strong>
                  ?
                </p>
                <p className="warning-text">
                  This action cannot be undone. All client data will be
                  permanently removed.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={handleDeleteCancel}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm}>
                <i className="fas fa-trash"></i>
                Delete Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageClients;
