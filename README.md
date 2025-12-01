# 🔒 DocuFix POC

**Turn gaps into clarity — approved data, ready for reuse**

A complete proof-of-concept application for document quality management, gap detection, approval workflow, and data reuse.

## 📋 Features

### ✅ Complete Workflow
1. **Document Upload** - Upload DOCX files through the UI
2. **Gap Detection** - Automatically identifies missing catalog numbers, invalid configurations, etc.
3. **Document Locking** - Documents are locked by default, unlock to edit
4. **Content Editing** - Update missing information after unlocking
5. **Submission** - Submit documents for review/approval
6. **Review & Approval** - Review submissions and approve/reject
7. **Download** - Download approved documents as XML
8. **JSON Storage** - Approved data stored as JSON for reuse

### 🔐 Document Protection
- Documents are **locked by default** after upload
- Cannot be edited when locked
- Cannot be edited during review/approval process
- Unlock confirmation required
- Visual lock status indicators

### 📊 Gap Detection
- Identifies missing catalog numbers in materials
- Detects invalid "None" configurations in equipment
- Highlights gaps in structured data tables
- Provides gap summary with counts

## 🏗️ Architecture

```
docufix-poc/
├── backend/              # FastAPI backend
│   ├── main.py         # API endpoints
│   ├── models.py       # Database models
│   ├── schemas.py      # Pydantic schemas
│   ├── database.py     # Database setup
│   └── document_parser.py  # DOCX parsing & gap detection
├── frontend/            # React frontend
│   ├── src/
│   │   ├── pages/      # Page components
│   │   │   ├── DocumentUpload.js
│   │   │   ├── DocumentEditor.js
│   │   │   ├── ReviewPage.js
│   │   │   └── ApprovedDocuments.js
│   │   └── services/   # API client
│   └── package.json
├── uploads/            # Uploaded documents storage
└── approved/           # Approved documents (XML/JSON)
```

## 📦 Transferring to Another Laptop

To share this codebase with another team member:

1. **Package the codebase:**
   ```bash
   ./package_for_transfer.sh
   ```
   This creates `docufix-poc-transfer.zip` excluding unnecessary files.

2. **Share the package:**
   - Transfer `docufix-poc-transfer.zip` via USB, cloud storage, or email
   - Share `TEAM_MEMBER_TRANSFER_GUIDE.md` for setup instructions

3. **Team member setup:**
   - Extract the ZIP file
   - Run `./quick_setup.sh` for automated setup
   - Or follow manual setup in `TEAM_MEMBER_TRANSFER_GUIDE.md`

For detailed instructions, see **`TEAM_MEMBER_TRANSFER_GUIDE.md`**

## 🚀 Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 14+
- npm or yarn

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd docufix-poc/backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the backend server:**
   ```bash
   uvicorn main:app --reload --port 8000
   ```

   The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd docufix-poc/frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

   The app will open at `http://localhost:3000`

## 📖 Usage Guide

### 1. Upload Document
- Go to the **Documents** page
- Click "Upload Document" and select a `.docx` file
- The document will be automatically parsed and gaps will be identified
- Document is **locked by default**

### 2. Review & Edit Document
- Click on an uploaded document to open the editor
- View the structured data and identified gaps
- Click **"Unlock Document"** to enable editing
- Update missing information in the XML content
- Click **"Save Changes"** to update
- Click **"Lock Document"** when finished

### 3. Submit for Review
- After making changes, click **"Submit for Review/Approval"**
- Add submission notes (optional)
- Click **"Submit"**
- Document status changes to "submitted" and becomes locked

### 4. Review & Approve
- Go to the **Review** page
- Click on a submission to view details
- Review the structured data and changes
- Add review notes
- Click **"Approve"** or **"Reject"**
- Approved documents are stored as XML and JSON

### 5. Download Approved Documents
- Go to the **Approved** page
- View all approved documents
- Click **"Download XML"** to download the XML file
- Click **"View JSON"** to see the JSON data for reuse
- Click **"Copy JSON"** to copy JSON to clipboard

## 🔄 Workflow States

```
draft → locked → submitted → under_review → approved
  ↑                                    ↓
  └────────────── rejected ───────────┘
```

- **draft**: Document uploaded, can be edited
- **locked**: Document is protected, cannot be edited
- **submitted**: Submitted for review, cannot be edited
- **under_review**: Being reviewed, cannot be edited
- **approved**: Approved and available for download
- **rejected**: Rejected, returns to draft status

## 📁 File Storage

- **Uploads**: `docufix-poc/uploads/` - Original uploaded DOCX files
- **Approved**: `docufix-poc/approved/` - Approved XML and JSON files
- **Database**: `docufix-poc/docufix.db` - SQLite database

## 🛠️ API Endpoints

### Documents
- `POST /api/documents/upload` - Upload document
- `GET /api/documents` - List documents
- `GET /api/documents/{id}` - Get document details
- `GET /api/documents/{id}/content` - Get document content & gaps
- `POST /api/documents/{id}/lock` - Lock document
- `POST /api/documents/{id}/unlock` - Unlock document
- `PUT /api/documents/{id}/update` - Update document content

### Submissions
- `POST /api/submissions/create` - Create submission
- `GET /api/submissions` - List submissions
- `GET /api/submissions/{id}` - Get submission details
- `POST /api/submissions/{id}/review` - Review submission

### Approved Documents
- `GET /api/approved` - List approved documents
- `GET /api/approved/{id}/download` - Download XML
- `GET /api/approved/{id}/json` - Get JSON data

## 🧪 Testing

### Test Document Upload
1. Upload a DOCX file with materials/equipment
2. Check that gaps are identified
3. Verify document is locked

### Test Editing Workflow
1. Unlock document
2. Edit content
3. Save changes
4. Lock document
5. Submit for review

### Test Approval Workflow
1. Submit document
2. Review in Review page
3. Approve submission
4. Check Approved page
5. Download XML and view JSON

## 📝 Notes

- Documents are **locked by default** for protection
- During review/approval, documents **cannot be edited**
- Approved documents are stored as both **XML** and **JSON**
- JSON format is optimized for **data reuse**
- All changes are tracked in the submission workflow

## 🐛 Troubleshooting

### Backend Issues
- **Port 8000 already in use**: Change port in `uvicorn` command
- **Module not found**: Ensure virtual environment is activated
- **Database errors**: Delete `docufix.db` and restart

### Frontend Issues
- **Port 3000 already in use**: Change port in `package.json` or use `PORT=3001 npm start`
- **API connection errors**: Ensure backend is running on port 8000
- **CORS errors**: Check backend CORS settings in `main.py`

## 📄 License

This is a proof-of-concept application for demonstration purposes.


