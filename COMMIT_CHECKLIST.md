# Pre-Commit Checklist

## ✅ Files to Commit

### Backend
- [ ] `backend/main.py`
- [ ] `backend/document_parser.py` (with latest fixes)
- [ ] `backend/models.py`
- [ ] `backend/schemas.py`
- [ ] `backend/database.py`
- [ ] `backend/requirements.txt`
- [ ] `backend/__init__.py`

### Frontend
- [ ] `frontend/src/` (all source files)
- [ ] `frontend/public/`
- [ ] `frontend/package.json`
- [ ] `frontend/package-lock.json`
- [ ] `frontend/.gitignore`

### Documentation
- [ ] `README.md`
- [ ] `DEPLOYMENT_GUIDE.md`
- [ ] `QUICK_DEMO_SETUP.md`
- [ ] `TABLE_HEADER_FIX_GUIDE.md`
- [ ] `GIT_COMMIT_GUIDE.md`
- [ ] All other `*.md` files

### Scripts
- [ ] `start_demo.sh`
- [ ] `start_backend.sh`
- [ ] `start_frontend.sh`
- [ ] `RESTART_BACKEND.sh`
- [ ] All other `*.sh` files

### Configuration
- [ ] `.gitignore`

---

## ❌ Files NOT to Commit

- [ ] `backend/venv/` (virtual environment)
- [ ] `backend/*.db` (database files)
- [ ] `frontend/node_modules/` (NPM packages)
- [ ] `frontend/build/` (build artifacts)
- [ ] `uploads/*` (user uploads)
- [ ] `approved/*` (approved documents)
- [ ] `docufix-poc-transfer/` (if duplicate)
- [ ] `*.zip` files

---

## 🔍 Quick Verification

Run this to see what will be committed:

```bash
cd /Users/abhisheklodh/Wireframe/docufix-poc
git status
```

If repository not initialized:
```bash
git init
git add .
git status  # Review the list
```

