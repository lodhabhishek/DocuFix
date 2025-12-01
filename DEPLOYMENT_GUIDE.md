# DocuFix POC - Deployment Guide

This guide provides multiple options for hosting the DocuFix POC application so it can be accessed from other systems for demos.

## 🚀 Quick Options Summary

1. **Local Network Access** (Fastest - 5 minutes) - Access from other devices on same network
2. **ngrok/Tunneling** (Quick Demo - 10 minutes) - Public URL for temporary demos
3. **Cloud Hosting** (Production-ready) - Deploy to cloud platforms
4. **Docker Deployment** (Portable) - Containerized deployment

---

## Option 1: Local Network Access (Best for Internal Demos)

### Prerequisites
- All devices must be on the same network (WiFi/LAN)
- Firewall must allow connections on ports 3000 and 8000

### Steps

#### 1. Update CORS Configuration

Edit `backend/main.py`:

```python
# CORS middleware
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    # Add your local IP address
    "http://YOUR_LOCAL_IP:3000",  # Replace with your actual IP
    # Or allow all origins for demo (less secure)
    # "*"  # Uncomment for open access during demo
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 2. Find Your Local IP Address

**On macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
# Or
ipconfig getifaddr en0  # macOS
```

**On Windows:**
```bash
ipconfig
# Look for IPv4 Address under your network adapter
```

#### 3. Update Frontend API Configuration

Edit `frontend/src/services/api.js` (or wherever API base URL is configured):

```javascript
// Change from:
const API_BASE_URL = 'http://localhost:8000';

// To:
const API_BASE_URL = 'http://YOUR_LOCAL_IP:8000';
// Or use environment variable (see below)
```

#### 4. Start Backend with Host Binding

```bash
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### 5. Start Frontend with Host Binding

```bash
cd frontend
# Set environment variable
export HOST=0.0.0.0
npm start

# Or on Windows:
set HOST=0.0.0.0
npm start
```

#### 6. Access from Other Devices

- **From other computers on same network:**
  - Open browser: `http://YOUR_LOCAL_IP:3000`
  - Example: `http://192.168.1.100:3000`

- **From mobile devices on same network:**
  - Same URL: `http://YOUR_LOCAL_IP:3000`

---

## Option 2: ngrok Tunneling (Best for Quick External Demos)

Perfect for demos where devices are on different networks.

### Steps

#### 1. Install ngrok

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

#### 2. Start Your Application Locally

```bash
# Terminal 1: Start backend
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2: Start frontend
cd frontend
npm start
```

#### 3. Create ngrok Tunnels

**Terminal 3: Tunnel for Backend**
```bash
ngrok http 8000
# Note the forwarding URL, e.g., https://abc123.ngrok.io
```

**Terminal 4: Tunnel for Frontend**
```bash
ngrok http 3000
# Note the forwarding URL, e.g., https://xyz789.ngrok.io
```

#### 4. Update CORS and API Configuration

**Update `backend/main.py`:**
```python
origins = [
    "http://localhost:3000",
    "https://xyz789.ngrok.io",  # Your frontend ngrok URL
    # Add more as needed
]
```

**Update `frontend/src/services/api.js`:**
```javascript
const API_BASE_URL = 'https://abc123.ngrok.io';  // Your backend ngrok URL
```

#### 5. Restart Services

Restart both backend and frontend, then access via the frontend ngrok URL.

**Note:** Free ngrok URLs change on each restart. For stable URLs, use ngrok paid plan or see Option 3.

---

## Option 3: Cloud Hosting (Production-Ready)

### Option 3A: Railway.app (Easiest Cloud Option)

#### Backend Deployment

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your repository

3. **Configure Backend**
   - Add `railway.json` in `backend/`:
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

   - Add `requirements.txt` in `backend/` (if not exists)
   - Add `Procfile` in `backend/`:
   ```
   web: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

4. **Set Environment Variables**
   - In Railway dashboard, add:
     - `PYTHON_VERSION=3.9`
     - Any other required env vars

5. **Update CORS**
   ```python
   origins = [
       "http://localhost:3000",
       "https://your-frontend-domain.com",
       "*"  # For demo, allow all
   ]
   ```

#### Frontend Deployment

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Railway**
   - Create new service in same project
   - Deploy `frontend/build` folder
   - Set start command: `npx serve -s build -l $PORT`

3. **Update API URL**
   - Use Railway's backend URL in frontend build
   - Or use environment variables

### Option 3B: Heroku

#### Backend

1. **Install Heroku CLI**
   ```bash
   brew install heroku/brew/heroku
   ```

2. **Create Heroku App**
   ```bash
   cd backend
   heroku create docufix-backend
   ```

3. **Add Procfile**
   ```
   web: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

4. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy backend"
   git push heroku main
   ```

#### Frontend

1. **Build and Deploy**
   ```bash
   cd frontend
   npm run build
   heroku create docufix-frontend
   heroku buildpacks:set heroku/nodejs
   echo "web: npx serve -s build -l \$PORT" > Procfile
   git add .
   git commit -m "Deploy frontend"
   git push heroku main
   ```

### Option 3C: AWS/EC2

1. **Launch EC2 Instance**
   - Choose Ubuntu/Debian AMI
   - Open ports 22, 80, 443, 3000, 8000 in security group

2. **SSH into Instance**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

3. **Install Dependencies**
   ```bash
   sudo apt update
   sudo apt install python3-pip nodejs npm nginx
   ```

4. **Deploy Backend**
   ```bash
   # Clone repo
   git clone your-repo
   cd docufix-poc/backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   
   # Use systemd to run as service
   sudo nano /etc/systemd/system/docufix-backend.service
   ```

   Service file:
   ```ini
   [Unit]
   Description=DocuFix Backend
   After=network.target

   [Service]
   User=ubuntu
   WorkingDirectory=/home/ubuntu/docufix-poc/backend
   Environment="PATH=/home/ubuntu/docufix-poc/backend/venv/bin"
   ExecStart=/home/ubuntu/docufix-poc/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000

   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   sudo systemctl enable docufix-backend
   sudo systemctl start docufix-backend
   ```

5. **Deploy Frontend**
   ```bash
   cd ../frontend
   npm install
   npm run build
   sudo cp -r build/* /var/www/html/
   ```

6. **Configure Nginx**
   ```bash
   sudo nano /etc/nginx/sites-available/docufix
   ```

   Nginx config:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           root /var/www/html;
           try_files $uri $uri/ /index.html;
       }

       location /api {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

   ```bash
   sudo ln -s /etc/nginx/sites-available/docufix /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## Option 4: Docker Deployment (Portable)

### Create Docker Files

#### Backend Dockerfile (`backend/Dockerfile`)
```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Frontend Dockerfile (`frontend/Dockerfile`)
```dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Frontend nginx.conf (`frontend/nginx.conf`)
```nginx
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Docker Compose (`docker-compose.yml`)
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./uploads:/app/uploads
      - ./approved:/app/approved
    environment:
      - DATABASE_URL=sqlite:///./docufix.db

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
    environment:
      - REACT_APP_API_URL=http://localhost:8000
```

### Deploy with Docker

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## 🔧 Environment Variables Setup

### Backend Environment Variables

Create `backend/.env`:
```env
DATABASE_URL=sqlite:///./docufix.db
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com
UPLOAD_DIR=./uploads
APPROVED_DIR=./approved
```

### Frontend Environment Variables

Create `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENV=production
```

Update `frontend/src/services/api.js`:
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```

---

## 📝 Quick Start Scripts

### Network Access Script (`start_demo.sh`)

```bash
#!/bin/bash

# Get local IP
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I | awk '{print $1}')

echo "🚀 Starting DocuFix POC for network access"
echo "📍 Your local IP: $LOCAL_IP"
echo "🌐 Access from other devices: http://$LOCAL_IP:3000"
echo ""

# Start backend
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start frontend
cd ../frontend
HOST=0.0.0.0 npm start &
FRONTEND_PID=$!

echo "✅ Backend running on http://$LOCAL_IP:8000"
echo "✅ Frontend running on http://$LOCAL_IP:3000"
echo ""
echo "Press Ctrl+C to stop"

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
```

Make it executable:
```bash
chmod +x start_demo.sh
./start_demo.sh
```

---

## 🔒 Security Considerations

1. **CORS Configuration**
   - For production, specify exact origins
   - Avoid using `"*"` in production

2. **HTTPS**
   - Use HTTPS in production
   - Configure SSL certificates (Let's Encrypt)

3. **Authentication**
   - Add authentication for production use
   - Use environment variables for secrets

4. **Firewall**
   - Only open necessary ports
   - Use security groups (cloud) or firewall rules

---

## 🐛 Troubleshooting

### Can't Access from Other Devices

1. **Check Firewall**
   ```bash
   # macOS: System Preferences > Security & Privacy > Firewall
   # Linux: sudo ufw allow 3000, sudo ufw allow 8000
   # Windows: Windows Defender Firewall > Allow app
   ```

2. **Verify IP Address**
   - Ensure you're using the correct local IP
   - Check if device is on same network

3. **Check CORS**
   - Verify backend CORS allows your frontend URL
   - Check browser console for CORS errors

### Backend Not Accessible

1. **Check Host Binding**
   - Use `--host 0.0.0.0` not `--host localhost`

2. **Check Port**
   - Verify port 8000 is not blocked
   - Try different port if needed

### Frontend Can't Connect to Backend

1. **Update API URL**
   - Check `frontend/src/services/api.js`
   - Use correct backend URL/IP

2. **Check Network**
   - Ensure both services are running
   - Test backend directly: `curl http://backend-url:8000`

---

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Check backend logs
3. Verify network connectivity
4. Review CORS configuration

---

## 🎯 Recommended for Different Scenarios

- **Quick Internal Demo**: Option 1 (Local Network)
- **External Demo (Temporary)**: Option 2 (ngrok)
- **Stable Demo/Production**: Option 3 (Cloud Hosting)
- **Portable/Containerized**: Option 4 (Docker)

