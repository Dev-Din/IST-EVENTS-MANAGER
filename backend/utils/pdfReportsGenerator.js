const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// Brand colors matching the web app
const COLORS = {
  primary: "#2563eb", // Blue
  primaryDark: "#1d4ed8",
  secondary: "#64748b",
  success: "#059669",
  danger: "#dc2626",
  warning: "#f59e0b",
  textDark: "#1f2937",
  textMuted: "#6b7280",
  bgLight: "#f8fafc",
  bgWhite: "#ffffff",
  border: "#e5e7eb",
};

class PDFReportsGenerator {
  constructor() {
    this.pageWidth = 595; // A4 width
    this.pageHeight = 842; // A4 height
    this.margin = 50;
    this.logoPath = path.join(
      __dirname,
      "../../frontend/public/legit-events.png"
    );
  }

  // Format date as DD/MM/YYYY
  formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Format time as HH:MM:SS
  formatTime(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  // Format date and time together
  formatDateTime(dateString) {
    return `${this.formatDate(dateString)} ${this.formatTime(dateString)}`;
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
    const headerHeight = 100;
    const headerBgY = 0;

    // Beautiful gradient-like header background
    doc.rect(0, headerBgY, this.pageWidth, headerHeight).fill(COLORS.primary);

    // Add logo if exists
    const logoY = 20;
    const logoSize = 50;
    if (fs.existsSync(this.logoPath)) {
      try {
        doc.image(this.logoPath, this.margin, logoY, {
          width: logoSize,
          height: logoSize,
          fit: [logoSize, logoSize],
        });
      } catch (error) {
        console.log("Logo not found, using text fallback");
      }
    }

    // Company name and branding
    const textStartX = fs.existsSync(this.logoPath)
      ? this.margin + logoSize + 15
      : this.margin;
    doc
      .fontSize(22)
      .fillColor(COLORS.bgWhite)
      .text("LegitEvents", textStartX, logoY + 5, {
        width: 300,
      });

    doc
      .fontSize(9)
      .fillColor(COLORS.bgWhite)
      .opacity(0.9)
      .text(
        "East Africa's Premier Event Management Platform",
        textStartX,
        logoY + 28,
        {
          width: 300,
        }
      );

    // Report title on the right
    doc
      .fontSize(16)
      .fillColor(COLORS.bgWhite)
      .text(
        `${reportType.toUpperCase()} REPORT`,
        this.pageWidth - this.margin - 200,
        logoY + 10,
        {
          align: "right",
          width: 200,
        }
      );

    // Report metadata
    const metadataY = logoY + 50;
    const generatedDate = this.formatDate(new Date());
    const generatedTime = this.formatTime(new Date());

    doc
      .fontSize(9)
      .fillColor(COLORS.bgWhite)
      .opacity(0.85)
      .text(
        `Generated: ${generatedDate} ${generatedTime}`,
        this.margin,
        metadataY
      );

    if (options.startDate || options.endDate) {
      const startDate = options.startDate
        ? this.formatDate(options.startDate)
        : "Beginning";
      const endDate = options.endDate
        ? this.formatDate(options.endDate)
        : "Now";
      const dateRange = `Period: ${startDate} to ${endDate}`;
      doc.text(dateRange, this.pageWidth - this.margin - 250, metadataY, {
        align: "right",
        width: 250,
      });
    }

    // Reset position for content
    doc.y = headerHeight + 20;
    doc.fillColor(COLORS.textDark);
    doc.opacity(1);
  }

  // Helper to draw a card/box
  drawCard(doc, x, y, width, height, title, content) {
    // Card background
    doc
      .rect(x, y, width, height)
      .fillColor(COLORS.bgWhite)
      .fill()
      .strokeColor(COLORS.border)
      .lineWidth(1)
      .rect(x, y, width, height)
      .stroke();

    // Card title background
    doc
      .rect(x, y, width, 25)
      .fillColor(COLORS.bgLight)
      .fill();

    // Card title
    doc
      .fontSize(11)
      .fillColor(COLORS.primary)
      .text(title, x + 10, y + 7, {
        width: width - 20,
      });

    // Card content
    doc.fontSize(10).fillColor(COLORS.textDark);
    return y + 30;
  }

  generateUsersReport(doc, users) {
    const startY = doc.y;

    // Title section
    doc
      .fontSize(18)
      .fillColor(COLORS.primary)
      .text("USER ANALYTICS REPORT", this.margin, startY, {
        underline: true,
      });

    if (!users || !users.length) {
      doc
        .fontSize(12)
        .fillColor(COLORS.textMuted)
        .text("No users found", this.margin, doc.y + 20);
      return;
    }

    // Summary stats in cards
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.isActive).length;
    const roleBreakdown = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    let cardY = doc.y + 30;
    const cardWidth = (this.pageWidth - 2 * this.margin - 20) / 3;
    const cardHeight = 60;

    // Total Users Card
    this.drawCard(
      doc,
      this.margin,
      cardY,
      cardWidth,
      cardHeight,
      "Total Users",
      ""
    );
    doc
      .fontSize(20)
      .fillColor(COLORS.primary)
      .text(totalUsers.toString(), this.margin + 10, cardY + 30);

    // Active Users Card
    this.drawCard(
      doc,
      this.margin + cardWidth + 10,
      cardY,
      cardWidth,
      cardHeight,
      "Active Users",
      ""
    );
    doc
      .fontSize(20)
      .fillColor(COLORS.success)
      .text(activeUsers.toString(), this.margin + cardWidth + 20, cardY + 30);

    // Roles Card
    this.drawCard(
      doc,
      this.margin + (cardWidth + 10) * 2,
      cardY,
      cardWidth,
      cardHeight,
      "Roles",
      ""
    );
    const rolesText = Object.keys(roleBreakdown).length.toString();
    doc
      .fontSize(20)
      .fillColor(COLORS.secondary)
      .text(rolesText, this.margin + (cardWidth + 10) * 2 + 10, cardY + 30);

    // Role breakdown details
    doc.y = cardY + cardHeight + 20;
    doc.fontSize(12).fillColor(COLORS.textDark).text("Role Distribution:", this.margin, doc.y);
    doc.y += 15;
    Object.entries(roleBreakdown).forEach(([role, count]) => {
      doc
        .fontSize(10)
        .fillColor(COLORS.textDark)
        .text(`• ${role}: ${count}`, this.margin + 20, doc.y);
      doc.y += 12;
    });

    // Users list
    doc.y += 10;
    doc.fontSize(12).fillColor(COLORS.textDark).text("Users List:", this.margin, doc.y);
    doc.y += 15;
    users.slice(0, 20).forEach((user, index) => {
      if (doc.y > this.pageHeight - 100) {
        doc.addPage();
        doc.y = this.margin;
      }
      doc
        .fontSize(9)
        .fillColor(COLORS.textDark)
        .text(
          `${index + 1}. ${user.username || "N/A"} (${user.email || "N/A"}) - ${user.role || "N/A"}`,
          this.margin + 10,
          doc.y
        );
      doc.y += 12;
    });

    if (users.length > 20) {
      doc
        .fontSize(9)
        .fillColor(COLORS.textMuted)
        .text(
          `... and ${users.length - 20} more users`,
          this.margin + 10,
          doc.y
        );
    }
  }

