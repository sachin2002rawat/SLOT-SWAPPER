#!/bin/bash

echo "Setting up SlotSwapper..."

# Setup backend
echo "Setting up backend..."
cd server
npm install
node database/init.js
cd ..

# Setup frontend
echo "Setting up frontend..."
npm install

echo "Setup complete!"
echo ""
echo "To start the application:"
echo "1. Start the backend: cd server && npm start"
echo "2. Start the frontend: npm run dev"
echo ""
echo "Or use Docker: docker-compose up --build"

