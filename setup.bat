@echo off

echo Setting up SlotSwapper...

REM Setup backend
echo Setting up backend...
cd server
call npm install
node database\init.js
cd ..

REM Setup frontend
echo Setting up frontend...
call npm install

echo Setup complete!
echo.
echo To start the application:
echo 1. Start the backend: cd server ^&^& npm start
echo 2. Start the frontend: npm run dev
echo.
echo Or use Docker: docker-compose up --build

pause

