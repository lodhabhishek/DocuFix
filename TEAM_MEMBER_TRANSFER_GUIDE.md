# 📦 DocuFix POC - Team Member Transfer Guide

This guide will help you transfer and set up the DocuFix POC application on a new laptop.

## 📋 What is DocuFix POC?

DocuFix is a document quality management application that:
- Uploads and parses DOCX files
- Detects gaps in structured data (missing catalog numbers, invalid configurations)
- Provides document locking for protection
- Manages approval workflows
- Stores approved data as JSON for reuse

## 🎯 Transfer Methods

### Method 1: ZIP File Transfer (Recommended)

**On your current laptop:**

1. Run the packaging script to create a clean transfer package:
   ```bash
   cd /Users/abhisheklodh/Wireframe/docufix-poc
   chmod +x package_for_transfer.sh
   ./package_for_transfer.sh
   ```

2. This creates `docufix-poc-transfer.zip` which you can:
   - Transfer via USB drive
   - Upload to cloud storage (Dropbox, Google Drive, OneDrive)
   - Send via email (if file size permits)
   - Transfer via network share

**On the new laptop:**

1. Extract the ZIP file
2. Follow the setup instructions below

### Method 2: Git Repository Transfer

If you prefer version control:

1. **On your current laptop:**
   ```bash
   cd /Users/abhisheklodh/Wireframe/docufix-poc
   git init
   git add .
   git commit -m "Initial DocuFix POC transfer"
   # Push to GitHub/GitLab/Bitbucket
   ```

2. **On the new laptop:**
   ```bash
   git clone <repository-url>
   cd docufix-poc
   # Follow setup instructions below
   ```

## 🚀 Quick Setup on New Laptop

### Prerequisites

Before you begin, ensure you have:

- **Python 3.8 or higher**
  - Check: `python3 --version`
  - Download: https://www.python.org/downloads/
  
- **Node.js 14 or higher**
  - Check: `node --version`
  - Download: https://nodejs.org/
  
- **npm** (comes with Node.js)
  - Check: `npm --version`

- **Modern web browser** (Chrome, Firefox, Safari, Edge)

### Automated Setup (Recommended)

1. **Extract the transfer package** (if using ZIP method)
   ```bash
   unzip docufix-poc-transfer.zip
   cd docufix-poc
   ```

2. **Run the quick setup script:**
   ```bash
   chmod +x quick_setup.sh
   ./quick_setup.sh
   ```

3. **Start the application:**
   ```bash
   # Terminal 1: Start backend
   ./start_backend.sh
   
   # Terminal 2: Start frontend
   ./start_frontend.sh
   ```

4. **Open your browser:**
   - Frontend: http://localhost:3000
   - Backend API Docs: http://localhost:8000/docs

### Manual Setup (Step by Step)

If you prefer to set up manually:

#### Step 1: Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd docufix-poc/backend
   ```

2. **Create Python virtual environment:**
   ```bash
   python3 -m venv venv
   ```

3. **Activate virtual environment:**
   - **macOS/Linux:**
     ```bash
     source venv/bin/activate
     ```
   - **Windows:**
     ```bash
     venv\Scripts\activate
     ```

4. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Start the backend server:**
   ```bash
   uvicorn main:app --reload --port 8000
   ```

   ✅ Backend will be running at `http://localhost:8000`
   ✅ API documentation at `http://localhost:8000/docs`

#### Step 2: Frontend Setup

1. **Open a new terminal window** (keep backend running)

2. **Navigate to frontend directory:**
   ```bash
   cd docufix-poc/frontend
   ```

3. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

4. **Start the frontend development server:**
   ```bash
   npm start
   ```

   ✅ Frontend will open automatically at `http://localhost:3000`

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Backend is running on http://localhost:8000
- [ ] Frontend opens at http://localhost:3000
- [ ] Can access API docs at http://localhost:8000/docs
- [ ] Can upload a document from the Documents page
- [ ] Can view document details and gaps
- [ ] Can unlock and edit documents
- [ ] Can submit documents for review
- [ ] Can approve/reject submissions from Review page
- [ ] Can download approved documents

## 📖 Using the Application

### 1. Upload a Document

1. Navigate to the **Documents** page
2. Click **"Upload Document"**
3. Select a `.docx` file
4. The document will be parsed and gaps will be automatically identified
5. Document is **locked by default** for protection

### 2. Edit a Document

1. Click on an uploaded document to open the editor
2. View the structured data and identified gaps
3. Click **"Unlock Document"** to enable editing
4. Update missing information in the content
5. Click **"Save Changes"** to save
6. Click **"Lock Document"** when finished

### 3. Submit for Review

