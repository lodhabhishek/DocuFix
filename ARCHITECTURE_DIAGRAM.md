# DocuFix POC - Architecture Diagram

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              React Frontend (Port 3000)                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │  Document    │  │    Review    │  │   Approved   │  │  │
│  │  │   Upload     │  │   & Approve  │  │  Documents   │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │  │
│  │                                                           │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │         Table Editor Component                     │  │  │
│  │  │  - Editable table cells                           │  │  │
│  │  │  - Add/Remove rows and columns                    │  │  │
│  │  │  - Real-time updates                              │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────────────┐
│                        API LAYER                                 │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         FastAPI Backend (Port 8000)                       │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │              API Endpoints                          │  │  │
│  │  │  • Document Upload/Download                         │  │  │
│  │  │  • Lock/Unlock Operations                           │  │  │
│  │  │  • Submission Workflow                              │  │  │
│  │  │  • Review & Approval                               │  │  │
│  │  │  • JSON/XML Export                                 │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      PROCESSING LAYER                            │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Document Parser (python-docx)                     │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │   Extract    │  │   Structure  │  │   Gap        │  │  │
│  │  │   Content    │  │   Analysis   │  │   Detection  │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │  │
│  │                                                           │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │         Document Writer                          │  │  │
│  │  │  - Save tables to DOCX                          │  │  │
│  │  │  - Preserve document structure                  │  │  │
│  │  │  - Generate XML/JSON exports                    │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   SQLite     │  │   DOCX Files │  │  JSON/XML    │         │
│  │  Database    │  │   (Uploads)  │  │  (Approved)  │         │
│  │              │  │              │  │              │         │
│  │ • Documents  │  │ • Original   │  │ • Approved   │         │
│  │ • Submissions│  │   Word docs  │  │   data       │         │
│  │ • Approvals  │  │ • Editable   │  │ • Reusable   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

### Document Upload Flow
```
User → Frontend → API → Parser → Database
                    ↓
                 File System
                    ↓
              Gap Detection
                    ↓
              Response to User
```

### Document Editing Flow
```
User → Unlock → Edit Tables → Save → Parser → DOCX Update
                                    ↓
                              Database Update
                                    ↓
                            Structured Data Refresh
```

### Approval Workflow
```
Submit → Lock → Review → Approve → Generate XML/JSON
                              ↓
                        Store Approved Data
                              ↓
                        Available for Download
```

## Data Models

### Document Entity
```python
Document:
  - id: Integer
  - filename: String
  - file_path: String
  - status: String (draft/locked/submitted/approved)
  - is_locked: Boolean
  - uploaded_at: DateTime
  - updated_at: DateTime
```

### Submission Entity
```python
Submission:
  - id: Integer
  - document_id: ForeignKey
  - status: String (submitted/under_review/approved/rejected)
  - document_xml: Text
  - normalized_json: Text
  - changes_summary: Text
  - submitted_at: DateTime
  - reviewed_at: DateTime
```

### Approved Document Entity
```python
ApprovedDocument:
  - id: Integer
  - document_id: ForeignKey
  - section_id: String
  - version: Integer
  - xml_file_path: String
  - json_file_path: String
  - approved_by: String
  - approved_at: DateTime
```

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 | User interface |
| Frontend | React Router | Navigation |
| Frontend | Axios | API communication |
| Backend | FastAPI | REST API server |
| Backend | SQLAlchemy | Database ORM |
| Backend | python-docx | Word document processing |
| Backend | Pydantic | Data validation |
| Database | SQLite | Metadata storage |
| Storage | File System | Document files |

## Security Architecture

```
┌─────────────────────────────────────────┐
│         Security Layers                  │
├─────────────────────────────────────────┤
│ 1. Document Locking (Default)            │
│ 2. Status-Based Protection               │
│ 3. Confirmation Dialogs                  │
│ 4. CORS Configuration                    │
│ 5. Input Validation (Pydantic)          │
└─────────────────────────────────────────┘
```

## Deployment Architecture (Current POC)

```
┌─────────────────────────────────────────┐
│      Development Machine                 │
│  ┌──────────────┐  ┌──────────────┐    │
│  │   Frontend   │  │   Backend    │    │
│  │  (Port 3000) │  │  (Port 8000) │    │
│  └──────────────┘  └──────────────┘    │
│         │                  │            │
│         └──────────┬───────┘            │
│                   │                     │
│         ┌─────────▼─────────┐          │
│         │   File System     │          │
│         │  - uploads/      │          │
│         │  - approved/      │          │
│         │  - docufix.db    │          │
│         └──────────────────┘          │
└─────────────────────────────────────────┘
```

## Future Production Architecture

```
┌─────────────────────────────────────────┐
│         Load Balancer                    │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼────┐          ┌─────▼───┐
│Frontend│          │Backend │
│  (CDN) │          │(API)   │
└────────┘          └───┬────┘
                        │
            ┌───────────┼───────────┐
            │           │           │
      ┌─────▼──┐  ┌────▼────┐ ┌───▼────┐
      │Database│  │  Cache  │ │Storage │
      │(RDS)   │  │(Redis)  │ │  (S3)  │
      └────────┘  └─────────┘ └────────┘
```


