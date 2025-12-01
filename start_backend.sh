#!/bin/bash

echo "🚀 Starting DocuFix Backend..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/backend"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies if needed
if [ ! -f "venv/.installed" ]; then
    echo "📥 Installing dependencies..."
    pip install -r requirements.txt
    touch venv/.installed
fi

# Verify python-docx is installed
echo "🔍 Verifying dependencies..."
python3 -c "import docx; print('✅ python-docx installed')" || {
    echo "❌ python-docx not found. Installing..."
    pip install python-docx
}

# Start server
echo "✅ Starting FastAPI server on http://localhost:8000"
echo ""
uvicorn main:app --reload --port 8000