  generateEventsReport(doc, events) {
    const startY = doc.y;

    doc
      .fontSize(18)
      .fillColor(COLORS.primary)
      .text("EVENTS ANALYTICS REPORT", this.margin, startY, {
        underline: true,
      });

    if (!events || !events.length) {
      doc
        .fontSize(12)
        .fillColor(COLORS.textMuted)
        .text("No events found", this.margin, doc.y + 20);
      return;
    }

    const totalEvents = events.length;
    const publishedEvents = events.filter((e) => e.status === "published")
      .length;
    const totalCapacity = events.reduce((sum, e) => sum + (e.capacity || 0), 0);
    const totalSold = events.reduce(
      (sum, e) => sum + ((e.capacity || 0) - (e.availableTickets || 0)),
      0
    );

    // Summary cards
    let cardY = doc.y + 30;
    const cardWidth = (this.pageWidth - 2 * this.margin - 30) / 4;
    const cardHeight = 60;

    const stats = [
      { label: "Total Events", value: totalEvents, color: COLORS.primary },
      {
        label: "Published",
        value: publishedEvents,
        color: COLORS.success,
      },
      { label: "Total Capacity", value: totalCapacity, color: COLORS.secondary },
      { label: "Tickets Sold", value: totalSold, color: COLORS.warning },
    ];

    stats.forEach((stat, index) => {
      this.drawCard(
        doc,
        this.margin + index * (cardWidth + 10),
        cardY,
        cardWidth,
        cardHeight,
        stat.label,
        ""
      );
      doc
        .fontSize(18)
        .fillColor(stat.color)
        .text(
          stat.value.toString(),
          this.margin + index * (cardWidth + 10) + 10,
          cardY + 30
        );
    });

    // Events list
    doc.y = cardY + cardHeight + 20;
    doc.fontSize(12).fillColor(COLORS.textDark).text("Events List:", this.margin, doc.y);
    doc.y += 15;
    events.slice(0, 15).forEach((event, index) => {
      if (doc.y > this.pageHeight - 100) {
        doc.addPage();
        doc.y = this.margin;
      }
      doc
        .fontSize(9)
        .fillColor(COLORS.textDark)
        .text(
          `${index + 1}. ${event.title || "N/A"} - ${event.category || "N/A"} (${event.status || "N/A"})`,
          this.margin + 10,
          doc.y
        );
      doc.y += 12;
    });

    if (events.length > 15) {
      doc
        .fontSize(9)
        .fillColor(COLORS.textMuted)
        .text(
          `... and ${events.length - 15} more events`,
          this.margin + 10,
          doc.y
        );
    }
  }

