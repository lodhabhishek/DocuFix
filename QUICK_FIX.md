# 🚨 Quick Fix: Document Upload Not Working

## Immediate Solution

The backend needs to be restarted with the correct virtual environment. Follow these steps:

### Step 1: Stop Current Backend
```bash
# Find backend process
lsof -i :8000

# Kill it (replace PID with actual number)
kill <PID>
```

### Step 2: Start Backend Correctly
```bash
cd docufix-poc/backend
source venv/bin/activate
pip install -r requirements.txt  # Make sure dependencies are installed
uvicorn main:app --reload --port 8000
```

### Step 3: Verify It Works
Open a new terminal and test:
```bash
curl http://localhost:8000/
```

You should see: `{"message":"DocuFix POC API","version":"1.0.0"}`

### Step 4: Test Upload
1. Open browser: `http://localhost:3000`
2. Try uploading a `.docx` file
3. Check browser console (F12) if it fails

## Common Error Messages

### "ModuleNotFoundError: No module named 'docx'"
**Solution:**
```bash
cd docufix-poc/backend
source venv/bin/activate
pip install python-docx
```

### "Upload failed: [Errno 2] No such file or directory"
**Solution:**
```bash
mkdir -p docufix-poc/uploads
mkdir -p docufix-poc/approved
```

### "CORS Error" in Browser
**Solution:** Backend CORS is configured, but make sure:
- Backend is running on port 8000
- Frontend is running on port 3000
- Check `backend/main.py` CORS origins include `http://localhost:3000`

## Still Not Working?

1. **Check browser console** (Press F12 → Console tab)
   - Look for red error messages
   - Check Network tab for failed requests

2. **Check backend terminal**
   - Look for error messages when uploading
   - Check if file is being received

3. **Verify file format**
   - Must be `.docx` (not `.doc`)
   - Try with a simple test document

4. **Test API directly:**
```bash
# Test upload endpoint
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@/path/to/your/document.docx"
```

## Need Help?

Check these files:
- `docufix-poc/FIX_UPLOAD.md` - Detailed troubleshooting
- `docufix-poc/TROUBLESHOOTING.md` - General troubleshooting guide


