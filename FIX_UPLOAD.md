# 🔧 Fix Document Upload Issue

## Problem
Documents are not getting uploaded.

## Root Cause
The backend server was running but **not using the virtual environment** with installed dependencies. The `python-docx` module was missing.

## Solution Applied

1. ✅ **Installed dependencies** in the virtual environment
2. ✅ **Restarted backend** with correct virtual environment
3. ✅ **Verified document parser** is working

## How to Fix (If Issue Persists)

### Step 1: Stop Current Backend
```bash
# Find and kill backend processes
lsof -i :8000
kill <PID>
```

### Step 2: Install Dependencies
```bash
cd docufix-poc/backend
source venv/bin/activate  # macOS/Linux
# OR
venv\Scripts\activate  # Windows

pip install -r requirements.txt
```

### Step 3: Start Backend Correctly
```bash
cd docufix-poc/backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

### Step 4: Verify Upload Works
1. Open browser to `http://localhost:3000`
2. Try uploading a `.docx` file
3. Check browser console (F12) for errors
4. Check backend terminal for error messages

## Common Upload Issues

### Issue 1: "Upload failed: Module not found"
**Fix:** Install dependencies in virtual environment
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Issue 2: "Upload failed: File not found"
**Fix:** Check uploads directory exists
```bash
mkdir -p docufix-poc/uploads
```

### Issue 3: "CORS Error"
**Fix:** Check backend CORS settings in `backend/main.py`
- Ensure `http://localhost:3000` is in allowed origins

### Issue 4: "Network Error"
**Fix:** 
1. Verify backend is running: `curl http://localhost:8000`
2. Check frontend API URL in `frontend/src/services/api.js`

## Testing Upload

### Test with curl:
```bash
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@/path/to/test.docx"
```

### Check Backend Logs:
```bash
# If running in background, check logs
tail -f /tmp/docufix-backend.log
```

## Verification Checklist

- [ ] Backend is running on port 8000
- [ ] Virtual environment is activated
- [ ] All dependencies installed (`pip list | grep python-docx`)
- [ ] Uploads directory exists
- [ ] Frontend can connect to backend (check Network tab)
- [ ] No CORS errors in browser console
- [ ] File is `.docx` format

## Still Not Working?

1. **Check browser console** (F12 → Console tab)
2. **Check Network tab** (F12 → Network → Look for failed requests)
3. **Check backend terminal** for error messages
4. **Verify file format** - must be `.docx`
5. **Check file size** - very large files might timeout


