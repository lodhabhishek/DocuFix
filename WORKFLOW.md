# 🔄 DocuFix POC - Complete Workflow

## Overview

This document describes the complete workflow of the DocuFix POC application, from document upload to approval and reuse.

## 📋 Workflow Steps

### 1. Document Upload
**Location:** Documents Page (`/`)

1. User clicks "Upload Document"
2. Selects a `.docx` file
3. File is uploaded to backend
4. Backend parses the document:
   - Extracts content to XML format
   - Identifies structured data (materials, equipment, methods)
   - Detects gaps (missing catalog numbers, invalid configurations)
5. Document is **automatically locked** for protection
6. Document status: `draft` → `locked`

**Key Features:**
- ✅ Automatic gap detection
- ✅ Document locked by default
- ✅ Structured data extraction

### 2. Document Review & Editing
**Location:** Documents Page → Click on Document

1. User clicks on uploaded document
2. Document editor opens showing:
   - XML content
   - Structured data tables
   - Identified gaps (highlighted)
3. User clicks **"Unlock Document"**
   - Confirmation dialog appears
   - Document becomes editable
   - Status: `locked` → `draft`
4. User edits content to fill gaps:
   - Updates missing catalog numbers
   - Fixes invalid configurations
   - Makes other corrections
5. User clicks **"Save Changes"**
   - Content is updated
   - Structured data is re-extracted
   - Gaps are re-identified
6. User clicks **"Lock Document"**
   - Document is protected again
   - Status: `draft` → `locked`

**Key Features:**
- ✅ Lock/unlock protection
- ✅ Real-time gap highlighting
- ✅ Structured data preview

### 3. Submission for Review
**Location:** Documents Page → Document Editor

1. After making changes, user clicks **"Submit for Review/Approval"**
2. Submission form appears
3. User enters submission notes (optional)
4. User clicks **"Submit"**
5. Document is automatically locked
6. Submission record is created
7. Document status: `locked` → `submitted`

**Key Features:**
- ✅ Automatic locking on submission
- ✅ Submission notes tracking
- ✅ Cannot edit during review

### 4. Review & Approval
**Location:** Review Page (`/review`)

1. Reviewer navigates to Review page
2. Sees list of pending submissions
3. Clicks on a submission to view:
   - Document details
   - Structured data
   - Changes summary
   - Submission notes
4. Reviewer adds review notes
5. Reviewer makes decision:
   - **Approve**: Document moves to approved status
   - **Reject**: Document returns to draft (unlocked for editing)

**If Approved:**
- Document status: `submitted` → `approved`
- XML file is saved to `approved/` directory
- JSON file is saved to `approved/` directory
- Approved document record is created
- Document remains locked

**If Rejected:**
- Document status: `submitted` → `draft`
- Document is unlocked
- User can make corrections and resubmit

**Key Features:**
- ✅ Cannot edit during review
- ✅ Approval/rejection workflow
- ✅ Automatic file generation (XML/JSON)

### 5. Download & Reuse
**Location:** Approved Page (`/approved`)

1. User navigates to Approved page
2. Sees list of all approved documents
3. For each approved document:
   - **Download XML**: Downloads the XML file
   - **View JSON**: Displays JSON data for reuse
   - **Copy JSON**: Copies JSON to clipboard

**Key Features:**
- ✅ XML download for document format
- ✅ JSON format for data reuse
- ✅ Easy copy-to-clipboard

## 🔐 Document States & Protection

### State Flow
```
draft → locked → submitted → under_review → approved
  ↑                                    ↓
  └────────────── rejected ───────────┘
```

### Protection Rules

| State | Can Edit? | Can Submit? | Can Review? | Can Download? |
|-------|-----------|-------------|-------------|---------------|
| draft | ✅ (if unlocked) | ✅ | ❌ | ❌ |
| locked | ❌ | ✅ | ❌ | ❌ |
| submitted | ❌ | ❌ | ✅ | ❌ |
| under_review | ❌ | ❌ | ✅ | ❌ |
| approved | ❌ | ❌ | ❌ | ✅ |
| rejected | ✅ (unlocked) | ✅ | ❌ | ❌ |

## 📊 Gap Detection

### Material Gaps
- **Missing Catalog Number**: Material has no catalog number
- **Missing Supplier**: Material has no supplier information
- **Missing Lot Number**: Material has no lot number

### Equipment Gaps
- **Invalid Configuration**: Configuration is "None" or empty
- **Missing Model Number**: Equipment has no model number
- **Missing Serial Number**: Equipment has no serial number

### Gap Highlighting
- **Red**: Missing required field
- **Orange**: Invalid value
- **Yellow Row**: Row contains gaps

## 💾 File Storage

### Upload Directory (`uploads/`)
- Original `.docx` files uploaded by users
- Files are stored with original filenames

### Approved Directory (`approved/`)
- **XML Files**: `{section_id}.xml` - Document in XML format
- **JSON Files**: `{section_id}.json` - Structured data for reuse

### Database (`docufix.db`)
- Document records
- Submission records
- Approved document records
- All metadata and relationships

## 🔄 Complete Example Flow

1. **Upload**: User uploads "Material Methods.docx"
   - System detects: Missing catalog number for "Buffer Solution"
   - Document is locked

2. **Edit**: User unlocks document
   - Adds catalog number "CAT-123" to Buffer Solution
   - Saves changes
   - Locks document

3. **Submit**: User submits for review
   - Adds note: "Filled missing catalog number"
   - Document becomes locked and submitted

4. **Review**: Reviewer approves submission
   - Adds note: "Catalog number verified"
   - Document is approved

5. **Download**: User downloads approved XML
   - Gets "DOC-1-20231123120000.xml"
   - Views JSON data for reuse

## 🎯 Key Benefits

1. **Protection**: Documents locked by default prevent accidental edits
2. **Gap Detection**: Automatic identification of missing information
3. **Workflow**: Clear submission → review → approval process
4. **Reusability**: JSON format enables easy data reuse
5. **Traceability**: All changes tracked through submission workflow
6. **Security**: Cannot edit during review/approval process

## 📝 Notes

- Documents are **always locked** during review/approval
- Only **approved documents** can be downloaded
- **Rejected documents** return to draft and can be edited
- All **approved data** is stored in both XML and JSON formats
- **Gap detection** runs automatically on upload and after edits


