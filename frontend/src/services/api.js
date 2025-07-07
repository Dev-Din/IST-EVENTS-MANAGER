import axios from "axios";

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  withCredentials: true, // Important for session-based auth
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(
      `Making ${config.method?.toUpperCase()} request to: ${config.url}`
    );
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// API methods
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (userData) => api.post("/auth/register", userData),
  logout: () => api.post("/auth/logout"),
  getMe: () => api.get("/auth/me"),
};

export const eventsAPI = {
  getAll: () => api.get("/events"),
  getById: (id) => api.get(`/events/${id}`),
  create: (eventData) => api.post("/events", eventData),
  update: (id, eventData) => api.put(`/events/${id}`, eventData),
  delete: (id) => api.delete(`/events/${id}`),
};

export const ticketsAPI = {
  purchase: (eventId) => api.post(`/tickets/purchase/${eventId}`),
  getMyTickets: () => api.get("/tickets/my-tickets"),
};

export const adminAPI = {
  getSubAdmins: () => api.get("/admin/sub-admins"),
  createSubAdmin: (userData) => api.post("/admin/sub-admins", userData),
  updateSubAdmin: (id, userData) =>
    api.put(`/admin/sub-admins/${id}`, userData),
  deleteSubAdmin: (id) => api.delete(`/admin/sub-admins/${id}`),
  getClients: () => api.get("/admin/clients"),
  deleteClient: (id) => api.delete(`/admin/clients/${id}`),
  getReports: (format) =>
    api.get(`/admin/reports/${format}`, { responseType: "blob" }),
  getDashboardStats: () => api.get("/admin/dashboard/stats"),
};

export default api;
