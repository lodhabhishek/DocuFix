#!/bin/bash

echo "🔄 Restarting DocuFix Backend..."
echo ""

# Kill any existing backend processes
echo "🛑 Stopping existing backend..."
lsof -ti :8000 | xargs kill -9 2>/dev/null || echo "No existing backend process found"

# Wait a moment
sleep 2

# Navigate to backend directory
cd "$(dirname "$0")/backend"

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Verify dependencies
echo "🔍 Verifying dependencies..."
python3 -c "import docx; print('✅ python-docx installed')" || {
    echo "❌ Installing python-docx..."
    pip install python-docx
}

# Start server
echo ""
echo "✅ Starting FastAPI server on http://localhost:8000"
echo "📝 Backend logs will appear below..."
echo ""
uvicorn main:app --reload --port 8000


