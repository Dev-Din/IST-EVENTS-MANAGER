class CSVGenerator {
  static generateCSV(data, headers) {
    if (!data || !data.length) {
      return "No data available";
    }

    // Create CSV header
    const csvHeaders = headers.join(",");

    // Create CSV rows
    const csvRows = data.map((row) => {
      return headers
        .map((header) => {
          const value = this.getNestedValue(row, header);
          // Escape commas and quotes in values
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || "";
        })
        .join(",");
    });

    return [csvHeaders, ...csvRows].join("\n");
  }

  static getNestedValue(obj, path) {
    return path.split(".").reduce((current, key) => {
      if (current && typeof current === "object") {
        return current[key];
      }
      return current;
    }, obj);
  }

  static generateUsersCSV(users) {
    // Safety check: ensure we only process the users array passed to us
    if (!users || !Array.isArray(users)) {
      console.error("CSV Generator: Invalid users data provided");
      return "No data available";
    }

    const headers = [
      "username",
      "email",
      "fullName",
      "role",
      "country",
      "currency",
      "isActive",
      "emailVerified",
      "lastLogin",
      "createdAt",
    ];

    // Process only the users provided - no additional filtering here
    const processedData = users.map((user) => {
      if (!user || typeof user !== "object") {
        console.warn("CSV Generator: Invalid user object found:", user);
        return null;
      }
      return {
        username: user.username || "",
        email: user.email || "",
        fullName: user.fullName || "",
        role: user.role || "",
        country: user.country || "",
        currency: user.currency || "",
        isActive: user.isActive ? "Yes" : "No",
        emailVerified: user.emailVerified ? "Yes" : "No",
        lastLogin: user.lastLogin
          ? new Date(user.lastLogin).toISOString()
          : "Never",
        createdAt: user.createdAt
          ? new Date(user.createdAt).toISOString()
          : "",
      };
    }).filter(Boolean); // Remove any null entries

    return this.generateCSV(processedData, headers);
  }

  static generateEventsCSV(events) {
    const headers = [
      "title",
      "description",
      "date",
      "location",
      "price",
      "currency",
      "capacity",
      "availableTickets",
      "soldTickets",
      "category",
      "status",
      "createdBy",
      "createdAt",
    ];

    const processedData = events.map((event) => ({
      title: event.title,
      description: event.description,
      date: new Date(event.date).toISOString(),
      location: event.location,
      price: event.price,
      currency: event.currency,
      capacity: event.capacity,
      availableTickets: event.availableTickets,
      soldTickets: event.capacity - event.availableTickets,
      category: event.category,
      status: event.status,
      createdBy: event.createdBy?.fullName || event.createdBy?.username || "",
      createdAt: new Date(event.createdAt).toISOString(),
    }));

    return this.generateCSV(processedData, headers);
  }

  static generateTicketsCSV(tickets) {
    const headers = [
      "ticketNumber",
      "eventTitle",
      "userName",
      "userEmail",
      "quantity",
      "totalPrice",
      "currency",
      "status",
      "paymentStatus",
      "paymentMethod",
      "purchaseDate",
    ];

    const processedData = tickets.map((ticket) => ({
      ticketNumber: ticket.ticketNumber,
      eventTitle: ticket.event?.title || "",
      userName: ticket.user?.fullName || ticket.user?.username || "",
      userEmail: ticket.user?.email || "",
      quantity: ticket.quantity,
      totalPrice: ticket.totalPrice,
      currency: ticket.event?.currency || "",
      status: ticket.status,
      paymentStatus: ticket.paymentStatus,
      paymentMethod: ticket.paymentMethod,
      purchaseDate: new Date(ticket.purchaseDate).toISOString(),
    }));

    return this.generateCSV(processedData, headers);
  }

  static generateRevenueCSV(revenueData) {
    const headers = [
      "period",
      "totalRevenue",
      "totalTickets",
      "averageTicketPrice",
    ];

    const processedData = revenueData.map((item) => ({
      period: `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
      totalRevenue: item.totalRevenue || 0,
      totalTickets: item.totalTickets || 0,
      averageTicketPrice: item.averageTicketPrice || 0,
    }));

    return this.generateCSV(processedData, headers);
  }
}

module.exports = CSVGenerator;
