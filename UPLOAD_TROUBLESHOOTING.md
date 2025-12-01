# Document Upload Troubleshooting Guide

## Common Issues and Solutions

### Issue: Document Not Uploading

#### 1. Check Backend Status
```bash
# Check if backend is running
lsof -ti :8000

# Check backend logs
tail -f /tmp/docufix-backend.log
```

#### 2. Check Browser Console
- Open browser Developer Tools (F12)
- Go to Console tab
- Look for error messages when clicking Upload
- Check Network tab for failed requests

#### 3. Verify File Type
- Ensure file has `.docx` extension
- Some browsers may not recognize MIME type correctly
- The system now accepts files even if MIME type is not set correctly

#### 4. Check File Size
- Very large files may timeout
- Upload timeout is set to 60 seconds
- Check backend logs for timeout errors

#### 5. Check Uploads Directory
```bash
# Verify directory exists and is writable
ls -la docufix-poc/uploads/
```

#### 6. Common Error Messages

**"Upload failed: No filename provided"**
- File input is empty
- Solution: Select a file before clicking Upload

**"Upload failed: Invalid file type"**
- File is not a .docx file
- Solution: Ensure file has .docx extension

**"Upload failed: Failed to save file"**
- Permission issue with uploads directory
- Solution: Check directory permissions

**Network Error / CORS Error**
- Backend not running or CORS misconfigured
- Solution: Restart backend, check CORS settings

## Testing Upload Manually

### Using curl:
```bash
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@/path/to/your/document.docx" \
  -H "Content-Type: multipart/form-data"
```

### Check Response:
- Should return JSON with `document_id`, `filename`, and `message`
- Check for error details in response

## Debug Steps

1. **Open Browser Console** (F12)
2. **Select a .docx file** - Check console for "File selected" message
3. **Click Upload** - Check console for "Uploading file" message
4. **Check Network Tab** - Look for POST request to `/api/documents/upload`
5. **Check Response** - Should see success or error message

## Recent Fixes Applied

1. ✅ Better file type validation (handles missing MIME types)
2. ✅ Duplicate filename handling
3. ✅ Improved error messages
4. ✅ Console logging for debugging
5. ✅ 60-second timeout for large files
6. ✅ Better error handling in backend

## If Still Not Working

1. Check backend is running: `curl http://localhost:8000/`
2. Check browser console for errors
3. Check backend logs: `tail -f /tmp/docufix-backend.log`
4. Try uploading a different .docx file
5. Clear browser cache and try again