1. After making changes, click **"Submit for Review/Approval"**
2. Add submission notes (optional)
3. Click **"Submit"**
4. Document status changes to "submitted" and becomes locked

### 4. Review & Approve

1. Go to the **Review** page
2. Click on a submission to view details
3. Review the structured data and changes
4. Add review notes
5. Click **"Approve"** or **"Reject"**
6. Approved documents are stored as XML and JSON

### 5. Download Approved Documents

1. Go to the **Approved** page
2. View all approved documents
3. Click **"Download XML"** to download the XML file
4. Click **"View JSON"** to see the JSON data for reuse
5. Click **"Copy JSON"** to copy JSON to clipboard

## 🏗️ Project Structure

```
docufix-poc/
├── backend/                 # FastAPI backend
│   ├── main.py             # API endpoints
│   ├── models.py           # Database models
│   ├── schemas.py          # Pydantic schemas
│   ├── database.py         # Database setup
│   ├── document_parser.py  # DOCX parsing & gap detection
│   ├── requirements.txt    # Python dependencies
│   └── venv/               # Virtual environment (created during setup)
│
├── frontend/               # React frontend
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # Reusable components
│   │   └── services/       # API client
│   ├── package.json        # NPM dependencies
│   └── node_modules/       # Node modules (created during setup)
│
├── uploads/                # Uploaded documents (created automatically)
├── approved/               # Approved documents (XML/JSON)
├── start_backend.sh        # Backend start script
├── start_frontend.sh       # Frontend start script
└── README.md               # Main documentation
```

## 🔧 Troubleshooting

### Backend Issues

**Port 8000 already in use:**
```bash
# Find what's using port 8000
lsof -i :8000

# Kill the process or use a different port
uvicorn main:app --reload --port 8001
# Then update API_BASE_URL in frontend/src/services/api.js
```

**Module not found errors:**
- Ensure virtual environment is activated: `source venv/bin/activate`
- Reinstall dependencies: `pip install -r requirements.txt`

**Database errors:**
- Delete the database file: `rm backend/docufix.db*`
- Restart the backend server (it will recreate the database)

**Python version issues:**
- Ensure Python 3.8+ is installed: `python3 --version`
- Use `python3` instead of `python` in commands

### Frontend Issues

**Port 3000 already in use:**
```bash
# Use a different port
PORT=3001 npm start
```

**npm install fails:**
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**API connection errors:**
- Ensure backend is running on port 8000
- Check browser console for CORS errors
- Verify API URL in `frontend/src/services/api.js`

**React app won't start:**
- Check Node.js version: `node --version` (should be 14+)
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

### General Issues

**Permission denied errors:**
```bash
# Make scripts executable
chmod +x start_backend.sh
chmod +x start_frontend.sh
chmod +x quick_setup.sh
```

**Cannot find files:**
- Ensure you're in the correct directory
- Check that all files were transferred correctly
- Re-extract the ZIP file if needed

**Services won't start:**
- Check prerequisites are installed (Python, Node.js)
- Check terminal output for error messages
- Verify ports are available

## 🔄 Daily Usage

### Starting the Application

Every time you want to use DocuFix:

1. **Start Backend (Terminal 1):**
   ```bash
   cd docufix-poc
   ./start_backend.sh
   ```

2. **Start Frontend (Terminal 2):**
   ```bash
   cd docufix-poc
   ./start_frontend.sh
   ```

3. **Open browser:** http://localhost:3000

### Stopping the Application

- Press `Ctrl+C` in each terminal window
- Or close the terminal windows

## 📁 Important Files

- **Backend API**: `backend/main.py`
- **Database Models**: `backend/models.py`
- **Document Parser**: `backend/document_parser.py`
- **Frontend App**: `frontend/src/App.js`
- **API Client**: `frontend/src/services/api.js`
- **Database**: `backend/docufix.db` (SQLite, created automatically)

## 🎓 Learning Resources

- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **React Documentation**: https://react.dev/
- **Python-docx Library**: https://python-docx.readthedocs.io/

## 📞 Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review terminal output for error messages
3. Check the browser console (F12) for frontend errors
4. Review the main README.md file
5. Check other documentation files in the project

## 🔐 Security Notes

- The application runs locally on your machine
- No data is sent to external servers
- Database files are stored locally
- Uploaded documents are stored in the `uploads/` directory
- Approved documents are stored in the `approved/` directory

## ✅ Success!

Once everything is set up and verified, you're ready to use DocuFix POC!

The application provides:
- ✅ Document upload and parsing
- ✅ Gap detection
- ✅ Document locking/protection
- ✅ Content editing
- ✅ Approval workflow
- ✅ Data export (XML/JSON)

Happy documenting! 📝

