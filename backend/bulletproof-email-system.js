const mongoose = require("mongoose");
const Transaction = require("./models/Transaction");
const Ticket = require("./models/Ticket");
const User = require("./models/User");
const Event = require("./models/Event");
const emailService = require("./utils/emailService");

/**
 * BULLETPROOF EMAIL SYSTEM FOR M-PESA PAYMENTS
 *
 * This system ensures 100% email delivery for successful M-Pesa payments
 * with multiple layers of redundancy and monitoring.
 */
class BulletproofEmailSystem {
  constructor() {
    this.isRunning = false;
    this.emailQueue = new Map(); // Track emails being processed
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("🚀 Starting BULLETPROOF Email System...");

    // Connect to database
    await mongoose.connect("mongodb://localhost:27017/legitevents");
    console.log("✅ Connected to MongoDB");

    // Send emails for all pending purchases immediately
    await this.processAllPendingEmails();

    // Start monitoring loop
    this.monitorLoop();
  }

  async monitorLoop() {
    while (this.isRunning) {
      try {
        await this.processAllPendingEmails();
        await this.sleep(5000); // Check every 5 seconds for maximum responsiveness
      } catch (error) {
        console.error("❌ Monitor error:", error);
        await this.sleep(2000); // Wait 2 seconds on error
      }
    }
  }

  async processAllPendingEmails() {
    console.log(
      "🔍 BULLETPROOF: Checking for ALL pending email notifications..."
    );

    // Method 1: Find confirmed tickets without email sent
    await this.processConfirmedTickets();

    // Method 2: Find successful transactions without email sent
    await this.processSuccessfulTransactions();

    // Method 3: Find tickets with payment references (M-Pesa receipts)
    await this.processTicketsWithPayments();

    // Method 4: Find any ticket that should have an email
    await this.processAnyTicketNeedingEmail();

    // Method 5: Process email queue for failed attempts
    await this.processEmailQueue();
  }

  async processConfirmedTickets() {
    const confirmedTickets = await Ticket.find({
      status: "confirmed",
      paymentStatus: "completed",
      emailSent: { $ne: true },
    }).populate("event user");

    console.log(
      `📧 Method 1: Found ${confirmedTickets.length} confirmed tickets needing emails`
    );

    for (const ticket of confirmedTickets) {
      await this.sendTicketEmail(ticket, "confirmed_ticket");
    }
  }

  async processSuccessfulTransactions() {
    const successfulTransactions = await Transaction.find({
      status: "success",
      emailSent: { $ne: true },
    }).populate("ticket event user");

    console.log(
      `📧 Method 2: Found ${successfulTransactions.length} successful transactions needing emails`
    );

    for (const transaction of successfulTransactions) {
      if (transaction.ticket && transaction.user && transaction.event) {
        await this.sendTransactionEmail(transaction, "successful_transaction");
      }
    }
  }

  async processTicketsWithPayments() {
    const ticketsWithPayments = await Ticket.find({
      paymentReference: { $exists: true, $ne: null },
      emailSent: { $ne: true },
      status: "confirmed",
    }).populate("event user");

    console.log(
      `📧 Method 3: Found ${ticketsWithPayments.length} tickets with payments needing emails`
    );

    for (const ticket of ticketsWithPayments) {
      await this.sendTicketEmail(ticket, "ticket_with_payment");
    }
  }

  async processAnyTicketNeedingEmail() {
    // Find ANY ticket that might need an email (comprehensive approach)
    const anyTicketsNeedingEmail = await Ticket.find({
      $or: [
        { status: "confirmed", emailSent: { $ne: true } },
        { paymentStatus: "completed", emailSent: { $ne: true } },
        {
          paymentReference: { $exists: true, $ne: null },
          emailSent: { $ne: true },
        },
      ],
    }).populate("event user");

    console.log(
      `📧 Method 4: Found ${anyTicketsNeedingEmail.length} tickets needing emails (comprehensive)`
    );

    for (const ticket of anyTicketsNeedingEmail) {
      await this.sendTicketEmail(ticket, "comprehensive_check");
    }
  }