  generateTicketsReport(doc, tickets) {
    const startY = doc.y;

    doc
      .fontSize(18)
      .fillColor(COLORS.primary)
      .text("TICKETS ANALYTICS REPORT", this.margin, startY, {
        underline: true,
      });

    if (!tickets || !tickets.length) {
      doc
        .fontSize(12)
        .fillColor(COLORS.textMuted)
        .text("No tickets found", this.margin, doc.y + 20);
      return;
    }

    const totalTickets = tickets.length;
    const confirmedTickets = tickets.filter((t) => t.status === "confirmed")
      .length;
    const totalRevenue = tickets.reduce(
      (sum, t) => sum + (t.totalPrice || 0),
      0
    );

    // Summary cards
    let cardY = doc.y + 30;
    const cardWidth = (this.pageWidth - 2 * this.margin - 20) / 3;
    const cardHeight = 60;

    const stats = [
      { label: "Total Tickets", value: totalTickets, color: COLORS.primary },
      {
        label: "Confirmed",
        value: confirmedTickets,
        color: COLORS.success,
      },
      {
        label: "Total Revenue",
        value: `KES ${totalRevenue.toLocaleString()}`,
        color: COLORS.warning,
      },
    ];

    stats.forEach((stat, index) => {
      this.drawCard(
        doc,
        this.margin + index * (cardWidth + 10),
        cardY,
        cardWidth,
        cardHeight,
        stat.label,
        ""
      );
      doc
        .fontSize(stat.label === "Total Revenue" ? 12 : 18)
        .fillColor(stat.color)
        .text(
          stat.value.toString(),
          this.margin + index * (cardWidth + 10) + 10,
          cardY + 30,
          { width: cardWidth - 20 }
        );
    });

    // Tickets list
    doc.y = cardY + cardHeight + 20;
    doc.fontSize(12).fillColor(COLORS.textDark).text("Recent Tickets:", this.margin, doc.y);
    doc.y += 15;
    tickets.slice(0, 20).forEach((ticket, index) => {
      if (doc.y > this.pageHeight - 100) {
        doc.addPage();
        doc.y = this.margin;
      }
      const eventTitle = ticket.event?.title || "Unknown Event";
      const userName = ticket.user?.username || "Unknown User";
      doc
        .fontSize(9)
        .fillColor(COLORS.textDark)
        .text(
          `${index + 1}. ${ticket.ticketNumber || "N/A"} - ${eventTitle} (${userName})`,
          this.margin + 10,
          doc.y
        );
      doc.y += 12;
    });

    if (tickets.length > 20) {
      doc
        .fontSize(9)
        .fillColor(COLORS.textMuted)
        .text(
          `... and ${tickets.length - 20} more tickets`,
          this.margin + 10,
          doc.y
        );
    }
  }

