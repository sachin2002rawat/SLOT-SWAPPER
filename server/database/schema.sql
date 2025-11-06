-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Events/Slots table
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  title TEXT NOT NULL,
  startTime TEXT NOT NULL,
  endTime TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('BUSY', 'SWAPPABLE', 'SWAP_PENDING')),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- SwapRequests table
CREATE TABLE IF NOT EXISTS swap_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requesterId INTEGER NOT NULL,
  requesteeId INTEGER NOT NULL,
  requesterSlotId INTEGER NOT NULL,
  requesteeSlotId INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  respondedAt DATETIME,
  FOREIGN KEY (requesterId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (requesteeId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (requesterSlotId) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (requesteeSlotId) REFERENCES events(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_userId ON events(userId);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_swap_requests_requesterId ON swap_requests(requesterId);
CREATE INDEX IF NOT EXISTS idx_swap_requests_requesteeId ON swap_requests(requesteeId);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

