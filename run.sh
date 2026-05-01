#!/bin/bash

echo "Starting Chantier MVP..."

# Start Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
node index.js &
BACKEND_PID=$!
echo "Backend running on PID $BACKEND_PID"

# Start Frontend
cd ../frontend
npm install
npm run dev &
FRONTEND_PID=$!
echo "Frontend running on PID $FRONTEND_PID"

# Wait for both
wait
