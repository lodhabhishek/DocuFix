#!/bin/bash

# DocuFix POC - Quick Setup Script for New Team Member
# This script automates the setup process on a new laptop

echo "🚀 DocuFix POC - Quick Setup"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."
echo ""

MISSING_PREREQS=0

# Check Python
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    echo -e "${GREEN}✅ Python 3 found: $PYTHON_VERSION${NC}"
else
    echo -e "${RED}❌ Python 3 not found${NC}"
    echo "   Please install Python 3.8+ from https://www.python.org/downloads/"
    MISSING_PREREQS=1
fi

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js found: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js not found${NC}"
    echo "   Please install Node.js 14+ from https://nodejs.org/"
    MISSING_PREREQS=1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm found: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm not found${NC}"
    echo "   npm usually comes with Node.js"
    MISSING_PREREQS=1
fi

# Exit if prerequisites are missing
if [ $MISSING_PREREQS -eq 1 ]; then
    echo ""
    echo -e "${RED}❌ Please install missing prerequisites and run this script again${NC}"
    exit 1
fi

echo ""
echo "================================"
echo ""

# Backend setup
echo "📦 Setting up backend..."
echo ""

cd "$SCRIPT_DIR/backend"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to create virtual environment${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Virtual environment created${NC}"
else
    echo -e "${YELLOW}⚠️  Virtual environment already exists${NC}"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip --quiet

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install Python dependencies${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend dependencies installed${NC}"

echo ""
echo "================================"
echo ""

# Frontend setup
echo "📦 Setting up frontend..."
echo ""

cd "$SCRIPT_DIR/frontend"

# Install npm dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies (this may take a few minutes)..."
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install Node.js dependencies${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  node_modules already exists${NC}"
    echo "Skipping npm install. Run 'npm install' manually if needed."
fi

echo ""
echo "================================"
echo ""

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x "$SCRIPT_DIR/start_backend.sh" 2>/dev/null
chmod +x "$SCRIPT_DIR/start_frontend.sh" 2>/dev/null
echo -e "${GREEN}✅ Scripts are executable${NC}"

echo ""
echo "================================"
echo ""
echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Start the backend (Terminal 1):"
echo "   cd $SCRIPT_DIR"
echo "   ./start_backend.sh"
echo ""
echo "2. Start the frontend (Terminal 2):"
echo "   cd $SCRIPT_DIR"
echo "   ./start_frontend.sh"
echo ""
echo "3. Open your browser:"
echo "   Frontend: http://localhost:3000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "📖 For more details, see TEAM_MEMBER_TRANSFER_GUIDE.md"
echo ""
echo "🎉 Happy documenting!"

