const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    // Configure based on environment
    if (process.env.NODE_ENV === "production") {
      // Production email configuration (e.g., SendGrid, AWS SES)
      return nodemailer.createTransport({
        service: "gmail", // or your preferred service
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } else {
      // Development: Use Ethereal Email for testing
      return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        auth: {
          user: "ethereal.user@ethereal.email",
          pass: "ethereal.pass",
        },
      });
    }
  }

  async sendEmail(options) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || "LegitEvents <noreply@legitevents.com>",
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);

      if (process.env.NODE_ENV === "development") {
        console.log("✅ Email sent successfully");
        console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
      }

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Email sending failed:", error);
      return { success: false, error: error.message };
    }
  }

  // Welcome email for new users
  async sendWelcomeEmail(user) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; }
          .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to LegitEvents!</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.fullName || user.username}!</h2>
            <p>Thank you for joining LegitEvents, East Africa's premier event management platform.</p>
            <p>Your account has been successfully created with the following details:</p>
            <ul>
              <li><strong>Username:</strong> ${user.username}</li>
              <li><strong>Email:</strong> ${user.email}</li>
              <li><strong>Country:</strong> ${user.country}</li>
            </ul>
            <p>You can now:</p>
            <ul>
              <li>Browse and discover amazing events</li>
              <li>Purchase tickets securely</li>
              <li>Manage your bookings</li>
              <li>Update your profile</li>
            </ul>
            <a href="${
              process.env.FRONTEND_URL || "http://localhost:3000"
            }" class="button">
              Start Exploring Events
            </a>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} LegitEvents. All rights reserved.</p>
            <p>East Africa's Premier Event Management Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject: "🎉 Welcome to LegitEvents!",
      html,
      text: `Welcome to LegitEvents, ${
        user.fullName || user.username
      }! Your account has been successfully created.`,
    });
  }

  // Ticket confirmation email
  async sendTicketConfirmationEmail(ticket, user, event) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .ticket-info { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin: 15px 0; }
          .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; }
          .qr-code { text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎫 Ticket Confirmation</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.fullName || user.username}!</h2>
            <p>Your ticket purchase has been confirmed! Here are your ticket details:</p>
            
            <div class="ticket-info">
              <h3>📅 Event Details</h3>
              <p><strong>Event:</strong> ${event.title}</p>
              <p><strong>Date:</strong> ${new Date(
                event.date
              ).toLocaleDateString()}</p>
              <p><strong>Location:</strong> ${event.location}</p>
              <p><strong>Ticket Number:</strong> ${ticket.ticketNumber}</p>
              <p><strong>Quantity:</strong> ${ticket.quantity}</p>
              <p><strong>Total Paid:</strong> ${
                event.currency
              } ${ticket.totalPrice.toLocaleString()}</p>
            </div>

            <p><strong>Important:</strong> Please bring this email or save your ticket number for event entry.</p>
            
            <div style="margin: 20px 0; padding: 15px; background: #fef3c7; border-radius: 8px;">
              <p><strong>⚠️ Event Guidelines:</strong></p>
              <ul>
                <li>Arrive 30 minutes before the event starts</li>
                <li>Bring a valid ID for verification</li>
                <li>Tickets are non-transferable</li>
                <li>No refunds 24 hours before the event</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} LegitEvents. All rights reserved.</p>
            <p>For support, contact us at support@legitevents.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject: `🎫 Ticket Confirmation - ${event.title}`,
      html,
      text: `Your ticket for ${event.title} has been confirmed. Ticket Number: ${ticket.ticketNumber}`,
    });
  }

  // Event reminder email
  async sendEventReminderEmail(user, event, ticket) {
    const eventDate = new Date(event.date);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .reminder-box { background: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 15px; margin: 15px 0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Event Reminder</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.fullName || user.username}!</h2>
            
            <div class="reminder-box">
              <h3>🚨 Don't Forget!</h3>
              <p><strong>${event.title}</strong></p>
              <p>📅 <strong>${eventDate.toLocaleDateString()}</strong> at <strong>${eventDate.toLocaleTimeString()}</strong></p>
              <p>📍 <strong>${event.location}</strong></p>
            </div>

            <p>Your event is coming up soon! Here are your ticket details:</p>
            <ul>
              <li><strong>Ticket Number:</strong> ${ticket.ticketNumber}</li>
              <li><strong>Quantity:</strong> ${ticket.quantity}</li>
            </ul>

            <p><strong>Reminders:</strong></p>
            <ul>
              <li>Arrive 30 minutes early</li>
              <li>Bring a valid ID</li>
              <li>Have your ticket number ready</li>
            </ul>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} LegitEvents. See you at the event!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject: `⏰ Reminder: ${event.title} - Tomorrow!`,
      html,
      text: `Reminder: ${event.title} is tomorrow at ${event.location}. Ticket: ${ticket.ticketNumber}`,
    });
  }

  // Admin notification for new registrations
  async sendAdminNotificationEmail(newUser) {
    const adminUsers = await require("../models/User").find({
      role: "super-admin",
      isActive: true,
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: #7c3aed; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .user-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👤 New User Registration</h1>
          </div>
          <div class="content">
            <p>A new user has registered on LegitEvents:</p>
            
            <div class="user-info">
              <p><strong>Username:</strong> ${newUser.username}</p>
              <p><strong>Email:</strong> ${newUser.email}</p>
              <p><strong>Full Name:</strong> ${
                newUser.fullName || "Not provided"
              }</p>
              <p><strong>Country:</strong> ${newUser.country}</p>
              <p><strong>Role:</strong> ${newUser.role}</p>
              <p><strong>Registration Date:</strong> ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const promises = adminUsers.map((admin) =>
      this.sendEmail({
        to: admin.email,
        subject: "👤 New User Registration - LegitEvents",
        html,
        text: `New user registered: ${newUser.username} (${newUser.email})`,
      })
    );

    return await Promise.all(promises);
  }
}

module.exports = new EmailService();
