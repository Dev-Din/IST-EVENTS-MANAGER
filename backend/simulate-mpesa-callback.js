const mongoose = require("mongoose");
const Transaction = require("./models/Transaction");
const Ticket = require("./models/Ticket");
const User = require("./models/User");
const Event = require("./models/Event");
const emailService = require("./utils/emailService");
require("dotenv").config();

async function simulateMpesaCallback(accountReference, mpesaReceiptNumber) {
  try {
    console.log(
      `🔧 Simulating M-Pesa callback for account: ${accountReference}`
    );

    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/legitevents"
    );
    console.log("📡 Connected to MongoDB");

    // Find the transaction by account reference
    const transaction = await Transaction.findOne({
      accountReference,
    }).populate("ticket user event");

    if (!transaction) {
      console.log("❌ Transaction not found");
      return { success: false, error: "Transaction not found" };
    }

    console.log("✅ Transaction found:", transaction._id);
    console.log("📊 Current status:", transaction.status);

    if (transaction.status === "success") {
      console.log("✅ Payment already processed");
      return { success: true, message: "Payment already processed" };
    }

    // Simulate successful callback data
    const callbackData = {
      success: true,
      merchantRequestID: transaction.merchantRequestID,
      checkoutRequestID: transaction.checkoutRequestID,
      resultCode: 0,
      resultDesc: "Success",
      amount: transaction.amount,
      mpesaReceiptNumber: mpesaReceiptNumber,
      transactionDate: new Date().toISOString(),
      phoneNumber: transaction.phoneNumber,
      accountReference: transaction.accountReference,
    };

    // Mark transaction as successful
    await transaction.markSuccessful(callbackData);
    console.log("✅ Transaction marked as successful");

    // Update ticket status
    if (transaction.ticket) {
      transaction.ticket.status = "confirmed";
      transaction.ticket.paymentStatus = "completed";
      transaction.ticket.paymentReference = callbackData.mpesaReceiptNumber;
      await transaction.ticket.save();
      console.log("✅ Ticket confirmed");

      // Update event available tickets
      if (transaction.event) {
        await Event.findByIdAndUpdate(transaction.event._id, {
          $inc: { availableTickets: -transaction.ticket.quantity },
        });
        console.log("✅ Event tickets updated");
      }

      // Send email
      if (transaction.user && transaction.event) {
        console.log("📧 Sending ticket confirmation email...");

        try {
          const result = await emailService.sendTicketConfirmationEmail(
            transaction.ticket,
            transaction.user,
            transaction.event
          );

          if (result.success) {
            console.log("✅ Email sent successfully");
            transaction.ticket.emailSent = true;
            transaction.emailSent = true;
            await transaction.ticket.save();
            await transaction.save();
          } else {
            console.log("❌ Email sending failed:", result.error);
          }
        } catch (emailError) {
          console.error("❌ Email error:", emailError);
        }
      }
    }

    console.log("🎉 M-Pesa callback simulation completed!");
    return { success: true, message: "Payment processed successfully" };
  } catch (error) {
    console.error("❌ Error processing callback:", error);
    return { success: false, error: error.message };
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Export for use in other scripts
module.exports = { simulateMpesaCallback };

// If run directly, process the specific payment
if (require.main === module) {
  const accountReference = process.argv[2] || "TKT-1758814984965-K2UN6J9JB";
  const mpesaReceiptNumber = process.argv[3] || "TIPA25LT1O";

  simulateMpesaCallback(accountReference, mpesaReceiptNumber).then((result) => {
    console.log("Result:", result);
    process.exit(result.success ? 0 : 1);
  });
}
