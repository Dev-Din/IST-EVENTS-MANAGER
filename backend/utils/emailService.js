const nodemailer = require("nodemailer");
require("dotenv").config();

class EmailService {
  constructor() {
    this.transporter = null;
  }

  getTransporter() {
    if (!this.transporter) {
      this.transporter = this.createTransporter();
    }
    return this.transporter;
  }

  createTransporter() {
    // Priority order: SendGrid -> Gmail -> Ethereal

    // 1. Try SendGrid first (for production)
    if (
      process.env.SENDGRID_API_KEY &&
      process.env.SENDGRID_API_KEY.startsWith("SG.")
    ) {
      console.log("📧 Using SendGrid for email service");
      return nodemailer.createTransport({
        service: "sendgrid",
        auth: {
          user: "apikey",
          pass: process.env.SENDGRID_API_KEY,
        },
      });
    }

    // 2. Try Gmail if SendGrid is not available
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      console.log("📧 Using Gmail for email service");
      return nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    }

    // 3. Fallback to Ethereal (for testing)
    console.log("📧 Using Ethereal for email service (testing mode)");
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: "ghfljoi26msxa6fo@ethereal.email",
        pass: "npDRM59thMhuFyaNeS",
      },
    });
  }

  async sendEmail(options) {
    try {
      const mailOptions = {
        from:
          process.env.EMAIL_FROM ||
          process.env.EMAIL_USER ||
          "LegitEvents <noreply@legitevents.com>",
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments || [],
      };

      const info = await this.getTransporter().sendMail(mailOptions);

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

  // Ticket confirmation email with PDF attachment
  async sendTicketConfirmationEmail(ticket, user, event) {
    const pdfTicketGenerator = require("./pdfTicketGenerator");

    try {
      // Generate PDF ticket
      const pdfBuffer = await pdfTicketGenerator.generateTicket(
        ticket,
        event,
        user
      );

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif; }
            .header { background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
            .content { padding: 30px 20px; background: #ffffff; }
            .ticket-info { background: #e3f2fd; border: 2px solid #007bff; border-radius: 12px; padding: 25px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 12px 12px; }
            .success-box { background: #d4edda; border: 1px solid #28a745; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 12px; padding: 20px; margin: 20px 0; }
            .logo { font-size: 24px; font-weight: 800; margin-bottom: 10px; }
            .icon { font-size: 20px; margin-right: 8px; }
            .container { border-radius: 12px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); overflow: hidden; }
            .ticket-details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
            .detail-item { background: #f8f9fa; padding: 10px; border-radius: 8px; border-left: 4px solid #007bff; }
            .detail-label { font-weight: 600; color: #495057; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            .detail-value { color: #212529; font-weight: 500; margin-top: 5px; }
            .qr-placeholder { background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .button { background: #007bff; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 10px 5px; font-weight: 600; transition: all 0.3s ease; text-align: center; }
            .button:hover { background: #0056b3; color: white !important; transform: translateY(-2px); }
            .button-success { background: #28a745; color: white !important; }
            .button-success:hover { background: #1e7e34; color: white !important; }
            .button * { color: white !important; }
            .button-success * { color: white !important; }
            @media (max-width: 600px) {
              .ticket-details { grid-template-columns: 1fr; }
              .container { margin: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎉 LegitEvents</div>
              <h1>🎫 Ticket Confirmation</h1>
              <p>Your ticket purchase has been confirmed!</p>
            </div>
            <div class="content">
              <h2>Hello ${user.fullName || user.username}!</h2>
              
              <div class="success-box">
                <h3><span class="icon">✅</span>Purchase Successful!</h3>
                <p>Your ticket for <strong>${
                  event.title
                }</strong> has been confirmed and is attached to this email.</p>
              </div>
              
              <div class="ticket-info">
                <h3><span class="icon">📅</span>Event Details</h3>
                <div class="ticket-details">
                  <div class="detail-item">
                    <div class="detail-label">Event Name</div>
                    <div class="detail-value">${event.title}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Date & Time</div>
                    <div class="detail-value">${new Date(
                      event.date
                    ).toLocaleString()}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Location</div>
                    <div class="detail-value">${event.location}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Ticket Number</div>
                    <div class="detail-value">${ticket.ticketNumber}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Quantity</div>
                    <div class="detail-value">${ticket.quantity}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Total Paid</div>
                    <div class="detail-value">${
                      event.currency
                    } ${ticket.totalPrice.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div class="qr-placeholder">
                <h4><span class="icon">📱</span>QR Code Available</h4>
                <p>Your ticket includes a QR code for easy verification at the event.</p>
                <p><strong>Please bring this email or the attached PDF ticket to the event.</strong></p>
              </div>
              
              <div class="warning">
                <p><strong><span class="icon">⚠️</span>Important Event Guidelines:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Arrive 30 minutes before the event starts</li>
                  <li>Bring a valid ID for verification</li>
                  <li>Tickets are non-transferable</li>
                  <li>No refunds 24 hours before the event</li>
                  <li>Keep your ticket safe - it's your entry pass</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${
                  process.env.FRONTEND_URL || "http://localhost:3000"
                }/my-tickets" class="button" style="color: white !important; font-weight: bold !important; text-decoration: none !important;">
                  <span class="icon" style="color: white !important;">🎫</span><span style="color: white !important;">View My Tickets</span>
                </a>
                <a href="${
                  process.env.FRONTEND_URL || "http://localhost:3000"
                }/events/${
        event._id
      }" class="button button-success" style="color: white !important; font-weight: bold !important; text-decoration: none !important;">
                  <span class="icon" style="color: white !important;">📅</span><span style="color: white !important;">Event Details</span>
                </a>
              </div>
            </div>
            <div class="footer">
              <p><strong>🎉 LegitEvents</strong> - Discover Amazing Events Across East Africa</p>
              <p>&copy; ${new Date().getFullYear()} LegitEvents. All rights reserved.</p>
              <p>For support, contact us at <a href="mailto:support@legitevents.com" style="color: #007bff;">support@legitevents.com</a></p>
              <p><strong>📧</strong> This email contains your official event ticket. Please keep it safe!</p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await this.sendEmail({
        to: user.email,
        subject: `🎫 Ticket Confirmation - ${event.title} | LegitEvents™`,
        html,
        text: `Your ticket for ${event.title} has been confirmed. Ticket Number: ${ticket.ticketNumber}. Your PDF ticket is attached to this email.`,
        attachments: [
          {
            filename: `ticket-${ticket.ticketNumber}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
            disposition: "attachment",
          },
        ],
      });
    } catch (error) {
      console.error("Failed to generate PDF ticket:", error);
      // Fallback to HTML-only email if PDF generation fails
      return await this.sendTicketConfirmationEmailFallback(
        ticket,
        user,
        event
      );
    }
  }

  // Fallback ticket confirmation email (HTML only)
  async sendTicketConfirmationEmailFallback(ticket, user, event) {
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

  // Event reminder email with PDF attachment
  async sendEventReminderEmail(user, event, ticket) {
    const pdfTicketGenerator = require("./pdfTicketGenerator");
    const eventDate = new Date(event.date);

    try {
      // Generate PDF ticket for reminder
      const pdfBuffer = await pdfTicketGenerator.generateTicket(
        ticket,
        event,
        user
      );

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            .container { max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif; }
            .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
            .content { padding: 30px 20px; background: #ffffff; }
            .reminder-box { background: #fef2f2; border: 2px solid #fecaca; border-radius: 12px; padding: 25px; margin: 20px 0; text-align: center; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 12px 12px; }
            .logo { font-size: 24px; font-weight: 800; margin-bottom: 10px; }
            .icon { font-size: 20px; margin-right: 8px; }
            .container { border-radius: 12px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); overflow: hidden; }
            .ticket-details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
            .detail-item { background: #f8f9fa; padding: 10px; border-radius: 8px; border-left: 4px solid #dc2626; }
            .detail-label { font-weight: 600; color: #495057; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            .detail-value { color: #212529; font-weight: 500; margin-top: 5px; }
            .button { background: #dc2626; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 10px 5px; font-weight: 600; transition: all 0.3s ease; text-align: center; }
            .button:hover { background: #b91c1c; color: white !important; transform: translateY(-2px); }
            .button * { color: white !important; }
            @media (max-width: 600px) {
              .ticket-details { grid-template-columns: 1fr; }
              .container { margin: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎉 LegitEvents</div>
              <h1>⏰ Event Reminder</h1>
              <p>Don't miss your upcoming event!</p>
            </div>
            <div class="content">
              <h2>Hello ${user.fullName || user.username}!</h2>
              
              <div class="reminder-box">
                <h3><span class="icon">🚨</span>Event Tomorrow!</h3>
                <p><strong>${event.title}</strong></p>
                <p>📅 <strong>${eventDate.toLocaleDateString()}</strong> at <strong>${eventDate.toLocaleTimeString()}</strong></p>
                <p>📍 <strong>${event.location}</strong></p>
              </div>

              <div class="ticket-details">
                <div class="detail-item">
                  <div class="detail-label">Ticket Number</div>
                  <div class="detail-value">${ticket.ticketNumber}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Quantity</div>
                  <div class="detail-value">${ticket.quantity}</div>
                </div>
              </div>

              <div style="background: #fef3c7; border: 1px solid #ffc107; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p><strong><span class="icon">⚠️</span>Important Reminders:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Arrive 30 minutes early</li>
                  <li>Bring a valid ID</li>
                  <li>Have your ticket number ready</li>
                  <li>Your PDF ticket is attached for easy access</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${
                  process.env.FRONTEND_URL || "http://localhost:3000"
                }/events/${
        event._id
      }" class="button" style="color: white !important; font-weight: bold !important; text-decoration: none !important;">
                  <span class="icon" style="color: white !important;">📅</span><span style="color: white !important;">View Event Details</span>
                </a>
              </div>
            </div>
            <div class="footer">
              <p><strong>🎉 LegitEvents</strong> - See you at the event!</p>
              <p>&copy; ${new Date().getFullYear()} LegitEvents. All rights reserved.</p>
              <p>For support, contact us at <a href="mailto:support@legitevents.com" style="color: #dc2626;">support@legitevents.com</a></p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await this.sendEmail({
        to: user.email,
        subject: `⏰ Reminder: ${event.title} - Tomorrow! | LegitEvents™`,
        html,
        text: `Reminder: ${event.title} is tomorrow at ${event.location}. Ticket: ${ticket.ticketNumber}. Your PDF ticket is attached.`,
        attachments: [
          {
            filename: `ticket-reminder-${ticket.ticketNumber}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
            disposition: "attachment",
          },
        ],
      });
    } catch (error) {
      console.error("Failed to generate PDF for reminder:", error);
      // Fallback to HTML-only reminder
      return await this.sendEventReminderEmailFallback(user, event, ticket);
    }
  }

  // Fallback event reminder email (HTML only)
  async sendEventReminderEmailFallback(user, event, ticket) {
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

  // Send new credentials email
  async sendNewCredentialsEmail(user, tempPassword, resetUrl) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif; }
          .header { background: #007bff; color: white; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
          .content { padding: 30px 20px; background: #ffffff; }
          .credentials-box { background: #e3f2fd; border: 2px solid #007bff; border-radius: 12px; padding: 25px; margin: 20px 0; text-align: center; }
          .button { background: #007bff; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 10px 5px; font-weight: 600; transition: all 0.3s ease; text-align: center; }
          .button:hover { background: #0056b3; color: white !important; transform: translateY(-2px); }
          .button-success { background: #28a745; color: white !important; }
          .button-success:hover { background: #1e7e34; color: white !important; }
          .button * { color: white !important; }
          .button-success * { color: white !important; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 12px 12px; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 12px; padding: 20px; margin: 20px 0; }
          .temp-password { font-family: 'Courier New', monospace; background: #f8f9fa; padding: 15px; border-radius: 8px; font-size: 20px; font-weight: bold; color: #007bff; border: 2px solid #e9ecef; letter-spacing: 1px; }
          .next-steps { background: #d4edda; border: 1px solid #28a745; border-radius: 12px; padding: 20px; margin: 20px 0; }
          .logo { font-size: 24px; font-weight: 800; margin-bottom: 10px; }
          .icon { font-size: 20px; margin-right: 8px; }
          .container { border-radius: 12px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); overflow: hidden; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎉 LegitEvents</div>
            <h1>🔐 New Login Credentials</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.fullName || user.username}!</h2>
            <p>You have requested to reset your password for your LegitEvents account.</p>
            <p>Your new temporary login credentials are:</p>
            
            <div class="credentials-box">
              <h3><span class="icon">📧</span>Email: <a href="mailto:${
                user.email
              }" style="color: #007bff; text-decoration: none;">${
      user.email
    }</a></h3>
              <h3><span class="icon">🔑</span>Temporary Password:</h3>
              <div class="temp-password">${tempPassword}</div>
              <p><strong><span class="icon">⚠️</span>This password will expire in 10 minutes</strong></p>
            </div>
            
            <div class="warning">
              <p><strong><span class="icon">🚨</span>Important Security Information:</strong></p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Use these credentials to login immediately</li>
                <li>You will be prompted to change your password after login</li>
                <li>These credentials expire in 10 minutes</li>
                <li>If you didn't request this reset, please contact support immediately</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${
                process.env.FRONTEND_URL
              }/login" class="button" style="color: white !important; font-weight: bold !important; text-decoration: none !important;">
                <span class="icon" style="color: white !important;">🔑</span><span style="color: white !important;">Login with New Credentials</span>
              </a>
              <a href="${resetUrl}" class="button button-success" style="color: white !important; font-weight: bold !important; text-decoration: none !important;">
                <span class="icon" style="color: white !important;">🔄</span><span style="color: white !important;">Reset Password Directly</span>
              </a>
            </div>
            
            <div class="next-steps">
              <h4><span class="icon">📋</span>Next Steps:</h4>
              <ol style="margin: 10px 0; padding-left: 20px;">
                <li>Login using the credentials above</li>
                <li>You will be prompted to change your password</li>
                <li>Choose a strong, unique password</li>
                <li>Keep your new password secure</li>
              </ol>
            </div>
          </div>
          <div class="footer">
            <p><strong>🎉 LegitEvents</strong> - Discover Amazing Events Across East Africa</p>
            <p>&copy; ${new Date().getFullYear()} LegitEvents. All rights reserved.</p>
            <p>For support, contact us at <a href="mailto:support@legitevents.com" style="color: #007bff;">support@legitevents.com</a></p>
            <p><strong>🔒 Security Notice:</strong> Never share your login credentials with anyone.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: user.email,
      subject: "🔐 New Login Credentials - LegitEvents™",
      html,
      text: `New login credentials for LegitEvents. Email: ${user.email}, Temporary Password: ${tempPassword}. Expires in 10 minutes.`,
    });
  }
}

module.exports = new EmailService();
