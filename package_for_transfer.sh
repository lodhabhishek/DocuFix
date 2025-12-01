#!/bin/bash

# DocuFix POC - Packaging Script for Team Member Transfer
# This script creates a clean ZIP package excluding unnecessary files

echo "📦 Packaging DocuFix POC for transfer..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Output ZIP file name
ZIP_NAME="docufix-poc-transfer.zip"

# Remove old package if exists
if [ -f "$ZIP_NAME" ]; then
    echo "🗑️  Removing old package..."
    rm "$ZIP_NAME"
fi

echo "📋 Creating transfer package..."
echo ""

# Create ZIP excluding unnecessary files
zip -r "$ZIP_NAME" . \
    -x "*/node_modules/*" \
    -x "*/venv/*" \
    -x "*/__pycache__/*" \
    -x "*.pyc" \
    -x "*.pyo" \
    -x "*.db" \
    -x "*.db-shm" \
    -x "*.db-wal" \
    -x "*.log" \
    -x ".DS_Store" \
    -x "*/build/*" \
    -x ".git/*" \
    -x ".vscode/*" \
    -x ".idea/*" \
    -x "uploads/*" \
    -x "!uploads/.gitkeep" \
    -x "approved/*" \
    -x "!approved/.gitkeep" \
    -x "*.zip" \
    -x "package_for_transfer.sh" \
    > /dev/null 2>&1

# Check if ZIP was created successfully
if [ -f "$ZIP_NAME" ]; then
    FILE_SIZE=$(du -h "$ZIP_NAME" | cut -f1)
    echo "✅ Package created successfully!"
    echo ""
    echo "📦 Package: $ZIP_NAME"
    echo "📏 Size: $FILE_SIZE"
    echo ""
    echo "📋 Contents include:"
    echo "   ✅ Backend source code"
    echo "   ✅ Frontend source code"
    echo "   ✅ Configuration files"
    echo "   ✅ Documentation"
    echo "   ✅ Setup scripts"
    echo ""
    echo "❌ Excluded (will be recreated on new laptop):"
    echo "   ❌ node_modules/ (npm install will recreate)"
    echo "   ❌ venv/ (virtual environment will be created)"
    echo "   ❌ *.db files (database will be created automatically)"
    echo "   ❌ uploads/ (will be created automatically)"
    echo "   ❌ approved/ (will be created automatically)"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Transfer $ZIP_NAME to your team member"
    echo "   2. They should extract it and follow TEAM_MEMBER_TRANSFER_GUIDE.md"
    echo ""
else
    echo "❌ Error: Failed to create package"
    exit 1
fi

