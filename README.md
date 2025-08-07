# Healem Health Management System

A comprehensive MERN stack health management application for patients, doctors, nurses, and administrators.

## Features

- **Role-based Authentication**: Secure JWT-based authentication with different access levels
- **Appointment Scheduling**: Book, manage, and track medical appointments
- **Messaging System**: Secure communication between patients and healthcare providers
- **User Management**: Admin dashboard for managing users and roles
- **Responsive Design**: Modern UI with Bootstrap and React Bootstrap

## Tech Stack

**Frontend:**
- React.js 18
- React Router Dom
- Bootstrap 5 & React Bootstrap
- Axios for API calls
- React Calendar for appointment booking
- React Toastify for notifications

**Backend:**
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- bcryptjs for password hashing
- Express Validator for input validation

**DevOps:**
- Docker & Docker Compose
- Nginx (production)

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (or use Docker)
- Git

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd healem-health-system
```

2. **Set up environment variables:**

Backend (.env):
```bash
PORT=5000
MONGO_URI=mongodb://localhost:27017/healem
JWT_SECRET=your-super-secure-secret-key-here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

3. **Install dependencies:**

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

4. **Start the application:**

```bash
# Start MongoDB (if running locally)
mongod

# Start backend (from backend directory)
npm run dev

# Start frontend (from frontend directory)
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Docker Setup

### Development with Docker

```bash
# Start all services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Stop all services
docker-compose down
```

### Production with Docker

```bash
# Start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-token` - Verify JWT token
- `POST /api/auth/refresh-token` - Refresh JWT token

### Users
- `GET /api/users` - Get all users (admin/nurse only)
- `GET /api/users/doctors` - Get all doctors
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id/profile` - Update user profile
- `PATCH /api/users/:id/status` - Update user status (admin only)

### Appointments
- `POST /api/appointments` - Create appointment (patient only)
- `GET /api/appointments` - Get appointments
- `GET /api/appointments/:id` - Get appointment by ID
- `PATCH /api/appointments/:id/status` - Update appointment status
- `PUT /api/appointments/:id` - Update appointment
- `GET /api/appointments/doctor/:doctorId/availability` - Check doctor availability

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/inbox` - Get inbox messages
- `GET /api/messages/sent` - Get sent messages
- `GET /api/messages/conversation/:userId` - Get conversation
- `PATCH /api/messages/:id/status` - Update message status

## User Roles

### Patient
- Register and manage profile
- Book appointments with doctors
- View appointment history
- Send messages to healthcare providers
- Cancel pending appointments

### Doctor
- Manage professional profile
- View and manage appointments
- Update appointment status
- Communicate with patients
- Add appointment notes and prescriptions

### Nurse
- View appointments
- Assist with appointment management
- Access patient information
- Communicate with patients and doctors

### Admin
- Full system access
- Manage all users
- View all appointments and messages
- System configuration and oversight

## Development

### Project Structure

```
healem-health-system/
├── backend/                # Node.js/Express API
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── Dockerfile         # Production Docker config
│   └── server.js          # Entry point
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   └── services/      # API services
│   ├── Dockerfile         # Production Docker config
│   └── Dockerfile.dev     # Development Docker config
├── docker-compose.yml     # Production compose file
└── docker-compose.dev.yml # Development compose file
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Security

- All passwords are hashed using bcryptjs
- JWT tokens for stateless authentication
- Role-based access control (RBAC)
- Input validation on all endpoints
- CORS configuration
- Helmet for security headers

## License

MIT License - see LICENSE file for details.