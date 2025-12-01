# Git Commit Guide - What to Commit to GitHub

## 📁 Folders and Files to COMMIT

### ✅ Backend (`backend/`)
**COMMIT:**
- `main.py` - FastAPI application
- `document_parser.py` - Document parsing logic (with all fixes)
- `models.py` - Database models
- `schemas.py` - Pydantic schemas
- `database.py` - Database setup
- `requirements.txt` - Python dependencies
- `__init__.py` - Python package marker

**DO NOT COMMIT:**
- `venv/` - Virtual environment (already in .gitignore)
- `*.db` - Database files (already in .gitignore)
- `*.db-shm`, `*.db-wal` - SQLite temporary files

### ✅ Frontend (`frontend/`)
**COMMIT:**
- `src/` - All source code (components, pages, services)
- `public/` - Public assets (index.html, favicon)
- `package.json` - NPM dependencies
- `package-lock.json` - Locked dependency versions
- `.gitignore` - Git ignore rules

**DO NOT COMMIT:**
- `node_modules/` - NPM packages (already in .gitignore)
- `build/` - Production build (already in .gitignore)
- `.env.local` - Local environment variables

### ✅ Documentation Files
**COMMIT:**
- `README.md` - Main readme
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
- `QUICK_DEMO_SETUP.md` - Quick demo guide
- `TABLE_HEADER_FIX_GUIDE.md` - Fix documentation
- `SETUP.md`, `WORKFLOW.md`, `TROUBLESHOOTING.md` - All documentation
- `*.md` files in root

### ✅ Configuration Files
**COMMIT:**
- `.gitignore` - Git ignore rules
- `start_demo.sh` - Demo startup script
- `start_backend.sh` - Backend startup script
- `start_frontend.sh` - Frontend startup script
- `RESTART_BACKEND.sh` - Restart script
- `quick_setup.sh` - Quick setup script

### ✅ Root Directory
**COMMIT:**
- All `.md` documentation files
- All `.sh` script files
- `.gitignore`

**DO NOT COMMIT:**
- `uploads/` - User uploaded files (already in .gitignore)
- `approved/` - Approved document files (already in .gitignore)
- `docufix-poc-transfer/` - Transfer folder (if it's a duplicate)
- `*.zip` - Archive files
- `*.db` - Database files

---

## 🚫 Folders and Files to NOT COMMIT

### ❌ Already Ignored (in .gitignore)
- `backend/venv/` - Python virtual environment
- `backend/*.db` - Database files
- `frontend/node_modules/` - NPM packages
- `frontend/build/` - Production build
- `uploads/*` - Uploaded documents
- `approved/*` - Approved documents
- `.DS_Store` - macOS system files

### ❌ Should NOT Commit
- `docufix-poc-transfer/` - If it's a duplicate/backup folder
- `*.zip` files - Archive files
- `*.db-shm`, `*.db-wal` - SQLite temporary files
- Any personal/local configuration files

---

## 📝 Step-by-Step Commit Process

### 1. Initialize Git Repository (if not already done)

```bash
cd /Users/abhisheklodh/Wireframe/docufix-poc
git init
```

### 2. Check Current Status

```bash
git status
```

### 3. Add Files to Staging

**Option A: Add everything (respects .gitignore)**
```bash
git add .
```

**Option B: Add specific folders (recommended)**
```bash
# Add backend source code
git add backend/*.py backend/requirements.txt

# Add frontend source code
git add frontend/src/ frontend/public/ frontend/package.json frontend/package-lock.json

# Add documentation
git add *.md

# Add scripts
git add *.sh

# Add configuration
git add .gitignore
```

### 4. Verify What Will Be Committed

```bash
git status
# Review the list of files to be committed
```

### 5. Commit Changes

```bash
git commit -m "Update DocuFix POC: Fix table header preservation and cursor position issues

- Fixed table headers being overwritten with internal identifiers
- Fixed cursor jumping to beginning after saving missing values
- Improved cursor position restoration with multiple fallback strategies
- Updated CORS and API configuration for network access
- Added deployment guide and demo startup scripts"
```

### 6. Add Remote Repository (if not already added)

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
# Or if using SSH:
# git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO.git
```

### 7. Push to GitHub

```bash
# First time push
git push -u origin main

# Or if your default branch is master:
git push -u origin master

# Subsequent pushes
git push
```

---

## 🔍 Quick Check: What Will Be Committed

Run this to see what files will be committed:

```bash
cd /Users/abhisheklodh/Wireframe/docufix-poc

# See all files that will be tracked
git add -n .
# Or
git status --short
```

---

## 📋 Recommended Commit Structure

### Essential Files to Commit:

```
docufix-poc/
├── backend/
│   ├── main.py                    ✅
│   ├── document_parser.py         ✅ (with all fixes)
│   ├── models.py                  ✅
│   ├── schemas.py                 ✅
│   ├── database.py                ✅
│   ├── requirements.txt           ✅
│   └── __init__.py                ✅
│
├── frontend/
│   ├── src/                       ✅ (all source files)
│   ├── public/                    ✅
│   ├── package.json               ✅
│   ├── package-lock.json          ✅
│   └── .gitignore                 ✅
│
├── *.md                           ✅ (all documentation)
├── *.sh                           ✅ (all scripts)
├── .gitignore                     ✅
└── README.md                       ✅
```

---

## ⚠️ Important Notes

1. **Database Files**: Never commit `*.db` files - they contain local data
2. **Environment Files**: Don't commit `.env` files with secrets
3. **Build Artifacts**: Don't commit `build/` or `node_modules/`
4. **Virtual Environment**: Don't commit `venv/` or `env/`
5. **Uploads/Approved**: Don't commit user-uploaded or approved documents

---

## 🎯 Quick Commit Command

If you want to commit everything that should be committed:

```bash
cd /Users/abhisheklodh/Wireframe/docufix-poc

# Initialize if needed
git init

# Add all files (respects .gitignore)
git add .

# Check what will be committed
git status

# Commit
git commit -m "Update DocuFix POC with latest fixes and improvements"

# Add remote and push
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

---

## 🔐 Security Checklist

Before committing, ensure:
- ✅ No API keys or secrets in code
- ✅ No database files with real data
- ✅ No `.env` files with credentials
- ✅ No personal/sensitive information in code
- ✅ `.gitignore` is properly configured

---

## 📦 Optional: Create .gitkeep Files

To preserve empty directories:

```bash
# Create .gitkeep in uploads and approved if they should be tracked
touch uploads/.gitkeep
touch approved/.gitkeep
git add uploads/.gitkeep approved/.gitkeep
```

---

## 🚀 After Pushing

1. **Verify on GitHub**: Check that all files are present
2. **Test Clone**: Clone the repo elsewhere to verify it works
3. **Update README**: Ensure README has setup instructions
4. **Add License**: Consider adding a LICENSE file

