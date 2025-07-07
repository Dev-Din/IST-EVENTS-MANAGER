# 🎪 Event Organising System

A full-stack web application for managing events, ticket sales, and user administration. Built with React.js frontend and Node.js/Express backend with MongoDB database.

## 🌟 Overview

This comprehensive event management platform allows organizations to create, manage, and sell tickets for events while providing different access levels for administrators and clients.

### 🎯 Key Features

- **🎫 Event Management**: Create, update, and manage events with detailed information
- **🛒 Ticket System**: Purchase tickets with quantity limits and pricing
- **👥 User Management**: Role-based access control (Super Admin, Sub-Admin, Client)
- **📊 Analytics**: Sales reports and user analytics for administrators
- **🔐 Security**: JWT authentication, password hashing, and rate limiting
- **📱 Responsive**: Mobile-first design that works on all devices
- **🚀 Modern Stack**: Latest technologies and best practices

## 🏗️ System Architecture

```
┌─────────────────┐    HTTP/REST API    ┌─────────────────┐
│   React.js      │◄──────────────────►│   Node.js       │
│   Frontend      │                     │   Backend       │
│   (Port 3000)   │                     │   (Port 5000)   │
└─────────────────┘                     └─────────────────┘
                                               │
                                               ▼
                                        ┌─────────────────┐
                                        │   MongoDB       │
                                        │   Database      │
                                        │   (Port 27017)  │
                                        └─────────────────┘
```

## 🛠️ Technology Stack

### Frontend

- **React 18** - Modern UI library with hooks
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **CSS3** - Modern styling with Grid and Flexbox
- **Create React App** - Development tooling

### Backend

- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing
- **express-validator** - Input validation
- **helmet** - Security middleware
- **cors** - Cross-origin resource sharing

## 📁 Project Structure

```
Event Organising System/
├── frontend/                    # React.js Frontend Application
│   ├── public/
│   │   ├── index.html          # HTML template
│   │   └── favicon.svg         # Custom favicon
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── Navbar.js       # Navigation component
│   │   │   ├── EventCard.js    # Event display component
│   │   │   ├── Loading.js      # Loading states
│   │   │   └── Modal.js        # Modal dialogs
│   │   ├── pages/              # Route pages
│   │   │   ├── Home.js         # Landing page
│   │   │   ├── Login.js        # Authentication
│   │   │   ├── Register.js     # User registration
│   │   │   ├── EventDetails.js # Event information
│   │   │   ├── Purchase.js     # Ticket purchasing
│   │   │   ├── MyTickets.js    # User tickets
│   │   │   ├── AdminDashboard.js # Admin interface
│   │   │   └── NotFound.js     # 404 page
│   │   ├── routes/
│   │   │   └── AppRoutes.js    # Route configuration
│   │   ├── services/
│   │   │   └── api.js          # API integration
│   │   ├── App.js              # Main app component
│   │   └── index.js            # Entry point
│   └── package.json            # Dependencies
│
├── backend/                     # Node.js Backend API
│   ├── controllers/            # Business logic
│   │   ├── auth.js            # Authentication logic
│   │   ├── events.js          # Event management
│   │   ├── tickets.js         # Ticket operations
│   │   └── admin.js           # Admin functions
│   ├── middleware/             # Custom middleware
│   │   ├── auth.js            # JWT verification
│   │   ├── authorize.js       # Role-based access
│   │   ├── errorHandler.js    # Error handling
│   │   └── asyncHandler.js    # Async wrapper
│   ├── models/                 # Database schemas
│   │   ├── User.js            # User model
│   │   ├── Event.js           # Event model
│   │   └── Ticket.js          # Ticket model
│   ├── routes/                 # API endpoints
│   │   ├── auth.js            # Auth routes
│   │   ├── events.js          # Event routes
│   │   ├── tickets.js         # Ticket routes
│   │   └── admin.js           # Admin routes
│   ├── scripts/
│   │   └── seed.js            # Database seeding
│   ├── server.js              # Express server
│   └── package.json           # Dependencies
│
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 16.0.0 or higher
- **MongoDB** 4.4.0 or higher
- **npm** or **yarn**

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd "Event Organising System"
```

2. **Set up Backend**

```bash
cd backend
npm install

# Create environment file
cp .env.example .env
# Edit .env with your configuration
```

3. **Set up Frontend**

```bash
cd ../frontend
npm install

# Create environment file
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
```

4. **Start MongoDB**

```bash
# Make sure MongoDB is running
mongod --dbpath /path/to/your/db
```

5. **Seed the Database (Optional)**

```bash
cd backend
npm run seed
```

6. **Start the Applications**

**Backend (Terminal 1):**

```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

**Frontend (Terminal 2):**

```bash
cd frontend
npm start
# App opens at http://localhost:3000
```

## 🔐 Authentication & Authorization

### User Roles

| Role            | Permissions          | Access                                  |
| --------------- | -------------------- | --------------------------------------- |
| **Super Admin** | Full system access   | All routes, user management, analytics  |
| **Sub-Admin**   | Limited admin access | Manage own events, view reports         |
| **Client**      | Standard user access | Register, purchase tickets, view events |

### Sample Accounts

After running the seed script, you can use these accounts:

```
Super Admin:
Email: superadmin@example.com
Password: password123

