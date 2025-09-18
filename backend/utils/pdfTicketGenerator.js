const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

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
          errorCorrectionLevel: "M",
          type: "png",
          quality: 0.92,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });

        // Header with logo area
        doc
          .fontSize(24)
          .fillColor("#2563eb")
          .text("🎫 LegitEvents", this.margin, this.margin, {
            align: "center",
          });

        doc
          .fontSize(12)
          .fillColor("#666")
          .text("East Africa's Premier Event Management Platform", {
            align: "center",
          });

        // Ticket title
        doc
          .fontSize(20)
          .fillColor("#000")
          .text("EVENT TICKET", this.margin, this.margin + 80, {
            align: "center",
          });

        // Main ticket content area
        const contentY = this.margin + 120;

        // Event details box
        doc
          .rect(this.margin, contentY, this.pageWidth - 2 * this.margin, 200)
          .stroke("#e5e7eb");

        // Event information
        let currentY = contentY + 20;

        doc
          .fontSize(18)
          .fillColor("#1f2937")
          .text(event.title, this.margin + 20, currentY, { width: 300 });

        currentY += 40;

        doc.fontSize(12).fillColor("#374151");

        // Event details
        const eventDate = new Date(event.date);
        const eventDetails = [
          { label: "📅 Date & Time:", value: eventDate.toLocaleString() },
          { label: "📍 Location:", value: event.location },
          { label: "🎫 Ticket Number:", value: ticket.ticketNumber },
          { label: "👤 Attendee:", value: user.fullName || user.username },
          { label: "📧 Email:", value: user.email },
          { label: "🎟️ Quantity:", value: ticket.quantity.toString() },
          {
            label: "💰 Total Paid:",
            value: `${event.currency} ${ticket.totalPrice.toLocaleString()}`,
          },
        ];

        eventDetails.forEach((detail) => {
          doc
            .text(detail.label, this.margin + 20, currentY, {
              width: 120,
              continued: true,
            })
            .text(detail.value, { width: 300 });
          currentY += 25;
        });

        // QR Code
        doc.image(
          qrCodeBuffer,
          this.pageWidth - this.margin - 120,
          contentY + 20,
          {
            width: 100,
            height: 100,
          }
        );

        doc
          .fontSize(10)
          .fillColor("#6b7280")
          .text(
            "Scan for verification",
            this.pageWidth - this.margin - 120,
            contentY + 130,
            {
              width: 100,
              align: "center",
            }
          );

        // Terms and conditions
        currentY = contentY + 240;
        doc
          .fontSize(10)
          .fillColor("#6b7280")
          .text("Terms & Conditions:", this.margin, currentY);

        currentY += 15;
        const terms = [
          "• This ticket is valid only for the specified event and date",
          "• Please arrive 30 minutes before the event starts",
          "• Bring a valid ID for verification at the venue",
          "• Tickets are non-transferable and non-refundable",
          "• LegitEvents reserves the right to refuse entry",
          "• By attending, you consent to photography and filming",
        ];

        terms.forEach((term) => {
          doc.text(term, this.margin, currentY, {
            width: this.pageWidth - 2 * this.margin,
          });
          currentY += 12;
        });

        // Footer
        const footerY = this.pageHeight - this.margin - 40;
        doc
          .rect(this.margin, footerY - 10, this.pageWidth - 2 * this.margin, 50)
          .fill("#f3f4f6");

        doc
          .fontSize(10)
          .fillColor("#374151")
          .text(
            `Generated on: ${new Date().toLocaleString()}`,
            this.margin + 10,
            footerY
          );

        doc.text("For support: support@legitevents.com", { align: "right" });

        // Watermark
        doc
          .fontSize(60)
          .fillColor("#f3f4f6")
          .text("LEGITEVENTS", this.margin, this.pageHeight / 2 - 30, {
            align: "center",
            width: this.pageWidth - 2 * this.margin,
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