  generateRevenueReport(doc, revenueData) {
    const startY = doc.y;

    doc
      .fontSize(18)
      .fillColor(COLORS.primary)
      .text("REVENUE ANALYTICS REPORT", this.margin, startY, {
        underline: true,
      });

    if (!revenueData || !revenueData.length) {
      doc
        .fontSize(12)
        .fillColor(COLORS.textMuted)
        .text("No revenue data found", this.margin, doc.y + 20);
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

    // Summary cards
    let cardY = doc.y + 30;
    const cardWidth = (this.pageWidth - 2 * this.margin - 20) / 3;
    const cardHeight = 60;

    const stats = [
      {
        label: "Total Revenue",
        value: `KES ${totalRevenue.toLocaleString()}`,
        color: COLORS.success,
      },
      { label: "Total Tickets", value: totalTickets, color: COLORS.primary },
      {
        label: "Avg Ticket Price",
        value: `KES ${avgTicketPrice.toFixed(2)}`,
        color: COLORS.warning,
      },
    ];

    stats.forEach((stat, index) => {
      this.drawCard(
        doc,
        this.margin + index * (cardWidth + 10),
        cardY,
        cardWidth,
        cardHeight,
        stat.label,
        ""
      );
      doc
        .fontSize(12)
        .fillColor(stat.color)
        .text(
          stat.value.toString(),
          this.margin + index * (cardWidth + 10) + 10,
          cardY + 30,
          { width: cardWidth - 20 }
        );
    });

    // Monthly revenue breakdown
    doc.y = cardY + cardHeight + 20;
    doc.fontSize(12).fillColor(COLORS.textDark).text("Monthly Revenue:", this.margin, doc.y);
    doc.y += 15;
    revenueData.slice(0, 12).forEach((item, index) => {
      if (doc.y > this.pageHeight - 100) {
        doc.addPage();
        doc.y = this.margin;
      }
      const period = `${item._id.year}-${String(item._id.month).padStart(2, "0")}`;
      doc
        .fontSize(9)
        .fillColor(COLORS.textDark)
        .text(
          `${period}: KES ${(item.totalRevenue || 0).toLocaleString()} (${
            item.totalTickets || 0
          } tickets)`,
          this.margin + 10,
          doc.y
        );
      doc.y += 12;
    });
  }

  generateComprehensiveReport(doc, data) {
    const startY = doc.y;

    // Main title
    doc
      .fontSize(20)
      .fillColor(COLORS.primary)
      .text("COMPREHENSIVE ANALYTICS REPORT", this.margin, startY, {
        underline: true,
      });

    // Executive Summary section
    doc.y += 30;
    doc
      .fontSize(14)
      .fillColor(COLORS.primaryDark)
      .text("EXECUTIVE SUMMARY", this.margin, doc.y);

    if (data.summary) {
      // Summary cards in a grid
      let cardY = doc.y + 25;
      const cardWidth = (this.pageWidth - 2 * this.margin - 30) / 4;
      const cardHeight = 70;

      const summaryStats = [
        {
          label: "Total Users",
          value: data.summary.totalUsers || 0,
          color: COLORS.primary,
        },
        {
          label: "Total Events",
          value: data.summary.totalEvents || 0,
          color: COLORS.success,
        },
        {
          label: "Total Tickets",
          value: data.summary.totalTickets || 0,
          color: COLORS.warning,
        },
        {
          label: "Total Revenue",
          value: `KES ${(data.summary.totalRevenue || 0).toLocaleString()}`,
          color: COLORS.secondary,
        },
      ];

      summaryStats.forEach((stat, index) => {
        this.drawCard(
          doc,
          this.margin + index * (cardWidth + 10),
          cardY,
          cardWidth,
          cardHeight,
          stat.label,
          ""
        );
        doc
          .fontSize(stat.label === "Total Revenue" ? 11 : 18)
          .fillColor(stat.color)
          .text(
            stat.value.toString(),
            this.margin + index * (cardWidth + 10) + 10,
            cardY + 30,
            { width: cardWidth - 20 }
          );
      });
    }

    // Add sections for each data type
    if (data.events && data.events.length > 0) {
      doc.addPage();
      doc.y = this.margin + 120; // Skip header area
      this.generateEventsReport(doc, data.events);
    }

    if (data.users && data.users.length > 0) {
      doc.addPage();
      doc.y = this.margin + 120; // Skip header area
      this.generateUsersReport(doc, data.users);
    }

    if (data.tickets && data.tickets.length > 0) {
      doc.addPage();
      doc.y = this.margin + 120; // Skip header area
      this.generateTicketsReport(doc, data.tickets);
    }
  }

  generateOverviewReport(doc, data) {
    doc
      .fontSize(18)
      .fillColor(COLORS.primary)
      .text("OVERVIEW REPORT", this.margin, doc.y, {
        underline: true,
      });

    doc
      .fontSize(12)
      .fillColor(COLORS.textMuted)
      .text("No specific data available", this.margin, doc.y + 20);
  }

  generateFooter(doc) {
    const footerY = this.pageHeight - this.margin;

    // Footer line
    doc
      .strokeColor(COLORS.border)
      .lineWidth(1)
      .moveTo(this.margin, footerY - 30)
      .lineTo(this.pageWidth - this.margin, footerY - 30)
      .stroke();

    doc
      .fontSize(8)
      .fillColor(COLORS.textMuted)
      .text(
        "LegitEvents - East Africa's Premier Event Management Platform",
        this.margin,
        footerY - 20
      );

    const footerDate = this.formatDate(new Date());
    const footerTime = this.formatTime(new Date());
    doc.text(
      `Generated: ${footerDate} ${footerTime}`,
      this.pageWidth - this.margin - 150,
      footerY - 20,
      {
        align: "right",
        width: 150,
      }
    );
  }
}

module.exports = new PDFReportsGenerator();
