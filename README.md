# Event Organiser Frontend

A modern, responsive React.js frontend application for the Event Organising System.

## 🚀 Features

- **Modern React Architecture**: Built with React 18, React Router, and Hooks
- **Responsive Design**: Mobile-first approach with CSS Grid and Flexbox
- **Role-based Authentication**: Support for Super Admin, Sub-Admin, and Client roles
- **Session Management**: Secure session-based authentication
- **Component Library**: Reusable components with consistent styling
- **Accessibility**: WCAG compliant with proper ARIA labels and keyboard navigation
- **Progressive Enhancement**: Works without JavaScript enabled

## 📁 Project Structure

```
frontend/
├── public/
│   └── index.html          # Main HTML template
├── src/
│   ├── components/         # Reusable components
│   │   ├── Navbar.js      # Navigation component
│   │   ├── EventCard.js   # Event display component
│   │   ├── Loading.js     # Loading spinner component
│   │   └── Modal.js       # Modal dialog component
│   ├── pages/             # Page components
│   │   ├── Home.js        # Landing page with events
│   │   ├── Login.js       # User login
│   │   ├── Register.js    # User registration
│   │   ├── EventDetails.js # Individual event page
│   │   ├── Purchase.js    # Ticket purchasing
│   │   ├── MyTickets.js   # User's tickets
│   │   ├── AdminDashboard.js # Super admin dashboard
│   │   └── NotFound.js    # 404 error page
│   ├── routes/            # Routing configuration
│   │   └── AppRoutes.js   # Protected routes and navigation
│   ├── services/          # API and service layers
│   │   └── api.js         # HTTP client and API endpoints
│   ├── App.js             # Main app component with auth context
│   ├── App.css            # Global app styles
│   ├── index.js           # React app entry point
│   └── index.css          # CSS reset and variables
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## 🎨 Styling Architecture

### CSS Organization

- **index.css**: CSS reset, variables, and global styles
- **App.css**: Main app layout and utility classes
- **Component CSS**: Each component has its own CSS file
- **Page CSS**: Each page has dedicated styling

### Design System

- **CSS Variables**: Consistent colors, spacing, and typography
- **Responsive Grid**: Mobile-first responsive design
- **Accessibility**: Focus states, high contrast support
- **Modern Animations**: Subtle hover effects and transitions

### Color Palette

```css
--primary-color: #007bff;     /* Main brand color */
--success-color: #28a745;     /* Success states */
--danger-color: #dc3545;      /* Error states */
--warning-color: #ffc107;     /* Warning states */
--gray-100 to --gray-900;     /* Neutral grays */
```

## 🔧 Installation & Setup

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

1. **Navigate to frontend directory**

```bash
cd frontend
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**
   Create a `.env` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

4. **Start development server**

```bash
npm start
```

The app will open at `http://localhost:3000`

## 🗂️ Available Scripts

```bash
npm start          # Start development server
npm build          # Build for production
npm test           # Run test suite
npm eject          # Eject from Create React App (irreversible)
```

## 🔐 Authentication System

### Auth Context

The app uses React Context for global authentication state:

```javascript
const { user, isAuthenticated, login, logout, isAdmin, isSubAdmin } = useAuth();
```

### Protected Routes

Routes are protected based on user roles:

- **Public**: Home, Event Details, Login, Register
- **Authenticated**: My Tickets, Purchase
- **Admin Only**: Admin Dashboard, Manage Events, Reports
- **Sub-Admin**: Limited admin functionality

### Session Management

- **Automatic token refresh**
- **Persistent login state**
- **Secure logout with cleanup**

## 📱 Responsive Design

### Breakpoints

```css
/* Mobile-first approach */
@media (max-width: 480px) {
  /* Small phones */
}
@media (max-width: 768px) {
  /* Tablets */
}
@media (max-width: 1024px) {
  /* Small desktops */
}
@media (min-width: 1200px) {
  /* Large screens */
}
```

### Grid System

- **CSS Grid**: For complex layouts
- **Flexbox**: For component-level alignment
- **Auto-responsive**: Components adapt automatically

## 🎯 Key Components

### Navbar

- **Responsive navigation** with mobile hamburger menu
- **Role-based links** showing appropriate options
- **User info display** with logout functionality

### EventCard

- **Reusable component** for displaying events
- **Hover effects** and responsive design
- **Action buttons** for different user roles

### Loading

- **Consistent loading states** across the app
- **Accessible** with proper ARIA labels
- **Multiple variants** (small, medium, large)

### Modal

- **Accessible modal dialogs**
- **Keyboard navigation** support
- **Click outside to close**
- **Multiple sizes** (small, medium, large, full)

## 🌐 API Integration

### Axios Configuration

```javascript
// Base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true, // For session cookies
  timeout: 10000,
});
```

### API Modules

- **eventsAPI**: Event CRUD operations
- **authAPI**: Authentication endpoints
- **ticketsAPI**: Ticket management
- **adminAPI**: Admin-specific operations

### Error Handling

- **Global error interceptors**
- **User-friendly error messages**
- **Automatic retry for failed requests**

## ♿ Accessibility Features

### WCAG Compliance

- **Semantic HTML** structure
- **ARIA labels** for dynamic content
- **Keyboard navigation** support
- **Focus management** in modals

### User Experience

- **High contrast mode** support
- **Reduced motion** preferences
- **Screen reader** compatibility
- **Consistent focus indicators**

## 🎨 Theming & Customization

### CSS Variables

Easy customization through CSS variables:

```css
:root {
  --primary-color: #your-color;
  --font-family: "Your Font";
  --border-radius: 8px;
}
```

### Component Variants

Components support multiple variants:

```javascript
<EventCard variant="compact" />
<Button size="lg" variant="outline" />
<Modal size="large" />
```

## 🚀 Deployment

### Production Build

```bash
npm run build
```

### Build Optimization

- **Code splitting** with React.lazy()
- **Asset optimization** and compression
- **Service worker** for offline support
- **Bundle analysis** tools

### Environment Configuration

```bash
# Production environment variables
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_VERSION=1.0.0
```

## 🧪 Testing

### Test Structure

```bash
src/
├── __tests__/
│   ├── components/
│   ├── pages/
│   └── utils/
```

### Testing Strategy

- **Unit tests** for components
- **Integration tests** for pages
- **End-to-end tests** for critical flows
- **Accessibility tests** with axe-core

## 📊 Performance

### Optimization Techniques

- **React.memo** for expensive components
- **useCallback/useMemo** for optimization
- **Lazy loading** for route components
- **Image optimization** and lazy loading

### Bundle Analysis

```bash
npm run build
npx webpack-bundle-analyzer build/static/js/*.js
```

## 🔮 Future Enhancements

### Planned Features

- **Dark mode** theme toggle
- **Offline support** with PWA
- **Push notifications** for events
- **Advanced filtering** and search
- **Social sharing** integration

### Technical Improvements

- **TypeScript** migration
- **React Query** for server state
- **Storybook** for component documentation
- **Micro-frontend** architecture

## 🐛 Troubleshooting

### Common Issues

1. **CORS errors**

   - Ensure backend allows frontend origin
   - Check API_URL environment variable

2. **Authentication issues**

   - Clear browser cookies/localStorage
   - Check session expiration

3. **Build failures**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility

### Development Tips

- Use React Developer Tools browser extension
- Enable source maps in development
- Use the network tab to debug API calls
- Check console for accessibility warnings

## 📞 Support

For development questions or issues:

1. Check the troubleshooting section
2. Review component documentation
3. Check browser console for errors
4. Ensure backend API is running

## 📄 License

This project is part of the Event Organising System and follows the same license terms.
