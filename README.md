# SlotSwapper

SlotSwapper is a peer-to-peer time-slot scheduling application that allows users to swap busy calendar slots with each other. Users can mark their busy slots as "swappable," and other users can request to swap one of their own swappable slots for it.

## Overview

SlotSwapper enables users to:
- Create and manage calendar events with different statuses (BUSY, SWAPPABLE, SWAP_PENDING)
- Browse available swappable slots from other users
- Request swaps by offering one of their own swappable slots
- Accept or reject incoming swap requests
- Automatically update calendars when swaps are accepted

## Technology Stack

- **Frontend**: React 19, React Router, Axios, Vite
- **Backend**: Node.js, Express.js
- **Database**: SQLite (better-sqlite3)
- **Authentication**: JWT (JSON Web Tokens)
- **Containerization**: Docker & Docker Compose

## Project Structure

```
slot-swapper/
├── server/                 # Backend application
│   ├── database/          # Database schema and initialization
│   ├── middleware/        # Authentication middleware
│   ├── routes/            # API route handlers
│   └── server.js          # Express server entry point
├── src/                   # Frontend React application
│   ├── components/        # Reusable React components
│   ├── context/           # React context providers
│   ├── pages/             # Page components
│   ├── utils/             # Utility functions (API client)
│   └── App.jsx            # Main App component
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose configuration
└── README.md              # This file
```

## Design Choices

1. **SQLite Database**: Chosen for simplicity and ease of setup. The schema is designed to be easily migrated to PostgreSQL or MySQL if needed.

2. **JWT Authentication**: Stateless authentication that works well for REST APIs. Tokens are stored in localStorage on the frontend.

3. **Transaction-based Swap Logic**: The swap acceptance/rejection logic uses database transactions to ensure data consistency when swapping slot ownership.

4. **Status Management**: Events have three statuses:
   - `BUSY`: Regular busy slot, not available for swapping
   - `SWAPPABLE`: Available for swapping
   - `SWAP_PENDING`: Currently involved in a pending swap request

5. **Real-time Updates**: The Requests page polls the API every 5 seconds to show updated swap request statuses.

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Docker and Docker Compose (optional, for containerized deployment)

### Local Development Setup

#### 1. Clone the repository

```bash
git clone <repository-url>
cd slot-swapper
```

#### 2. Backend Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create .env file (optional, defaults are provided)
cp .env.example .env
# Edit .env and set your JWT_SECRET if desired

# Initialize the database (this will create slotswapper.db)
node database/init.js

# Start the backend server
npm start
# Or for development with auto-reload:
npm run dev
```

The backend server will run on `http://localhost:3001`

#### 3. Frontend Setup

```bash
# From the project root directory
# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:3000`

### Docker Setup

For a containerized deployment:

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

The application will be available at `http://localhost:3001`

To stop:
```bash
docker-compose down
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Login and get JWT token | No |
| GET | `/api/auth/me` | Get current user info | Yes |

### Events

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/events` | Get all events for current user | Yes |
| GET | `/api/events/:id` | Get a specific event | Yes |
| POST | `/api/events` | Create a new event | Yes |
| PUT | `/api/events/:id` | Update an event | Yes |
| DELETE | `/api/events/:id` | Delete an event | Yes |

### Swaps

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/swappable-slots` | Get all swappable slots from other users | Yes |
| POST | `/api/swap-request` | Create a swap request | Yes |
| POST | `/api/swap-response/:requestId` | Accept or reject a swap request | Yes |
| GET | `/api/requests` | Get incoming and outgoing swap requests | Yes |

### API Request/Response Examples

#### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}

Response:
{
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### Create Event
```bash
POST /api/events
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Team Meeting",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T11:00:00Z",
  "status": "BUSY"
}
```

#### Create Swap Request
```bash
POST /api/swap-request
Authorization: Bearer <token>
Content-Type: application/json

{
  "mySlotId": 1,
  "theirSlotId": 5
}
```

#### Respond to Swap Request
```bash
POST /api/swap-response/3
Authorization: Bearer <token>
Content-Type: application/json

{
  "accepted": true
}
```

## Usage Guide

### 1. Getting Started

1. **Register/Login**: Create an account or log in with existing credentials.

2. **Create Events**: Go to the Dashboard and click "Create Event" to add calendar events. Events are created with `BUSY` status by default.

3. **Make Slots Swappable**: Click "Make Swappable" on any BUSY event to make it available for swapping.

### 2. Requesting Swaps

1. **Browse Marketplace**: Navigate to the Marketplace page to see all available swappable slots from other users.

2. **Request Swap**: Click "Request Swap" on a slot you want, then select one of your swappable slots to offer in exchange.

3. **Track Requests**: Go to the Requests page to see your outgoing swap requests and their status.

### 3. Responding to Swap Requests

1. **View Incoming Requests**: The Requests page shows all swap requests sent to you.

2. **Accept or Reject**: Click "Accept" to complete the swap (calendars will be updated automatically) or "Reject" to decline.

3. **Status Updates**: Accepted swaps will transfer slot ownership, and rejected swaps will return both slots to SWAPPABLE status.

## Database Schema

### Users Table
- `id` (INTEGER PRIMARY KEY)
- `name` (TEXT)
- `email` (TEXT UNIQUE)
- `password` (TEXT - hashed)
- `createdAt` (DATETIME)

### Events Table
- `id` (INTEGER PRIMARY KEY)
- `userId` (INTEGER FOREIGN KEY)
- `title` (TEXT)
- `startTime` (TEXT - ISO8601)
- `endTime` (TEXT - ISO8601)
- `status` (TEXT - BUSY, SWAPPABLE, or SWAP_PENDING)
- `createdAt` (DATETIME)

### Swap Requests Table
- `id` (INTEGER PRIMARY KEY)
- `requesterId` (INTEGER FOREIGN KEY)
- `requesteeId` (INTEGER FOREIGN KEY)
- `requesterSlotId` (INTEGER FOREIGN KEY)
- `requesteeSlotId` (INTEGER FOREIGN KEY)
- `status` (TEXT - PENDING, ACCEPTED, or REJECTED)
- `createdAt` (DATETIME)
- `respondedAt` (DATETIME)

## Assumptions and Challenges

### Assumptions

1. **Time Zones**: All times are stored and displayed in the user's local timezone. For production, consider storing times in UTC and converting on the frontend.

2. **Slot Validation**: The application assumes that slots don't overlap when swapped. In a production environment, you might want to add validation to prevent overlapping events.

3. **Single Swap per Slot**: A slot can only be involved in one pending swap at a time. This prevents conflicts but could be relaxed in future versions.

4. **No Slot Modification During Pending**: Once a slot is in SWAP_PENDING status, it cannot be modified until the swap is resolved.

### Challenges Faced

1. **Swap Logic Complexity**: Ensuring that both slots are properly validated and statuses are correctly updated during swap transactions required careful transaction handling.

2. **State Management**: Keeping the frontend state synchronized with the backend after swaps required careful API polling and state updates.

3. **Database Transactions**: Implementing atomic swap operations using SQLite transactions to ensure data consistency.

## Future Enhancements

- [ ] Add WebSocket support for real-time notifications
- [ ] Implement timezone handling for multi-timezone support
- [ ] Add calendar conflict detection
- [ ] Add email notifications for swap requests
- [ ] Implement unit and integration tests
- [ ] Add calendar visualization (full calendar view)
- [ ] Support recurring events
- [ ] Add search and filter functionality for marketplace
- [ ] Implement user profiles and preferences




