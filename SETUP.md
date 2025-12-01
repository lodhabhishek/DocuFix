# 🚀 Quick Setup Guide

## Step-by-Step Setup

### 1. Backend Setup (Terminal 1)

```bash
# Navigate to backend
cd docufix-poc/backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn main:app --reload --port 8000
```

✅ Backend will be running at `http://localhost:8000`

### 2. Frontend Setup (Terminal 2)

```bash
# Navigate to frontend
cd docufix-poc/frontend

# Install dependencies
npm install

# Start frontend server
npm start
```

✅ Frontend will open at `http://localhost:3000`

### 3. Test the Application

1. **Upload a Document**
   - Go to `http://localhost:3000`
   - Click "Upload Document"
   - Select a `.docx` file
   - Document will be parsed and gaps identified

2. **Edit Document**
   - Click on uploaded document
   - Click "Unlock Document"
   - Edit content
   - Click "Save Changes"
   - Click "Lock Document"

3. **Submit for Review**
   - Click "Submit for Review/Approval"
   - Add notes
   - Click "Submit"

4. **Review & Approve**
   - Go to "Review" page
   - Click on submission
   - Review details
   - Click "Approve"

5. **Download Approved**
   - Go to "Approved" page
   - Click "Download XML"
   - Click "View JSON" to see reusable data

## 📁 Directory Structure

```
docufix-poc/
├── backend/
│   ├── venv/           # Virtual environment (created)
│   ├── docufix.db      # Database (created on first run)
│   └── ...
├── frontend/
│   ├── node_modules/   # Dependencies (created)
│   └── ...
├── uploads/            # Created automatically
└── approved/           # Created automatically
```

## 🔧 Common Issues

### Backend won't start
- Check Python version: `python3 --version` (should be 3.8+)
- Ensure virtual environment is activated
- Check if port 8000 is available: `lsof -i :8000`

### Frontend won't start
- Check Node.js version: `node --version` (should be 14+)
- Delete `node_modules` and run `npm install` again
- Check if port 3000 is available: `lsof -i :3000`

### API connection errors
- Ensure backend is running on port 8000
- Check browser console for CORS errors
- Verify API URL in `frontend/src/services/api.js`

### Document upload fails
- Ensure file is `.docx` format
- Check `uploads/` directory exists
- Check backend logs for errors

## ✅ Verification

After setup, verify everything works:

1. ✅ Backend API responds at `http://localhost:8000`
2. ✅ Frontend loads at `http://localhost:3000`
3. ✅ Can upload a document
4. ✅ Can unlock and edit document
5. ✅ Can submit for review
6. ✅ Can approve submission
7. ✅ Can download approved XML

## 🎯 Next Steps

- Upload sample documents from `POC/` folder
- Test the complete workflow
- Review the code structure
- Customize as needed