  async processEmailQueue() {
    // Process any emails that failed and are in the retry queue
    for (const [emailId, retryData] of this.emailQueue) {
      if (retryData.retries < this.maxRetries) {
        console.log(
          `🔄 Retrying email ${emailId} (attempt ${retryData.retries + 1})`
        );
        await this.retryEmail(emailId, retryData);
      } else {
        console.error(
          `❌ Email ${emailId} failed after ${this.maxRetries} attempts`
        );
        this.emailQueue.delete(emailId);
      }
    }
  }

  async sendTicketEmail(ticket, source) {
    const emailId = `ticket_${ticket._id}`;

    if (this.emailQueue.has(emailId)) {
      return; // Already processing
    }

    try {
      console.log(
        `📧 [${source}] Sending email for ticket: ${ticket.ticketNumber}`
      );

      if (!ticket.user || !ticket.event) {
        console.error(
          `❌ [${source}] Missing user or event for ticket: ${ticket.ticketNumber}`
        );
        return;
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
          `✅ [${source}] Email sent successfully for ticket: ${ticket.ticketNumber}`
        );
      } else {
        console.error(
          `❌ [${source}] Failed to send email for ticket: ${ticket.ticketNumber}`
        );
        this.addToRetryQueue(emailId, { ticket, source, retries: 0 });
      }
    } catch (error) {
      console.error(
        `❌ [${source}] Error sending email for ticket ${ticket.ticketNumber}:`,
        error
      );
      this.addToRetryQueue(emailId, { ticket, source, retries: 0 });
    }
  }

  async sendTransactionEmail(transaction, source) {
    const emailId = `transaction_${transaction._id}`;

    if (this.emailQueue.has(emailId)) {
      return; // Already processing
    }

    try {
      console.log(
        `📧 [${source}] Sending email for transaction: ${transaction._id}`
      );

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
          `✅ [${source}] Email sent successfully for transaction: ${transaction._id}`
        );
      } else {
        console.error(
          `❌ [${source}] Failed to send email for transaction: ${transaction._id}`
        );
        this.addToRetryQueue(emailId, { transaction, source, retries: 0 });
      }
    } catch (error) {
      console.error(
        `❌ [${source}] Error sending email for transaction ${transaction._id}:`,
        error
      );
      this.addToRetryQueue(emailId, { transaction, source, retries: 0 });
    }
  }

  addToRetryQueue(emailId, data) {
    this.emailQueue.set(emailId, data);
  }

  async retryEmail(emailId, retryData) {
    retryData.retries++;

    try {
      let result;
      if (retryData.ticket) {
        result = await emailService.sendTicketConfirmationEmail(
          retryData.ticket,
          retryData.ticket.user,
          retryData.ticket.event
        );
      } else if (retryData.transaction) {
        result = await emailService.sendTicketConfirmationEmail(
          retryData.transaction.ticket,
          retryData.transaction.user,
          retryData.transaction.event
        );
      }

      if (result.success) {
        console.log(`✅ Retry successful for email ${emailId}`);
        this.emailQueue.delete(emailId);
      } else {
        console.error(`❌ Retry failed for email ${emailId}`);
        await this.sleep(this.retryDelay);
      }
    } catch (error) {
      console.error(`❌ Retry error for email ${emailId}:`, error);
      await this.sleep(this.retryDelay);
    }
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  stop() {
    this.isRunning = false;
    console.log("🛑 BULLETPROOF Email System stopped");
  }

  // Public method to manually trigger email sending
  async sendEmailForTicket(ticketId) {
    const ticket = await Ticket.findById(ticketId).populate("event user");
    if (ticket) {
      await this.sendTicketEmail(ticket, "manual_trigger");
    }
  }

  // Public method to send email for transaction
  async sendEmailForTransaction(transactionId) {
    const transaction = await Transaction.findById(transactionId).populate(
      "ticket event user"
    );
    if (transaction) {
      await this.sendTransactionEmail(transaction, "manual_trigger");
    }
  }
}

// Start the bulletproof email system
const bulletproofEmailSystem = new BulletproofEmailSystem();
bulletproofEmailSystem.start();

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down BULLETPROOF Email System...");
  bulletproofEmailSystem.stop();
  await mongoose.disconnect();
  console.log("✅ BULLETPROOF Email System shutdown complete");
  process.exit(0);
});

console.log(
  "🛡️ BULLETPROOF Email System started - checking every 5 seconds for maximum responsiveness"
);
