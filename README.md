# 🎫 LegitEvents™ - Event Management System

A comprehensive, full-stack event management platform built with React and Node.js, featuring advanced PDF generation, QR code tickets, email notifications, and role-based access control.

## ✨ Features

### 🎯 Core Features

- **User Management**: Registration, login, profile management with role-based access
- **Event Management**: Create, edit, delete events with categories and status tracking
- **Ticket System**: Purchase tickets with QR code generation and PDF downloads
- **Multi-currency Support**: KES, UGX, TZS, RWF, ETB, BIF, USD
- **Responsive Design**: Mobile-friendly interface with modern UI

### 👥 Role-Based Access Control

- **Super Admin**: Full system access, manage sub-admins and clients
- **Sub Admin**: Manage events and view reports
- **Client**: Purchase tickets, view bookings, manage profile

### 📊 Advanced Features

- **PDF Generation**: Automated ticket PDFs with QR codes and branding
- **Comprehensive Reports**: Users, events, tickets, revenue analytics with PDF export
- **Email Notifications**: Welcome emails, ticket confirmations, event reminders
- **QR Code Integration**: Secure ticket verification system
- **CSV Export**: Export data for external analysis

### 🔒 Security & Performance

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API protection against abuse
- **Data Validation**: Comprehensive input validation and sanitization
- **Error Handling**: Centralized error management
- **Security Headers**: Helmet.js for security best practices

## 🛠️ Tech Stack

### Frontend

- **React.js 18.2.0**: Modern React with hooks and context
- **React Router DOM 6.8.1**: Client-side routing
- **Axios**: HTTP client for API communication
- **CSS3**: Custom styling with responsive design
- **QR Code**: Client-side QR code generation

### Backend

- **Node.js**: Runtime environment
- **Express.js 4.18.2**: Web application framework
- **MongoDB**: NoSQL database with Mongoose ODM
- **JWT**: JSON Web Token authentication
- **PDFKit**: PDF generation for tickets and reports
- **Nodemailer**: Email service integration
- **QR Code**: Server-side QR code generation
- **BCrypt**: Password hashing
- **Helmet**: Security middleware
- **Morgan**: HTTP request logging
- **Compression**: Response compression

### Testing & Development

- **Jest**: Testing framework
- **Supertest**: HTTP assertion testing
- **Nodemon**: Development server auto-restart

## 📁 Project Structure

```
Event Organising System/
├── backend/                 # Node.js backend
│   ├── config/             # Database configuration
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Custom middleware
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── utils/             # Utility functions
│   ├── tests/             # Test files
│   └── server.js          # Entry point
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── routes/        # Route configuration
│   │   └── utils/         # Utility functions
│   └── public/            # Static assets
└── build/                 # Production build
```

## 📋 Installation & Setup

### Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0
- MongoDB Atlas account (or local MongoDB)

### Backend Setup

```bash
cd backend
npm install
cp ../env.example .env
# Configure your environment variables
npm run dev  # Development server
npm start    # Production server
```

### Frontend Setup

```bash
cd frontend
npm install
npm start    # Development server
npm run build # Production build
```

### Full Stack Development

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm start
```

## 🔧 Environment Variables

Copy `env.example` to `.env` in the backend directory and configure:

```env
# MongoDB Connection (Get from MongoDB Atlas)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/legitevents?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
JWT_EXPIRE=7d

# Environment
NODE_ENV=production

# Frontend URL (Your deployment URL)
FRONTEND_URL=https://your-app.netlify.app

# Email Configuration (Optional - for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=LegitEvents <noreply@legitevents.com>
```

## 🧪 Testing

The project includes comprehensive test suites for all major components:

```bash
# Run all tests
cd backend && npm test

# Run specific test files
npm test auth.test.js
npm test events.test.js
npm test tickets.test.js
npm test admin.test.js
```

**Test Coverage:**

- Authentication endpoints
- Event management operations
- Ticket purchasing and management
- Admin dashboard functionality
- Role-based access control

## 📊 API Documentation

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Events

- `GET /api/events` - Get all published events
- `GET /api/events/:id` - Get specific event
- `POST /api/events` - Create event (Admin)
- `PUT /api/events/:id` - Update event (Admin)
- `DELETE /api/events/:id` - Delete event (Admin)

### Tickets

- `POST /api/tickets/purchase` - Purchase ticket
- `GET /api/tickets/my-tickets` - Get user tickets
- `GET /api/tickets/:id/download` - Download ticket PDF

### Admin

- `GET /api/admin/dashboard` - Admin dashboard stats
- `GET /api/admin/reports` - Generate reports
- `GET /api/admin/clients` - Manage clients
- `POST /api/admin/sub-admins` - Create sub-admin

## 🚀 Deployment

### Netlify Deployment (Frontend)

1. Fork this repository
2. Connect to Netlify
3. Set build command: `cd frontend && npm run build`
4. Set publish directory: `frontend/build`
5. Deploy frontend!

### Heroku Deployment (Backend)

1. Create a Heroku app
2. Set up MongoDB Atlas
3. Configure environment variables in Heroku
4. Connect your GitHub repository
5. Deploy backend!

### Manual Deployment

1. **Frontend**:
   ```bash
   cd frontend && npm run build
   # Upload build folder to your static hosting service
   ```
2. **Backend**:
   ```bash
   cd backend
   npm install --production
   npm start
   # Deploy to your Node.js hosting service
   ```

### Alternative Hosting Options

- **Frontend**: Netlify, GitHub Pages, Firebase Hosting, Surge.sh
- **Backend**: Heroku, Railway, DigitalOcean, AWS, Google Cloud Platform

## 📱 Screenshots & Features Demo

- **User Dashboard**: Event browsing and ticket management
- **Event Management**: Admin interface for creating and managing events
- **Ticket Purchase**: Seamless checkout with multiple payment options
- **Admin Panel**: Comprehensive analytics and user management
- **PDF Tickets**: Professional ticket generation with QR codes
- **Reports**: Detailed analytics with PDF export capabilities

## 🤝 Contributing

This is a portfolio project showcasing modern web development practices. Feel free to:

- Fork the repository
- Submit pull requests
- Report issues
- Suggest new features

## 📄 License

MIT License - feel free to use this project for learning, portfolio, or commercial purposes!

## 🔗 Links

- **Documentation**: See inline code comments and JSDoc
- **Issues**: GitHub Issues tab
- **Support**: Contact through GitHub

---

Built with ❤️ by the LegitEvents™ Team
