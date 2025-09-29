const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const EmailMasker = require("./emailMasker");

class PDFTicketGenerator {
  constructor() {
    this.pageWidth = 595; // A4 width in points
    this.pageHeight = 842; // A4 height in points
    this.margin = 50;
  }

  async generateTicket(ticket, event, user) {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: this.margin,
          info: {
            Title: `Ticket - ${event.title}`,
            Author: "LegitEvents",
            Subject: `Event Ticket for ${event.title}`,
            Creator: "LegitEvents System",
          },
        });

        const buffers = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Generate QR code for ticket verification
        const qrCodeData = JSON.stringify({
          ticketNumber: ticket.ticketNumber,
          eventId: event._id,
          userId: user._id,
          purchaseDate: ticket.purchaseDate,
        });

        const qrCodeBuffer = await QRCode.toBuffer(qrCodeData, {
          errorCorrectionLevel: "H", // Higher error correction
          type: "png",
          quality: 0.95,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });

        // Header Section - Clean and Professional
        const headerY = this.margin;

        // Logo and Title
        doc
          .fontSize(28)
          .fillColor("#007bff")
          .text("LegitEvents", this.margin, headerY, {
            align: "center",
          });

        doc
          .fontSize(12)
          .fillColor("#6c757d")
          .text(
            "East Africa's Premier Event Management Platform",
            this.margin,
            headerY + 35,
            {
              align: "center",
            }
          );

        // Main Ticket Title
        doc
          .fontSize(24)
          .fillColor("#000000")
          .text("EVENT TICKET", this.margin, headerY + 60, {
            align: "center",
          });

        // Main Content Area - Better Layout
        const contentStartY = headerY + 120;
        const contentWidth = this.pageWidth - 2 * this.margin;
        const contentHeight = 400;

        // Draw main ticket border
        doc
          .rect(this.margin, contentStartY, contentWidth, contentHeight)
          .stroke("#007bff")
          .lineWidth(2);

        // Event Title Section
        const eventTitleY = contentStartY + 20;
        doc
          .fontSize(20)
          .fillColor("#000000")
          .text(event.title, this.margin + 20, eventTitleY, {
            width: contentWidth - 40,
            align: "center",
          });

        // Event Details Grid Layout
        const detailsStartY = eventTitleY + 50;
        const leftColumnX = this.margin + 20;
        const rightColumnX = this.margin + contentWidth / 2;
        const detailSpacing = 25;

        doc.fontSize(12).fillColor("#495057");

        // Left Column Details
        const eventDate = new Date(event.date);
        let currentY = detailsStartY;

        // Date & Time
        doc
          .fontSize(11)
          .fillColor("#6c757d")
          .text("DATE & TIME:", leftColumnX, currentY);
        doc
          .fontSize(12)
          .fillColor("#000000")
          .text(eventDate.toLocaleString(), leftColumnX, currentY + 15);
        currentY += 40;

        // Location
        doc
          .fontSize(11)
          .fillColor("#6c757d")
          .text("LOCATION:", leftColumnX, currentY);
        doc
          .fontSize(12)
          .fillColor("#000000")
          .text(event.location, leftColumnX, currentY + 15, { width: 200 });
        currentY += 40;

        // Attendee
        doc
          .fontSize(11)
          .fillColor("#6c757d")
          .text("ATTENDEE:", leftColumnX, currentY);
        doc
          .fontSize(12)
          .fillColor("#000000")
          .text(user.fullName || user.username, leftColumnX, currentY + 15);
        currentY += 40;

        // Email
        doc
          .fontSize(11)
          .fillColor("#6c757d")
          .text("EMAIL:", leftColumnX, currentY);
        doc
          .fontSize(12)
          .fillColor("#000000")
          .text(EmailMasker.maskEmail(user.email), leftColumnX, currentY + 15, {
            width: 200,
          });

        // Right Column Details
        currentY = detailsStartY;

        // Ticket Number
        doc
          .fontSize(11)
          .fillColor("#6c757d")
          .text("TICKET NUMBER:", rightColumnX, currentY);
        doc
          .fontSize(12)
          .fillColor("#000000")
          .text(ticket.ticketNumber, rightColumnX, currentY + 15);
        currentY += 40;

        // Quantity
        doc
          .fontSize(11)
          .fillColor("#6c757d")
          .text("QUANTITY:", rightColumnX, currentY);
        doc
          .fontSize(12)
          .fillColor("#000000")
          .text(
            `${ticket.quantity} ticket${ticket.quantity > 1 ? "s" : ""}`,
            rightColumnX,
            currentY + 15
          );
        currentY += 40;

        // Total Paid
        doc
          .fontSize(11)
          .fillColor("#6c757d")
          .text("TOTAL PAID:", rightColumnX, currentY);
        doc
          .fontSize(14)
          .fillColor("#28a745")
          .text(
            `${event.currency} ${ticket.totalPrice.toLocaleString()}`,
            rightColumnX,
            currentY + 15
          );

        // QR Code Section - Better Positioned
        const qrCodeX = this.margin + contentWidth - 140;
        const qrCodeY = detailsStartY + 20;

        // QR Code Background
        doc
          .rect(qrCodeX - 10, qrCodeY - 10, 130, 130)
          .fill("#f8f9fa")
          .stroke("#dee2e6");

        // QR Code Image
        doc.image(qrCodeBuffer, qrCodeX, qrCodeY, {
          width: 110,
          height: 110,
        });

        // QR Code Label
        doc
          .fontSize(10)
          .fillColor("#6c757d")
          .text("Scan for verification", qrCodeX, qrCodeY + 115, {
            width: 110,
            align: "center",
          });

        // Terms and Conditions Section
        const termsY = contentStartY + contentHeight + 20;
        doc
          .fontSize(12)
          .fillColor("#495057")
          .text("Terms & Conditions:", this.margin, termsY);

        const termsStartY = termsY + 20;
        const terms = [
          "• This ticket is valid only for the specified event and date",
          "• Please arrive 30 minutes before the event starts",
          "• Bring a valid ID for verification at the venue",
          "• Tickets are non-transferable and non-refundable",
          "• LegitEvents reserves the right to refuse entry",
          "• By attending, you consent to photography and filming",
        ];

        let termsYPos = termsStartY;
        terms.forEach((term) => {
          doc
            .fontSize(10)
            .fillColor("#6c757d")
            .text(term, this.margin, termsYPos, {
              width: contentWidth,
            });
          termsYPos += 15;
        });

        // Footer Section
        const footerY = this.pageHeight - this.margin - 60;

        // Footer background
        doc
          .rect(this.margin, footerY, contentWidth, 50)
          .fill("#f8f9fa")
          .stroke("#dee2e6");

        // Footer content
        doc
          .fontSize(10)
          .fillColor("#6c757d")
          .text(
            `Generated on: ${new Date().toLocaleString()}`,
            this.margin + 15,
            footerY + 15
          );

        doc
          .fontSize(10)
          .fillColor("#6c757d")
          .text(
            "For support: support@legitevents.com",
            this.margin + contentWidth - 200,
            footerY + 15,
            { align: "right" }
          );

        // Subtle watermark - moved to background
        doc
          .fontSize(48)
          .fillColor("#f8f9fa")
          .text("LEGITEVENTS", this.margin, this.pageHeight / 2 - 24, {
            align: "center",
            width: contentWidth,
          });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateBulkTickets(tickets, events, users) {
    const doc = new PDFDocument({ size: "A4", margin: this.margin });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      return pdfData;
    });

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const event = events.find(
        (e) => e._id.toString() === ticket.event.toString()
      );
      const user = users.find(
        (u) => u._id.toString() === ticket.user.toString()
      );

      if (i > 0) doc.addPage();

      // Generate individual ticket content (simplified version)
      doc
        .fontSize(16)
        .text(`Ticket ${i + 1} of ${tickets.length}`, { align: "center" });
      doc.fontSize(14).text(event.title, { align: "center" });
      doc.text(`Ticket: ${ticket.ticketNumber}`);
      doc.text(`Attendee: ${user.fullName || user.username}`);
      doc.text(`Date: ${new Date(event.date).toLocaleString()}`);
      doc.text(`Location: ${event.location}`);
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on("end", () => {
        resolve(Buffer.concat(buffers));
      });
    });
  }
}

module.exports = new PDFTicketGenerator();
