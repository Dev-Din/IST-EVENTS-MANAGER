const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// LegitEvents brand colors
const COLORS = {
  primary: "#2563eb", // Blue primary
  primaryDark: "#1d4ed8", // Darker blue
  secondary: "#64748b", // Gray
  success: "#059669", // Green
  danger: "#dc2626", // Red
  textDark: "#1f2937", // Dark gray
  textMuted: "#6b7280", // Muted gray
  bgLight: "#f8fafc", // Light gray background
  white: "#ffffff",
};

class PDFGenerator {
  constructor() {
    this.doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });
    this.logoPath = path.join(
      __dirname,
      "../../frontend/public/legit-events.png"
    );
    this.currentY = 50;
    this.pageHeight = 842; // A4 height in points
    this.pageWidth = 595; // A4 width in points
    this.contentHeight = this.pageHeight - 100; // Account for margins
  }

  // Add header with logo and title
  addHeader(title, dateRange) {
    const startY = this.currentY;

    // Add logo (if exists)
    if (fs.existsSync(this.logoPath)) {
      this.doc.image(this.logoPath, 50, startY, { width: 60 });
    }

    // Company name and title
    this.doc
      .fontSize(24)
      .fillColor(COLORS.primary)
      .text("LegitEvents", 120, startY + 5)
      .fontSize(16)
      .fillColor(COLORS.textDark)
      .text(title, 120, startY + 35)
      .fontSize(12)
      .fillColor(COLORS.textMuted)
      .text(
        `Generated: ${new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        120,
        startY + 55
      )
      .text(`Period: ${dateRange}`, 120, startY + 70);

    // Add a line separator
    this.doc
      .strokeColor(COLORS.primary)
      .lineWidth(2)
      .moveTo(50, startY + 90)
      .lineTo(545, startY + 90)
      .stroke();

    this.currentY = startY + 110;
  }

  // Add section header
  addSectionHeader(title) {
    this.doc
      .fontSize(14)
      .fillColor(COLORS.primary)
      .text(title, 50, this.currentY);

    this.currentY += 25;
  }

  // Add key-value pair
  addKeyValue(key, value, isLarge = false) {
    const fontSize = isLarge ? 16 : 12;
    const valueColor = isLarge ? COLORS.primary : COLORS.textDark;

    this.doc
      .fontSize(fontSize)
      .fillColor(COLORS.textMuted)
      .text(key + ":", 50, this.currentY)
      .fillColor(valueColor)
      .text(value, 200, this.currentY);

    this.currentY += isLarge ? 25 : 18;
  }

  // Add table with auto-sizing
  addTable(headers, rows, maxRows = null) {
    const tableTop = this.currentY;
    const availableHeight = this.contentHeight - this.currentY;
    const headerHeight = 25;
    const rowHeight = 20;

    // Calculate how many rows can fit
    const maxPossibleRows = Math.floor(
      (availableHeight - headerHeight - 20) / rowHeight
    );
    const displayRows = maxRows
      ? Math.min(maxRows, rows.length, maxPossibleRows)
      : Math.min(rows.length, maxPossibleRows);

    // Calculate column widths
    const tableWidth = 495; // Available width
    const colWidth = tableWidth / headers.length;

    // Draw header
    this.doc
      .rect(50, tableTop, tableWidth, headerHeight)
      .fillColor(COLORS.primary)
      .fill()
      .fillColor(COLORS.white)
      .fontSize(10);

    headers.forEach((header, i) => {
      this.doc.text(header, 55 + i * colWidth, tableTop + 8, {
        width: colWidth - 10,
        align: "left",
      });
    });

    // Draw rows
    for (let i = 0; i < displayRows; i++) {
      const row = rows[i];
      const rowY = tableTop + headerHeight + i * rowHeight;

      // Alternate row colors
      this.doc
        .rect(50, rowY, tableWidth, rowHeight)
        .fillColor(i % 2 === 0 ? COLORS.white : COLORS.bgLight)
        .fill()
        .fillColor(COLORS.textDark)
        .fontSize(9);

      row.forEach((cell, j) => {
        this.doc.text(String(cell), 55 + j * colWidth, rowY + 6, {
          width: colWidth - 10,
          align: j === 0 ? "left" : "right",
          ellipsis: true,
        });
      });
    }

    // Add border
    this.doc
      .rect(50, tableTop, tableWidth, headerHeight + displayRows * rowHeight)
      .strokeColor(COLORS.secondary)
      .lineWidth(1)
      .stroke();

    this.currentY = tableTop + headerHeight + displayRows * rowHeight + 15;

    // Add note if not all rows are shown
    if (displayRows < rows.length) {
      this.doc
        .fontSize(10)
        .fillColor(COLORS.textMuted)
        .text(
          `... and ${rows.length - displayRows} more items`,
          50,
          this.currentY
        );
      this.currentY += 15;
    }
  }

  // Add summary cards in a grid
  addSummaryCards(cards) {
    const cardWidth = 120;
    const cardHeight = 80;
    const cardsPerRow = 4;
    const cardSpacing = 125;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const col = i % cardsPerRow;
      const row = Math.floor(i / cardsPerRow);
      const x = 50 + col * cardSpacing;
      const y = this.currentY + row * (cardHeight + 10);

      // Card background
      this.doc
        .rect(x, y, cardWidth, cardHeight)
        .fillColor(COLORS.bgLight)
        .fill()
        .strokeColor(COLORS.primary)
        .lineWidth(1)
        .stroke();

      // Card content
      this.doc
        .fontSize(20)
        .fillColor(COLORS.primary)
        .text(card.value, x + 10, y + 15, {
          width: cardWidth - 20,
          align: "center",
        })
        .fontSize(10)
        .fillColor(COLORS.textDark)
        .text(card.label, x + 10, y + 45, {
          width: cardWidth - 20,
          align: "center",
        });

      if (card.subtitle) {
        this.doc
          .fontSize(8)
          .fillColor(COLORS.textMuted)
          .text(card.subtitle, x + 10, y + 60, {
            width: cardWidth - 20,
            align: "center",
          });
      }
    }

    const rows = Math.ceil(cards.length / cardsPerRow);
    this.currentY += rows * (cardHeight + 10) + 10;
  }

  // Add footer
  addFooter() {
    const footerY = this.pageHeight - 40;

    this.doc
      .fontSize(10)
      .fillColor(COLORS.textMuted)
      .text(
        "Generated by LegitEvents - East African Event Management System",
        50,
        footerY,
        {
          align: "center",
          width: this.pageWidth - 100,
        }
      );
  }

  // Generate Sales Report PDF
  generateSalesReport(salesData, dateRange) {
    this.addHeader("Sales Report", dateRange);

    if (salesData.length === 0) {
      this.doc
        .fontSize(14)
        .fillColor(COLORS.textMuted)
        .text(
          "No sales data available for the selected period.",
          50,
          this.currentY
        );
      this.addFooter();
      return;
    }

    // Summary cards
    const totalSales = salesData.reduce(
      (sum, item) => sum + item.totalSales,
      0
    );
    const totalTickets = salesData.reduce(
      (sum, item) => sum + item.ticketCount,
      0
    );
    const avgTicketPrice = totalTickets > 0 ? totalSales / totalTickets : 0;

    this.addSummaryCards([
      { value: `KES ${totalSales.toLocaleString()}`, label: "Total Revenue" },
      { value: totalTickets.toString(), label: "Tickets Sold" },
      { value: `KES ${avgTicketPrice.toFixed(0)}`, label: "Avg. Price" },
      { value: salesData.length.toString(), label: "Sales Days" },
    ]);

    // Daily sales table
    this.addSectionHeader("Daily Sales Breakdown");
    this.addTable(
      ["Date", "Revenue (KES)", "Tickets", "Avg. Price"],
      salesData.map((item) => [
        new Date(item._id).toLocaleDateString(),
        item.totalSales.toLocaleString(),
        item.ticketCount.toString(),
        (item.totalSales / item.ticketCount).toFixed(0),
      ])
    );

    this.addFooter();
  }

  // Generate Events Report PDF
  generateEventsReport(eventsData, dateRange) {
    this.addHeader("Events Report", dateRange);

    if (eventsData.length === 0) {
      this.doc
        .fontSize(14)
        .fillColor(COLORS.textMuted)
        .text(
          "No events data available for the selected period.",
          50,
          this.currentY
        );
      this.addFooter();
      return;
    }

    // Summary cards
    const totalRevenue = eventsData.reduce(
      (sum, event) => sum + (event.revenue || 0),
      0
    );
    const totalTicketsSold = eventsData.reduce(
      (sum, event) => sum + (event.ticketsSold || 0),
      0
    );
    const totalCapacity = eventsData.reduce(
      (sum, event) => sum + (event.capacity || 0),
      0
    );

    this.addSummaryCards([
      { value: eventsData.length.toString(), label: "Total Events" },
      { value: `KES ${totalRevenue.toLocaleString()}`, label: "Total Revenue" },
      { value: totalTicketsSold.toString(), label: "Tickets Sold" },
      {
        value: `${((totalTicketsSold / totalCapacity) * 100).toFixed(1)}%`,
        label: "Fill Rate",
      },
    ]);

    // Events table
    this.addSectionHeader("Events Details");
    this.addTable(
      ["Event Name", "Date", "Sold", "Revenue", "Status"],
      eventsData.map((event) => [
        event.name || "Unnamed Event",
        new Date(event.date).toLocaleDateString(),
        `${event.ticketsSold || 0}/${event.capacity || 0}`,
        `${event.currency || "KES"} ${(event.revenue || 0).toLocaleString()}`,
        event.status || "Unknown",
      ])
    );

    this.addFooter();
  }

  // Generate Comprehensive Report PDF
  generateComprehensiveReport(data, dateRange) {
    this.addHeader("Comprehensive Report", dateRange);

    const { summary, eventsByCategory, topEvents } = data;

    // Overview cards
    this.addSummaryCards([
      {
        value: `KES ${(summary.totalRevenue || 0).toLocaleString()}`,
        label: "Total Revenue",
      },
      { value: (summary.totalTickets || 0).toString(), label: "Tickets Sold" },
      {
        value: `KES ${(summary.averageTicketPrice || 0).toFixed(0)}`,
        label: "Avg. Price",
      },
      { value: (topEvents?.length || 0).toString(), label: "Events" },
    ]);

    // Events by category
    if (eventsByCategory && eventsByCategory.length > 0) {
      this.addSectionHeader("Events by Category");
      this.addTable(
        ["Category", "Count", "Percentage"],
        eventsByCategory.map((cat) => {
          const total = eventsByCategory.reduce((sum, c) => sum + c.count, 0);
          return [
            cat._id || "Uncategorized",
            cat.count.toString(),
            `${((cat.count / total) * 100).toFixed(1)}%`,
          ];
        })
      );
    }

    // Top events
    if (topEvents && topEvents.length > 0) {
      this.addSectionHeader("Top Performing Events");
      this.addTable(
        ["Event Name", "Tickets Sold", "Revenue (KES)"],
        topEvents
          .slice(0, 10)
          .map((event) => [
            event.name || "Unnamed Event",
            (event.ticketsSold || 0).toString(),
            (event.revenue || 0).toLocaleString(),
          ])
      );
    }

    this.addFooter();
  }

  // Finalize and return buffer
  finalize() {
    this.doc.end();
    return this.doc;
  }
}

module.exports = PDFGenerator;
