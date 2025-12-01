#!/bin/bash

echo "🚀 Starting DocuFix Frontend..."
echo ""

cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start server
echo "✅ Starting React app on http://localhost:3000"
echo ""
npm start


