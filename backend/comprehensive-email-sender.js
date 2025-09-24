const mongoose = require("mongoose");
const Transaction = require("./models/Transaction");
const Ticket = require("./models/Ticket");
const User = require("./models/User");
const Event = require("./models/Event");
const emailService = require("./utils/emailService");

// Comprehensive email sending system
class EmailSender {
  constructor() {
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("🚀 Starting Comprehensive Email Sender...");

    // Connect to database
    await mongoose.connect("mongodb://localhost:27017/legitevents");
    console.log("✅ Connected to MongoDB");

    // Send emails for all pending purchases
    await this.sendAllPendingEmails();

    // Start monitoring loop
    this.monitorLoop();
  }

  async monitorLoop() {
    while (this.isRunning) {
      try {
        await this.sendAllPendingEmails();
        await this.sleep(10000); // Check every 10 seconds
      } catch (error) {
        console.error("❌ Monitor error:", error);
        await this.sleep(5000); // Wait 5 seconds on error
      }
    }
  }

  async sendAllPendingEmails() {
    console.log("🔍 Checking for all pending email notifications...");

    // Find all confirmed tickets without email sent
    const confirmedTickets = await Ticket.find({
      status: "confirmed",
      paymentStatus: "completed",
      emailSent: { $ne: true },
    }).populate("event user");

    console.log(
      `📧 Found ${confirmedTickets.length} tickets needing email notifications`
    );

    for (const ticket of confirmedTickets) {
      try {
        console.log(`📧 Sending email for ticket: ${ticket.ticketNumber}`);

        if (!ticket.user || !ticket.event) {
          console.error(
            `❌ Missing user or event for ticket: ${ticket.ticketNumber}`
          );
          continue;
        }

        const result = await emailService.sendTicketConfirmationEmail(
          ticket,
          ticket.user,
          ticket.event
        );

        if (result.success) {
          // Mark email as sent
          ticket.emailSent = true;
          await ticket.save();
          console.log(
            `✅ Email sent successfully for ticket: ${ticket.ticketNumber}`
          );
        } else {
          console.error(
            `❌ Failed to send email for ticket: ${ticket.ticketNumber}`
          );
        }
      } catch (error) {
        console.error(
          `❌ Error sending email for ticket ${ticket.ticketNumber}:`,
          error
        );
      }
    }

    // Also check for successful transactions without emails
    const successfulTransactions = await Transaction.find({
      status: "success",
      emailSent: { $ne: true },
    }).populate("ticket event user");

    console.log(
      `📧 Found ${successfulTransactions.length} transactions needing email notifications`
    );

    for (const transaction of successfulTransactions) {
      if (transaction.ticket && transaction.user && transaction.event) {
        try {
          console.log(`📧 Sending email for transaction: ${transaction._id}`);

          const result = await emailService.sendTicketConfirmationEmail(
            transaction.ticket,
            transaction.user,
            transaction.event
          );

          if (result.success) {
            // Mark email as sent
            transaction.emailSent = true;
            await transaction.save();
            console.log(
              `✅ Email sent successfully for transaction: ${transaction._id}`
            );
          } else {
            console.error(
              `❌ Failed to send email for transaction: ${transaction._id}`
            );
          }
        } catch (error) {
          console.error(
            `❌ Error sending email for transaction ${transaction._id}:`,
            error
          );
        }
      }
    }

    // Check for any tickets with payment references that might need emails
    const ticketsWithPayments = await Ticket.find({
      paymentReference: { $exists: true, $ne: null },
      emailSent: { $ne: true },
      status: "confirmed",
    }).populate("event user");

    console.log(
      `📧 Found ${ticketsWithPayments.length} tickets with payments needing email notifications`
    );

    for (const ticket of ticketsWithPayments) {
      try {
        console.log(`📧 Sending email for paid ticket: ${ticket.ticketNumber}`);

        if (!ticket.user || !ticket.event) {
          console.error(
            `❌ Missing user or event for paid ticket: ${ticket.ticketNumber}`
          );
          continue;
        }

        const result = await emailService.sendTicketConfirmationEmail(
          ticket,
          ticket.user,
          ticket.event
        );

        if (result.success) {
          // Mark email as sent
          ticket.emailSent = true;
          await ticket.save();
          console.log(
            `✅ Email sent successfully for paid ticket: ${ticket.ticketNumber}`
          );
        } else {
          console.error(
            `❌ Failed to send email for paid ticket: ${ticket.ticketNumber}`
          );
        }
      } catch (error) {
        console.error(
          `❌ Error sending email for paid ticket ${ticket.ticketNumber}:`,
          error
        );
      }
    }
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  stop() {
    this.isRunning = false;
    console.log("🛑 Email Sender stopped");
  }
}

// Start the email sender
const emailSender = new EmailSender();
emailSender.start();

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down Email Sender...");
  emailSender.stop();
  await mongoose.disconnect();
  console.log("✅ Email Sender shutdown complete");
  process.exit(0);
});

console.log(
  "📧 Comprehensive Email Sender started - will check for pending emails every 10 seconds"
);
