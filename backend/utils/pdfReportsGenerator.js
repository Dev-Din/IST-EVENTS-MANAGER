const PDFDocument = require("pdfkit");

class PDFReportsGenerator {
  constructor() {
    this.pageWidth = 595; // A4 width
    this.pageHeight = 842; // A4 height
    this.margin = 50;
  }

  // Helper method to get nested object values
  getNestedValue(obj, path) {
    return path.split(".").reduce((current, key) => {
      if (current && typeof current === "object") {
        return current[key];
      }
      return current;
    }, obj);
  }

  async generateReport(reportType, data, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: this.margin,
          info: {
            Title: `${reportType} Report - LegitEvents`,
            Author: "LegitEvents System",
            Subject: `${reportType} Analytics Report`,
            Creator: "LegitEvents Admin Panel",
          },
        });

        const buffers = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Generate report based on type
        this.generateHeader(doc, reportType, options);

        switch (reportType.toLowerCase()) {
          case "users":
            this.generateUsersReport(doc, data);
            break;
          case "events":
            this.generateEventsReport(doc, data);
            break;
          case "tickets":
            this.generateTicketsReport(doc, data);
            break;
          case "revenue":
            this.generateRevenueReport(doc, data);
            break;
          case "comprehensive":
            this.generateComprehensiveReport(doc, data);
            break;
          default:
            this.generateOverviewReport(doc, data);
        }

        this.generateFooter(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  generateHeader(doc, reportType, options) {
    // Header background
    doc.rect(0, 0, this.pageWidth, 80).fill("#2563eb");

    // Logo and title
    doc.fontSize(24).fillColor("white").text("🎫 LegitEvents", this.margin, 25);

    doc
      .fontSize(16)
      .text(
        `${reportType.toUpperCase()} REPORT`,
        this.pageWidth - this.margin - 200,
        25
      );

    // Report metadata
    doc
      .fontSize(10)
      .fillColor("white")
      .text(`Generated: ${new Date().toLocaleString()}`, this.margin, 55);

    if (options.startDate || options.endDate) {
      const dateRange = `Period: ${options.startDate || "Beginning"} to ${
        options.endDate || "Now"
      }`;
      doc.text(dateRange, this.pageWidth - this.margin - 250, 55);
    }

    // Reset position for content
    doc.y = 100;
    doc.fillColor("black");
  }

  generateUsersReport(doc, users) {
    doc.fontSize(16).text("USER ANALYTICS REPORT", this.margin, doc.y + 20);

    if (!users || !users.length) {
      doc.fontSize(12).text("No users found", this.margin, doc.y + 20);
      return;
    }

    // Summary stats
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.isActive).length;
    const roleBreakdown = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    doc
      .fontSize(12)
      .text(`Total Users: ${totalUsers}`, this.margin, doc.y + 15);
    doc.text(`Active Users: ${activeUsers}`, this.margin, doc.y + 5);

    // Role breakdown
    doc.text("Role Distribution:", this.margin, doc.y + 15);
    Object.entries(roleBreakdown).forEach(([role, count]) => {
      doc.text(`  • ${role}: ${count}`, this.margin + 20, doc.y + 5);
    });

    // Simple users list instead of complex table
    doc.text("Users List:", this.margin, doc.y + 20);
    users.slice(0, 20).forEach((user, index) => {
      doc.text(
        `${index + 1}. ${user.username} (${user.email}) - ${user.role}`,
        this.margin + 10,
        doc.y + 5
      );
    });

    if (users.length > 20) {
      doc.text(
        `... and ${users.length - 20} more users`,
        this.margin + 10,
        doc.y + 10
      );
    }
  }

  generateEventsReport(doc, events) {
    doc.fontSize(16).text("EVENTS ANALYTICS REPORT", this.margin, doc.y + 20);

    if (!events || !events.length) {
      doc.fontSize(12).text("No events found", this.margin, doc.y + 20);
      return;
    }

    const totalEvents = events.length;
    const publishedEvents = events.filter(
      (e) => e.status === "published"
    ).length;
    const totalCapacity = events.reduce((sum, e) => sum + (e.capacity || 0), 0);
    const totalSold = events.reduce(
      (sum, e) => sum + ((e.capacity || 0) - (e.availableTickets || 0)),
      0
    );

    doc
      .fontSize(12)
      .text(`Total Events: ${totalEvents}`, this.margin, doc.y + 15);
    doc.text(`Published Events: ${publishedEvents}`, this.margin, doc.y + 5);
    doc.text(`Total Capacity: ${totalCapacity}`, this.margin, doc.y + 5);
    doc.text(`Tickets Sold: ${totalSold}`, this.margin, doc.y + 5);

    // Simple events list
    doc.text("Events List:", this.margin, doc.y + 20);
    events.slice(0, 15).forEach((event, index) => {
      doc.text(
        `${index + 1}. ${event.title} - ${event.category} (${event.status})`,
        this.margin + 10,
        doc.y + 5
      );
    });

    if (events.length > 15) {
      doc.text(
        `... and ${events.length - 15} more events`,
        this.margin + 10,
        doc.y + 10
      );
    }
  }

  generateTicketsReport(doc, tickets) {
    doc.fontSize(16).text("TICKETS ANALYTICS REPORT", this.margin, doc.y + 20);

    if (!tickets || !tickets.length) {
      doc.fontSize(12).text("No tickets found", this.margin, doc.y + 20);
      return;
    }

    const totalTickets = tickets.length;
    const confirmedTickets = tickets.filter(
      (t) => t.status === "confirmed"
    ).length;
    const totalRevenue = tickets.reduce(
      (sum, t) => sum + (t.totalPrice || 0),
      0
    );

    doc
      .fontSize(12)
      .text(`Total Tickets: ${totalTickets}`, this.margin, doc.y + 15);
    doc.text(`Confirmed Tickets: ${confirmedTickets}`, this.margin, doc.y + 5);
    doc.text(
      `Total Revenue: ${totalRevenue.toLocaleString()}`,
      this.margin,
      doc.y + 5
    );

    // Simple tickets list
    doc.text("Recent Tickets:", this.margin, doc.y + 20);
    tickets.slice(0, 20).forEach((ticket, index) => {
      const eventTitle = ticket.event?.title || "Unknown Event";
      const userName = ticket.user?.username || "Unknown User";
      doc.text(
        `${index + 1}. ${ticket.ticketNumber} - ${eventTitle} (${userName})`,
        this.margin + 10,
        doc.y + 5
      );
    });

    if (tickets.length > 20) {
      doc.text(
        `... and ${tickets.length - 20} more tickets`,
        this.margin + 10,
        doc.y + 10
      );
    }
  }

  generateRevenueReport(doc, revenueData) {
    doc.fontSize(16).text("REVENUE ANALYTICS REPORT", this.margin, doc.y + 20);

    if (!revenueData || !revenueData.length) {
      doc.fontSize(12).text("No revenue data found", this.margin, doc.y + 20);
      return;
    }

    const totalRevenue = revenueData.reduce(
      (sum, item) => sum + (item.totalRevenue || 0),
      0
    );
    const totalTickets = revenueData.reduce(
      (sum, item) => sum + (item.totalTickets || 0),
      0
    );
    const avgTicketPrice = totalTickets > 0 ? totalRevenue / totalTickets : 0;

    doc
      .fontSize(12)
      .text(
        `Total Revenue: ${totalRevenue.toLocaleString()}`,
        this.margin,
        doc.y + 15
      );
    doc.text(`Total Tickets: ${totalTickets}`, this.margin, doc.y + 5);
    doc.text(
      `Average Ticket Price: ${avgTicketPrice.toFixed(2)}`,
      this.margin,
      doc.y + 5
    );

    // Revenue breakdown by month
    doc.text("Monthly Revenue:", this.margin, doc.y + 20);
    revenueData.slice(0, 12).forEach((item, index) => {
      const period = `${item._id.year}-${String(item._id.month).padStart(
        2,
        "0"
      )}`;
      doc.text(
        `${period}: ${(item.totalRevenue || 0).toLocaleString()} (${
          item.totalTickets || 0
        } tickets)`,
        this.margin + 10,
        doc.y + 5
      );
    });
  }

  generateComprehensiveReport(doc, data) {
    doc
      .fontSize(18)
      .text("COMPREHENSIVE ANALYTICS REPORT", this.margin, doc.y + 20);

    // Summary section
    doc.fontSize(14).text("EXECUTIVE SUMMARY", this.margin, doc.y + 30);

    if (data.summary) {
      doc.fontSize(12);
      doc.text(
        `Total Users: ${data.summary.totalUsers || 0}`,
        this.margin,
        doc.y + 15
      );
      doc.text(
        `Total Events: ${data.summary.totalEvents || 0}`,
        this.margin,
        doc.y + 5
      );
      doc.text(
        `Total Tickets: ${data.summary.totalTickets || 0}`,
        this.margin,
        doc.y + 5
      );
      doc.text(
        `Total Revenue: ${(data.summary.totalRevenue || 0).toLocaleString()}`,
        this.margin,
        doc.y + 5
      );
    }

    // Add sections for each data type
    if (data.events && data.events.length > 0) {
      doc.addPage();
      this.generateEventsReport(doc, data.events);
    }

    if (data.users && data.users.length > 0) {
      doc.addPage();
      this.generateUsersReport(doc, data.users);
    }

    if (data.tickets && data.tickets.length > 0) {
      doc.addPage();
      this.generateTicketsReport(doc, data.tickets);
    }
  }

  generateFooter(doc) {
    const footerY = this.pageHeight - this.margin;

    doc
      .fontSize(8)
      .fillColor("#666")
      .text(
        "LegitEvents - East Africa's Premier Event Management Platform",
        this.margin,
        footerY - 20
      );

    doc.text(
      `Page generated on ${new Date().toLocaleString()}`,
      this.pageWidth - this.margin - 150,
      footerY - 20
    );
  }
}

module.exports = new PDFReportsGenerator();
