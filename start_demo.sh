#!/bin/bash

# DocuFix POC - Network Demo Startup Script
# This script starts the application accessible from other devices on the same network

echo "🚀 Starting DocuFix POC for Network Demo Access"
echo ""

# Get local IP address
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    LOCAL_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "127.0.0.1")
else
    LOCAL_IP="127.0.0.1"
fi

echo "📍 Your local IP address: $LOCAL_IP"
echo "🌐 Frontend will be accessible at: http://$LOCAL_IP:3000"
echo "🔧 Backend API will be accessible at: http://$LOCAL_IP:8000"
echo ""
echo "📱 Other devices on the same network can access: http://$LOCAL_IP:3000"
echo ""

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo "❌ Error: backend directory not found"
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo "❌ Error: frontend directory not found"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Services stopped"
    exit 0
}

trap cleanup INT TERM

# Start backend
echo "🔧 Starting backend server..."
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

# Install dependencies if needed
if [ ! -f "venv/.installed" ]; then
    echo "📥 Installing backend dependencies..."
    pip install -r requirements.txt
    touch venv/.installed
fi

# Start backend with network access
echo "✅ Starting backend on http://0.0.0.0:8000"
uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend
echo "🎨 Starting frontend server..."
cd ../frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📥 Installing frontend dependencies..."
    npm install
fi

# Set environment variable for network access
export HOST=0.0.0.0
export REACT_APP_API_URL="http://$LOCAL_IP:8000"

echo "✅ Starting frontend on http://0.0.0.0:3000"
echo "🔗 Frontend configured to use backend at: http://$LOCAL_IP:8000"
echo ""

# Start frontend
BROWSER=none npm start &
FRONTEND_PID=$!

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DocuFix POC is running!"
echo ""
echo "📍 Local access:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo ""
echo "🌐 Network access (from other devices):"
echo "   Frontend: http://$LOCAL_IP:3000"
echo "   Backend:  http://$LOCAL_IP:8000"
echo ""
echo "📱 Share this URL with others on the same network:"
echo "   http://$LOCAL_IP:3000"
echo ""
echo "⚠️  Make sure your firewall allows connections on ports 3000 and 8000"
echo ""
echo "Press Ctrl+C to stop all services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Wait for processes
wait

