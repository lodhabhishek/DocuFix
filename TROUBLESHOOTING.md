# 🔧 Troubleshooting Guide

## Frontend Not Opening (http://localhost:3000)

### Check if Frontend is Running

```bash
# Check if port 3000 is in use
lsof -i :3000

# Check if React process is running
ps aux | grep react-scripts
```

### Solutions

#### 1. Frontend Not Started
If the frontend isn't running, start it:

```bash
cd docufix-poc/frontend
npm start
```

The server should start and automatically open your browser. If it doesn't:
- **Manually open**: `http://localhost:3000` in your browser
- **Check terminal**: Look for any error messages

#### 2. Port 3000 Already in Use

If another application is using port 3000:

**Option A: Kill the process**
```bash
# Find the process
lsof -i :3000

# Kill it (replace PID with actual process ID)
kill -9 <PID>
```

**Option B: Use a different port**
```bash
PORT=3001 npm start
```
Then open `http://localhost:3001`

#### 3. Compilation Errors

If you see compilation errors in the terminal:

**Check for syntax errors:**
```bash
cd docufix-poc/frontend
npm run build
```

**Common issues:**
- Missing dependencies: `npm install`
- Node version: Requires Node.js 14+
- React version conflicts: Delete `node_modules` and `package-lock.json`, then `npm install`

#### 4. Browser Not Opening Automatically

**Manually open:**
- Chrome/Edge: `http://localhost:3000`
- Firefox: `http://localhost:3000`
- Safari: `http://localhost:3000`

**Check browser console:**
- Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
- Look for JavaScript errors in the Console tab

#### 5. Blank Page / White Screen

**Possible causes:**
- JavaScript errors (check browser console)
- React Router issues
- API connection errors (check if backend is running)

**Fix:**
1. Open browser console (F12)
2. Check for red error messages
3. Verify backend is running on port 8000
4. Check Network tab for failed API calls

## Backend Not Running

### Check Backend Status

```bash
# Check if port 8000 is in use
lsof -i :8000

# Check if uvicorn is running
ps aux | grep uvicorn
```

### Start Backend

```bash
cd docufix-poc/backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn main:app --reload --port 8000
```

### Backend Connection Errors

If frontend can't connect to backend:

1. **Check CORS settings** in `backend/main.py`
2. **Verify backend URL** in `frontend/src/services/api.js`:
   ```javascript
   const API_BASE_URL = 'http://localhost:8000';
   ```
3. **Test backend directly:**
   ```bash
   curl http://localhost:8000
   ```

## Common Error Messages

### "Cannot GET /"
- **Cause**: React Router issue
- **Fix**: Navigate to `http://localhost:3000/` (with trailing slash)

### "Network Error" or "CORS Error"
- **Cause**: Backend not running or CORS misconfiguration
- **Fix**: 
  1. Start backend: `cd backend && uvicorn main:app --reload`
  2. Check CORS origins in `backend/main.py`

### "Module not found"
- **Cause**: Missing dependencies
- **Fix**: 
  ```bash
  cd frontend
  rm -rf node_modules package-lock.json
  npm install
  ```

### "Port already in use"
- **Cause**: Another process using the port
- **Fix**: Kill the process or use a different port

## Quick Diagnostic Commands

```bash
# Check all running processes on ports 3000 and 8000
lsof -i :3000 -i :8000

# Check Node.js version
node --version  # Should be 14+

# Check Python version
python3 --version  # Should be 3.8+

# Check if dependencies are installed
cd docufix-poc/frontend && npm list
cd docufix-poc/backend && pip list
```

## Still Having Issues?

1. **Check terminal output** for error messages
2. **Check browser console** (F12) for JavaScript errors
3. **Check browser Network tab** for failed requests
4. **Verify both servers are running:**
   - Backend: `http://localhost:8000`
   - Frontend: `http://localhost:3000`

## Reset Everything

If nothing works, try a complete reset:

```bash
# Stop all processes
pkill -f "react-scripts"
pkill -f "uvicorn"

# Clean frontend
cd docufix-poc/frontend
rm -rf node_modules package-lock.json
npm install

# Clean backend
cd ../backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Restart both
# Terminal 1:
cd backend && source venv/bin/activate && uvicorn main:app --reload

# Terminal 2:
cd frontend && npm start
```


