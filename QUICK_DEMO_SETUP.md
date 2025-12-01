# Quick Demo Setup Guide

## 🚀 Fastest Way to Demo from Other Systems

### Option 1: Same Network (Recommended for Internal Demos)

**Time: 2 minutes**

1. **Run the demo script:**
   ```bash
   cd /Users/abhisheklodh/Wireframe/docufix-poc
   ./start_demo.sh
   ```

2. **The script will:**
   - Find your local IP address
   - Start backend on `0.0.0.0:8000` (accessible from network)
   - Start frontend on `0.0.0.0:3000` (accessible from network)
   - Display the URL to share

3. **Share the URL:**
   - The script will show: `http://YOUR_IP:3000`
   - Share this URL with others on the same network
   - They can access it from any device (laptop, phone, tablet)

**Example:**
```
🌐 Network access (from other devices):
   Frontend: http://192.168.1.100:3000
```

---

### Option 2: ngrok (For External/Remote Demos)

**Time: 5 minutes**

1. **Install ngrok:**
   ```bash
   # macOS
   brew install ngrok
   
   # Or download from https://ngrok.com/download
   ```

2. **Start your app normally:**
   ```bash
   ./start_demo.sh
   ```

3. **In a new terminal, create tunnel:**
   ```bash
   ngrok http 3000
   ```

4. **Update backend CORS:**
   - Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
   - Edit `backend/main.py`:
   ```python
   origins = [
       "http://localhost:3000",
       "https://abc123.ngrok.io",  # Add your ngrok URL
   ]
   ```

5. **Restart backend:**
   - Stop and restart the backend
   - Share the ngrok URL with others

**Note:** Free ngrok URLs change on restart. For stable URLs, use ngrok paid plan.

---

### Option 3: Allow All Origins (Quick Demo Fix)

**For quick demos only - not for production!**

1. **Edit `backend/main.py`:**
   ```python
   origins = ["*"]  # Allow all origins
   ```

2. **Restart backend**

3. **Run:**
   ```bash
   ./start_demo.sh
   ```

---

## 🔧 Troubleshooting

### Can't Access from Other Devices?

1. **Check Firewall:**
   - macOS: System Preferences > Security & Privacy > Firewall
   - Allow connections for Terminal/Node/Python

2. **Verify Same Network:**
   - All devices must be on same WiFi/LAN
   - Check IP addresses are in same range

3. **Test Backend Directly:**
   ```bash
   # From another device, test:
   curl http://YOUR_IP:8000
   ```

4. **Check CORS:**
   - Backend must allow the frontend URL
   - Check browser console for CORS errors

---

## 📱 Mobile Access

Once running with `./start_demo.sh`:
- Open mobile browser
- Go to: `http://YOUR_IP:3000`
- Works on any device on same network!

---

## 🌐 Cloud Deployment

For permanent hosting, see `DEPLOYMENT_GUIDE.md` for:
- Railway.app (easiest)
- Heroku
- AWS/EC2
- Docker

