# Multi-stage build for frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# Backend stage
FROM node:20-alpine
WORKDIR /app

# Install better-sqlite3 dependencies
RUN apk add --no-cache python3 make g++

# Copy backend files
COPY server/package.json ./server/
RUN cd server && npm install

# Copy backend source
COPY server/ ./server/

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist ./server/public

WORKDIR /app/server

EXPOSE 3001

CMD ["node", "server.js"]

