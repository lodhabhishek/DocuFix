# Quick Commit Guide

## 🎯 What to Commit - Summary

### ✅ COMMIT These Folders:

1. **`backend/`** - Source code only
   - All `.py` files
   - `requirements.txt`
   - `__init__.py`

2. **`frontend/src/`** - All React source code
3. **`frontend/public/`** - Public assets
4. **`frontend/package.json`** and **`package-lock.json`**
5. **All `*.md` files** - Documentation
6. **All `*.sh` files** - Scripts
7. **`.gitignore`** - Git configuration

### ❌ DO NOT Commit:

- `backend/venv/` - Virtual environment
- `backend/*.db` - Database files
- `frontend/node_modules/` - NPM packages
- `frontend/build/` - Build output
- `uploads/` - User uploads
- `approved/` - Approved documents
- `docufix-poc-transfer/` - Transfer folder
- `*.zip` - Archive files

---

## 🚀 Quick Commands

### If Git Repository Not Initialized:

```bash
cd /Users/abhisheklodh/Wireframe/docufix-poc

# Initialize
git init

# Add all files (respects .gitignore)
git add .

# Check what will be committed
git status

# Commit
git commit -m "DocuFix POC: Latest updates with table header and cursor fixes"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push
git push -u origin main
```

### If Repository Already Exists:

```bash
cd /Users/abhisheklodh/Wireframe/docufix-poc

# Check status
git status

# Add all changes
git add .

# Commit
git commit -m "Update: Fix table headers and cursor position issues"

# Push
git push
```

---

## 📋 What Gets Committed (Automatically Excluded by .gitignore)

The `.gitignore` file will automatically exclude:
- ✅ Virtual environments (`venv/`)
- ✅ Node modules (`node_modules/`)
- ✅ Build files (`build/`)
- ✅ Database files (`*.db`)
- ✅ Uploads and approved documents
- ✅ Environment files (`.env`)

So `git add .` is safe - it will only add source code and documentation!

---

## 🔍 Verify Before Committing

```bash
# See what will be committed
git status

# See detailed file list
git status --short

# See what's ignored
git status --ignored
```

---

## 📝 Recommended Commit Message

```
Update DocuFix POC: Fix table header preservation and cursor position

- Fixed table headers being overwritten with internal identifiers (BG_ATN, Material_CTG#)
- Fixed cursor jumping to beginning after saving missing values
- Improved cursor position restoration with multiple fallback strategies
- Updated CORS configuration for network access
- Added deployment guide and demo startup scripts
- Enhanced missing value editing experience
```