Sub-Admin:
Email: subadmin1@example.com
Password: password123

Client:
Email: client1@example.com
Password: password123
```

## 🌐 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication Endpoints

| Method | Endpoint         | Description       | Access        |
| ------ | ---------------- | ----------------- | ------------- |
| POST   | `/auth/register` | Register new user | Public        |
| POST   | `/auth/login`    | User login        | Public        |
| POST   | `/auth/logout`   | User logout       | Authenticated |
| GET    | `/auth/profile`  | Get user profile  | Authenticated |

### Event Endpoints

| Method | Endpoint      | Description     | Access      |
| ------ | ------------- | --------------- | ----------- |
| GET    | `/events`     | Get all events  | Public      |
| GET    | `/events/:id` | Get event by ID | Public      |
| POST   | `/events`     | Create event    | Admin       |
| PUT    | `/events/:id` | Update event    | Admin       |
| DELETE | `/events/:id` | Delete event    | Super Admin |

### Ticket Endpoints

| Method | Endpoint                  | Description       | Access        |
| ------ | ------------------------- | ----------------- | ------------- |
| POST   | `/tickets/purchase`       | Purchase tickets  | Authenticated |
| GET    | `/tickets/my-tickets`     | Get user tickets  | Authenticated |
| GET    | `/tickets/event/:eventId` | Get event tickets | Admin         |

### Admin Endpoints

| Method | Endpoint            | Description      | Access      |
| ------ | ------------------- | ---------------- | ----------- |
| GET    | `/admin/users`      | Get all users    | Super Admin |
| GET    | `/admin/analytics`  | Get analytics    | Admin       |
| POST   | `/admin/sub-admins` | Create sub-admin | Super Admin |

## 🛡️ Security Features

### Backend Security

- **JWT Authentication** with secure tokens
- **Password Hashing** using bcrypt
- **Rate Limiting** to prevent abuse
- **Input Validation** using express-validator
- **CORS** configuration for cross-origin requests
- **Helmet** for security headers
- **Account Lockout** after failed login attempts

### Frontend Security

- **Session Management** with automatic token refresh
- **Protected Routes** based on user roles
- **XSS Prevention** through React's built-in protections
- **Secure API Communication** with HTTPS

## 📊 Database Schema

### User Model

```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (client/sub-admin/super-admin),
  isLocked: Boolean,
  loginAttempts: Number,
  createdAt: Date
}
```

### Event Model

```javascript
{
  title: String,
  description: String,
  category: String,
  date: Date,
  location: String,
  price: Number,
  capacity: Number,
  availableTickets: Number,
  createdBy: ObjectId (User),
  createdAt: Date
}
```

### Ticket Model

```javascript
{
  event: ObjectId (Event),
  purchaser: ObjectId (User),
  quantity: Number,
  totalPrice: Number,
  purchaseDate: Date,
  status: String (active/cancelled)
}
```

## 🎨 Frontend Features

### Design System

- **Responsive Design** - Mobile-first approach
- **Modern CSS** - Grid, Flexbox, CSS Variables
- **Accessibility** - WCAG compliant with ARIA labels
- **Dark Mode Ready** - CSS variables for theming

### Key Components

- **Navbar** - Responsive navigation with role-based menus
- **EventCard** - Reusable event display component
- **Modal** - Accessible modal dialogs
- **Loading** - Consistent loading states
- **Protected Routes** - Role-based route protection

## 🖥️ Development

### Available Scripts

**Backend:**

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm run seed       # Seed database with sample data
npm test           # Run tests
```

**Frontend:**

```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run test suite
npm run eject      # Eject from Create React App
```

### Environment Variables

**Backend (.env):**

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/event_organiser
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=30d
```

**Frontend (.env):**

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 🚀 Deployment

### Production Checklist

1. **Environment Setup**

   - [ ] Set production environment variables
   - [ ] Configure MongoDB Atlas or production database
   - [ ] Set secure JWT secrets

2. **Build Applications**

   ```bash
   # Frontend
   cd frontend && npm run build

   # Backend (if using TypeScript)
   cd backend && npm run build
   ```

3. **Server Configuration**
   - [ ] Configure reverse proxy (nginx)
   - [ ] Set up SSL certificates
   - [ ] Configure PM2 for process management

### Deployment Options

- **Heroku** - Easy deployment with MongoDB Atlas
- **DigitalOcean** - VPS with full control
- **Netlify + Heroku** - Frontend on Netlify, backend on Heroku
- **Docker** - Containerized deployment

## 🧪 Testing

### Backend Testing

```bash
cd backend
npm test
```

### Frontend Testing

```bash
cd frontend
npm test
```

### Manual Testing

- Test all user roles and permissions
- Verify responsive design on different devices
- Test API endpoints with Postman/Insomnia

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📧 Support

For support, email support@example.com or create an issue in the repository.

## 🎉 Acknowledgments

- React.js community for excellent documentation
- Express.js for the robust web framework
- MongoDB for the flexible database solution
- All contributors who help improve this project

---

**Happy Event Organizing! 🎪✨**
