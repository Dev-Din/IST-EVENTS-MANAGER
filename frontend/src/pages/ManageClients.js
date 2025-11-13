import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import Loading from "../components/Loading";
import Pagination from "../components/Pagination";
import DownloadButton from "../components/DownloadButton";
import { adminAPI } from "../services/api";
import "./ManageUsers.css";

const ManageClients = () => {
  const { isAdmin } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchBy, setSearchBy] = useState("client"); // client, clientId, contact
  const [searchInput, setSearchInput] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

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

  const handleDeleteClient = async (clientId) => {
    try {
      await adminAPI.deleteClient(clientId);
      setClients(clients.filter((client) => client._id !== clientId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting client:", error);
      alert("Failed to delete client. Please try again.");
    }
  };

  const confirmDelete = (client) => {
    setDeleteConfirm({
      id: client._id,
      name: client.fullName || client.username,
      email: client.email,
    });
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
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

  const handleDownloadExport = async (format) => {
    try {
      const response = await adminAPI.exportData("users", {
        format: format,
        role: "client", // Filter for clients only
      });

      // Determine file extension and MIME type
      const fileExtension = format === "pdf" ? "pdf" : "csv";
      const mimeType = format === "pdf" ? "application/pdf" : "text/csv";

      // Create download link
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `clients-export.${fileExtension}`);
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error("Error exporting clients:", error);
      const errorMessage =
        error.response?.data?.message ||
        `Failed to export clients as ${format.toUpperCase()}. Please try again.`;
      alert(errorMessage);
    }
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setCurrentPage(1);
  };

  const filteredClients = clients.filter((client) => {
    let matchesSearch = true;

    // Real-time search filtering based on selected factor
    if (searchInput && searchInput.trim()) {
      const searchLower = searchInput.trim().toLowerCase();
      switch (searchBy) {
        case "clientId":
          matchesSearch = (client.userId || "")
            .toLowerCase()
            .includes(searchLower);
          break;
        case "client":
          matchesSearch =
            client.fullName?.toLowerCase().includes(searchLower) ||
            client.username.toLowerCase().includes(searchLower);
          break;
        case "contact":
          matchesSearch =
            client.email.toLowerCase().includes(searchLower) ||
            (client.phone && client.phone.toLowerCase().includes(searchLower));
          break;
        default:
          matchesSearch = true;
      }
    }

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && client.isActive) ||
      (filterStatus === "inactive" && !client.isActive);

    return matchesSearch && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  // Reset to page 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchInput, searchBy]);

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
          <h1 className="creative-header">Client Management</h1>
        </div>

        <div className="filters-bar">
          <div className="search-filters-group">
            <select
              value={searchBy}
              onChange={(e) => setSearchBy(e.target.value)}
              className="filter-select search-by-select"
            >
              <option value="client">Client</option>
              <option value="clientId">Client ID</option>
              <option value="contact">Contact</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select status-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <div className="search-actions">
              {searchInput && (
                <button
                  onClick={handleClearSearch}
                  className="btn btn-outline clear-btn"
                  title="Clear search"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          </div>

          <div className="actions-right">
            <DownloadButton
              onDownloadCSV={() => handleDownloadExport("csv")}
              onDownloadPDF={() => handleDownloadExport("pdf")}
              disabled={clients.length === 0}
            />
            <div className="users-count">
              {filteredClients.length} of {clients.length} Clients
            </div>
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
              {searchInput || filterStatus !== "all"
                ? "No clients match your search criteria."
                : "No clients have registered yet."}
            </p>
          </div>
        ) : (
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Client ID</th>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Activity</th>
                  <th>Last Login</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClients.map((client) => (
                  <tr key={client._id}>
                    <td>
                      <div className="user-id">
                        <span className="id-badge client-id">
                          {client.userId || "N/A"}
                        </span>
                      </div>
                    </td>
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
                        {client.stats?.lastTicketEvent && (
                          <div className="activity-stat last-event">
                            <i className="fas fa-calendar"></i>
                            Last: {client.stats.lastTicketEvent}
                          </div>
                        )}
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
                          onClick={() => confirmDelete(client)}
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

        {filteredClients.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredClients.length}
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
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Delete Client</h3>
              <button onClick={cancelDelete} className="close-btn">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-icon">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <p>
                Are you sure you want to delete this client? This action cannot
                be undone.
              </p>
              <div className="client-info">
                <strong>{deleteConfirm.name}</strong>
                <br />
                <span className="text-muted">{deleteConfirm.email}</span>
              </div>
              <div className="warning-text">
                <i className="fas fa-info-circle"></i>
                This will permanently remove the client account and all
                associated data.
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={cancelDelete} className="btn btn-outline">
                Cancel
              </button>
              <button
                onClick={() => handleDeleteClient(deleteConfirm.id)}
                className="btn btn-danger"
              >
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
