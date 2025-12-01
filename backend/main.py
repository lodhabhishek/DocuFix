from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import json
import shutil
from datetime import datetime
from pathlib import Path

import models, schemas, database
from document_parser import (
    parse_docx_to_xml, 
    extract_structured_data, 
    identify_gaps,
    get_docx_text_content,
    save_text_to_docx,
    save_structure_to_docx,
    get_docx_for_editing,
    get_docx_structure
)

app = FastAPI(
    title="DocuFix POC API",
    description="Document Fix POC - Turn gaps into clarity, approved data ready for reuse",
    version="1.0.0"
)

# CORS middleware
# Get allowed origins from environment variable or use defaults
import os
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_env:
    origins = [origin.strip() for origin in allowed_origins_env.split(",")]
else:
    origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ]
    # For demo purposes, you can uncomment the line below to allow all origins
    # WARNING: Only use "*" for demos, not in production!
    # origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create upload and approved directories (relative to backend directory)
BASE_DIR = Path(__file__).parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
APPROVED_DIR = BASE_DIR / "approved"
UPLOAD_DIR.mkdir(exist_ok=True)
APPROVED_DIR.mkdir(exist_ok=True)

@app.on_event("startup")
def on_startup():
    """Initialize database on startup"""
    database.init_db()

@app.get("/")
def read_root():
    return {
        "message": "DocuFix POC API",
        "version": "1.0.0",
        "endpoints": {
            "upload": "/api/documents/upload",
            "list": "/api/documents",
            "get": "/api/documents/{id}",
            "lock": "/api/documents/{id}/lock",
            "unlock": "/api/documents/{id}/unlock",
            "submit": "/api/submissions/create",
            "review": "/api/submissions/{id}/review",
            "approved": "/api/approved",
            "download": "/api/approved/{id}/download"
        }
    }

# ==================== Document Endpoints ====================

@app.post("/api/documents/upload", response_model=schemas.FileUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db)
):
    """Upload a document (DOCX)"""
    try:
        # Validate file type
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        if not (file.filename.endswith('.docx') or 
                file.content_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'):
            raise HTTPException(
                status_code=400, 
                detail="Invalid file type. Please upload a .docx file"
            )
        
        # Save uploaded file
        file_path = UPLOAD_DIR / file.filename
        
        # Handle duplicate filenames
        counter = 1
        original_path = file_path
        while file_path.exists():
            name_parts = original_path.stem, original_path.suffix
            file_path = UPLOAD_DIR / f"{name_parts[0]}_{counter}{name_parts[1]}"
            counter += 1
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Verify file was saved
        if not file_path.exists():
            raise HTTPException(status_code=500, detail="Failed to save file")
        
        # Parse document to XML
        xml_content = parse_docx_to_xml(str(file_path))
        
        # Extract structured data
        structured_data = extract_structured_data(xml_content)
        
        # Get document structure for gap detection in tables
        document_structure = get_docx_structure(str(file_path))
        
        # Identify gaps (including table cells)
        gaps = identify_gaps(structured_data, document_structure)
        
        # Create document record
        db_document = models.Document(
            filename=file_path.name,
            original_filename=file.filename,
            file_path=str(file_path),
            file_type="docx",
            status="draft",
            is_locked=True  # Documents are locked by default
        )
        db.add(db_document)
        
        try:
            db.commit()
            db.refresh(db_document)
        except Exception as db_error:
            db.rollback()
            # Clean up uploaded file if database operation failed
            if file_path.exists():
                try:
                    os.remove(file_path)
                except:
                    pass
            import traceback
            error_detail = traceback.format_exc()
            print(f"Database error during upload: {error_detail}")
            raise HTTPException(status_code=500, detail=f"Upload failed: Database error - {str(db_error)}")
        
        return schemas.FileUploadResponse(
            document_id=db_document.id,
            filename=file.filename,
            message=f"Document uploaded successfully. Found {gaps['total_gaps']} gaps.",
            status="draft"
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        import traceback
        error_detail = traceback.format_exc()
        print(f"Upload error: {error_detail}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/api/documents", response_model=List[schemas.DocumentResponse])
def list_documents(
    status: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """List all documents, optionally filtered by status"""
    query = db.query(models.Document)
    if status:
        query = query.filter(models.Document.status == status)
    documents = query.order_by(models.Document.uploaded_at.desc()).all()
    return documents

@app.get("/api/documents/{document_id}", response_model=schemas.DocumentResponse)
def get_document(document_id: int, db: Session = Depends(database.get_db)):
    """Get document details"""
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document

@app.get("/api/documents/{document_id}/content")
def get_document_content(document_id: int, db: Session = Depends(database.get_db)):
    """Get document content for editing (Word format) and structured data"""
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get DOCX content for editing
    docx_data = get_docx_for_editing(document.file_path)
    
    # Extract tables and paragraphs from document_structure
    document_structure = docx_data.get("document_structure", {})
    tables = document_structure.get("tables", [])
    paragraphs = document_structure.get("paragraphs", [])
    
    return {
        "document_id": document_id,
        "paragraphs": paragraphs,
        "tables": tables,
        "document_structure": document_structure,
        "text_content": docx_data.get("text_content", ""),
        "structured_data": docx_data["structured_data"],
        "gaps": docx_data["gaps"],
        "is_locked": document.is_locked,
        "status": document.status,
        "file_path": document.file_path
    }

@app.get("/api/documents/{document_id}/download")
def download_document(document_id: int, db: Session = Depends(database.get_db)):
    """Download the original DOCX file for viewing"""
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="Document file not found")
    
    return FileResponse(
        document.file_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=document.original_filename or document.filename
    )

@app.delete("/api/documents/{document_id}")
def delete_document(document_id: int, db: Session = Depends(database.get_db)):
    """Delete a document and its associated file"""
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Allow deletion but warn about status (frontend will handle confirmation)
    # We'll allow deletion of any status, but frontend should warn user
    
    # Delete the file from file system
    file_path = document.file_path
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            # Log error but continue with database deletion
            print(f"Warning: Could not delete file {file_path}: {str(e)}")
    
    # Delete associated submissions
    submissions = db.query(models.Submission).filter(models.Submission.document_id == document_id).all()
    for submission in submissions:
        db.delete(submission)
    
    # Delete associated approved documents
    approved_docs = db.query(models.ApprovedDocument).filter(models.ApprovedDocument.document_id == document_id).all()
    for approved_doc in approved_docs:
        # Delete associated XML and JSON files
        if os.path.exists(approved_doc.xml_file_path):
            try:
                os.remove(approved_doc.xml_file_path)
            except:
                pass
        if os.path.exists(approved_doc.json_file_path):
            try:
                os.remove(approved_doc.json_file_path)
            except:
                pass
        db.delete(approved_doc)
    
    # Delete the document record
    db.delete(document)
    db.commit()
    
    return {"message": f"Document '{document.original_filename}' deleted successfully"}

@app.post("/api/documents/{document_id}/lock")
def lock_document(document_id: int, db: Session = Depends(database.get_db)):
    """Lock a document (prevent editing)"""
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.status in ["submitted", "under_review", "approved"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot lock document in submitted/review/approved status"
        )
    
    document.is_locked = True
    document.status = "locked"
    document.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Document locked successfully", "is_locked": True}

@app.post("/api/documents/{document_id}/unlock")
def unlock_document(document_id: int, force: bool = False, db: Session = Depends(database.get_db)):
    """Unlock a document (allow editing)
    
    Args:
        document_id: ID of the document to unlock
        force: If True, unlock even if document is in submitted/review/approved status
    """
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Allow force unlock for rejected documents or if explicitly requested
    if document.status in ["submitted", "under_review", "approved"]:
        if not force:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot unlock document in {document.status} status. Use force=true to override, or reject the submission first."
            )
        # If force unlock, reset to draft
        document.status = "draft"
    
    document.is_locked = False
    if document.status not in ["draft", "locked"]:
        document.status = "draft"
    document.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Document unlocked successfully", "is_locked": False, "status": document.status}

@app.post("/api/documents/{document_id}/reset")
def reset_document_status(document_id: int, db: Session = Depends(database.get_db)):
    """Reset document status to draft and unlock it"""
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document.status = "draft"
    document.is_locked = False
    document.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Document reset to draft and unlocked", "is_locked": False, "status": "draft"}

@app.put("/api/documents/{document_id}/update")
async def update_document_content(
    document_id: int,
    content: Optional[str] = Form(None),
    structure: Optional[str] = Form(None),  # JSON string of document structure
    db: Session = Depends(database.get_db)
):
    """Update document content in Word format (only if unlocked)
    
    Can update either:
    - text content (content parameter)
    - structured content with tables (structure parameter as JSON)
    """
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.is_locked:
        raise HTTPException(status_code=400, detail="Document is locked. Unlock to edit.")
    
    if document.status in ["submitted", "under_review", "approved"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot edit document in submitted/review/approved status"
        )
    
    try:
        # If structure is provided, use structured save (preserves tables)
        preserved_table_metadata = None
        if structure:
            structure_data = json.loads(structure)
            
            # Extract and preserve table metadata (name, id, column_headers) before saving
            # This will be used during re-parsing to prevent incorrect table name extraction
            if "tables" in structure_data:
                preserved_table_metadata = {}
                for idx, table in enumerate(structure_data["tables"]):
                    preserved_table_metadata[idx] = {
                        "name": table.get("name"),
                        "id": table.get("id"),
                        "column_headers": table.get("column_headers")
                    }
            
            save_structure_to_docx(document.file_path, structure_data)
        elif content:
            # Otherwise, use text save
            save_text_to_docx(document.file_path, content)
        else:
            raise HTTPException(status_code=400, detail="Either content or structure must be provided")
        
        # Re-extract structured data after update, passing preserved metadata
        # This ensures table names are not overwritten by incorrect extraction from cell values
        docx_data = get_docx_for_editing(document.file_path, preserved_table_metadata)
        
        # Double-check: Restore original table names if they were preserved
        # This is a safety measure in case the preserved_metadata didn't work
        if structure_data and "tables" in structure_data and docx_data.get("document_structure"):
            original_tables = structure_data.get("tables", [])
            parsed_tables = docx_data.get("document_structure", {}).get("tables", [])
            
            # Restore original table names, IDs, and column headers
            for idx, original_table in enumerate(original_tables):
                if idx < len(parsed_tables):
                    # Preserve table name if it exists in original (only if parsed name seems wrong)
                    original_name = original_table.get("name", "")
                    parsed_name = parsed_tables[idx].get("name", "")
                    # If original name looks like a proper table name but parsed doesn't, restore it
                    if original_name and len(original_name) > 5 and original_name != parsed_name:
                        # Check if parsed name looks like a column header (short, uppercase, has # or _)
                        if (len(parsed_name) < 20 and ('_' in parsed_name or '#' in parsed_name or parsed_name.isupper())):
                            parsed_tables[idx]["name"] = original_name
                        elif original_name:  # Otherwise, always use original if it exists
                            parsed_tables[idx]["name"] = original_name
                    # Preserve table ID if it exists in original
                    if original_table.get("id"):
                        parsed_tables[idx]["id"] = original_table["id"]
                    # Preserve column headers if they exist in original
                    if original_table.get("column_headers"):
                        parsed_tables[idx]["column_headers"] = original_table["column_headers"]
        
        document.updated_at = datetime.utcnow()
        db.commit()
        
        return {
            "message": "Document content updated successfully",
            "structured_data": docx_data["structured_data"],
            "gaps": docx_data["gaps"],
            "document_structure": docx_data.get("document_structure")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save document: {str(e)}")

# ==================== Submission Endpoints ====================

@app.post("/api/submissions/create", response_model=schemas.SubmissionResponse)
def create_submission(
    submission: schemas.SubmissionCreate,
    db: Session = Depends(database.get_db)
):
    """Submit a document for review/approval"""
    document = db.query(models.Document).filter(models.Document.id == submission.document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.is_locked and document.status != "draft":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot submit document in {document.status} status"
        )
    
    # Lock document and change status
    document.is_locked = True
    document.status = "submitted"
    document.updated_at = datetime.utcnow()
    
    # Get current Word document content as XML for storage
    xml_content = submission.document_xml
    if not xml_content:
        xml_content = parse_docx_to_xml(document.file_path)
    
    # Extract structured data from document
    docx_data = get_docx_for_editing(document.file_path)
    
    # Get normalized JSON from submission or extract from document
    normalized_json = submission.normalized_json
    if not normalized_json:
        normalized_json = docx_data.get("structured_data", {})
    
    # Use submission_notes as changes_summary if changes_summary not provided
    changes_summary = submission.changes_summary or submission.submission_notes or "Document submitted for review"
    
    # Create submission
    db_submission = models.Submission(
        document_id=submission.document_id,
        status="submitted",
        document_xml=xml_content,  # Store XML representation of Word doc
        normalized_json=json.dumps(normalized_json),
        changes_summary=changes_summary
    )
    
    db.add(db_submission)
    
    db.commit()
    db.refresh(db_submission)
    
    # Create audit history entry for submission
    previous_status = "draft" if not document.status or document.status == "draft" else document.status
    audit_entry = models.AuditHistory(
        document_id=submission.document_id,
        submission_id=db_submission.id,
        action="submitted",
        performed_by=db_submission.submitted_by,
        performed_at=datetime.utcnow(),
        notes=changes_summary,
        previous_status=previous_status,
        new_status="submitted"
    )
    db.add(audit_entry)
    db.commit()
    
    return db_submission

@app.get("/api/submissions", response_model=List[schemas.SubmissionResponse])
def list_submissions(
    status: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    """List all submissions"""
    query = db.query(models.Submission)
    if status:
        query = query.filter(models.Submission.status == status)
    submissions = query.order_by(models.Submission.submitted_at.desc()).all()
    return submissions

@app.get("/api/submissions/{submission_id}", response_model=schemas.SubmissionResponse)
def get_submission(submission_id: int, db: Session = Depends(database.get_db)):
    """Get submission details"""
    submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission

@app.get("/api/submissions/{submission_id}/details")
def get_submission_details(submission_id: int, db: Session = Depends(database.get_db)):
    """Get full submission details including XML and JSON"""
    submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Get document info for file path
    document = db.query(models.Document).filter(models.Document.id == submission.document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Extract current gaps and document structure from the document
    gaps = {}
    document_structure = None
    try:
        # Get structure from document endpoint first (uses preserved metadata)
        doc_data = get_document_for_editing(submission.document_id, db)
        if doc_data.get("document_structure"):
            document_structure = doc_data["document_structure"]
        
        # Get gaps from current document file
        docx_data = get_docx_for_editing(document.file_path)
        gaps = docx_data.get("gaps", {})
        
        # Use structure from docx_data only if we don't have it from document endpoint
        if not document_structure:
            document_structure = docx_data.get("document_structure")
        else:
            # We have structure from document endpoint - validate and fix any incorrect table names
            # Compare with docx_data structure to catch any that might have been incorrectly extracted
            docx_tables = docx_data.get("document_structure", {}).get("tables", [])
            for idx, table in enumerate(document_structure.get("tables", [])):
                if idx < len(docx_tables):
                    docx_table = docx_tables[idx]
                    docx_name = docx_table.get("name", "")
                    current_name = table.get("name", "")
                    
                    # If current_name looks like a header but docx_name doesn't, or vice versa
                    # Prefer the name that doesn't look like a header
                    current_looks_like_header = any(pattern in current_name.lower() for pattern in ['_', '#', 'atn', 'ctg', 'bg']) or \
                                                (len(current_name) < 20 and ('_' in current_name or '#' in current_name))
                    docx_looks_like_header = any(pattern in docx_name.lower() for pattern in ['_', '#', 'atn', 'ctg', 'bg']) or \
                                             (len(docx_name) < 20 and ('_' in docx_name or '#' in docx_name))
                    
                    # If current looks like header but docx doesn't (and docx has valid name), prefer docx
                    # But if both look wrong, keep current
                    if current_looks_like_header and not docx_looks_like_header and docx_name:
                        document_structure["tables"][idx]["name"] = docx_name
                        print(f"Fixed table {idx} name from '{current_name}' to '{docx_name}'")
    except Exception as e:
        print(f"Warning: Could not extract gaps from document: {str(e)}")
    
    return {
        "id": submission.id,
        "document_id": submission.document_id,
        "status": submission.status,
        "submitted_at": submission.submitted_at,
        "document_xml": submission.document_xml,
        "normalized_json": json.loads(submission.normalized_json),
        "changes_summary": submission.changes_summary,
        "review_notes": submission.review_notes,
        "gaps": gaps,
        "document_structure": document_structure,
        "document_file_path": document.file_path,
        "document_original_filename": document.original_filename
    }

@app.post("/api/submissions/{submission_id}/review", response_model=schemas.SubmissionResponse)
def review_submission(
    submission_id: int,
    review: schemas.SubmissionReview,
    db: Session = Depends(database.get_db)
):
    """Review and approve/reject a submission"""
    try:
        submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        
        document = db.query(models.Document).filter(models.Document.id == submission.document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Store previous status for audit history
        previous_status = document.status
        
        submission.status = review.status
        submission.reviewed_by = review.reviewed_by
        submission.reviewed_at = datetime.utcnow()
        submission.review_notes = review.review_notes
        
        if review.status == "approved":
            # Update document status
            document.status = "approved"
            document.is_locked = True
            
            # Get the latest document content (with updated values) before approval
            docx_data = get_docx_for_editing(document.file_path)
            updated_structured_data = docx_data.get("structured_data", {})
            document_structure = docx_data.get("document_structure", {})
            
            # Use updated structured data if available, otherwise use submission data
            final_structured_data = updated_structured_data if updated_structured_data else json.loads(submission.normalized_json)
            
            # Include document_structure in the approved JSON for better data extraction
            if document_structure:
                final_structured_data["document_structure"] = document_structure
            
            # Check if an approved document already exists for this document_id
            existing_approved = db.query(models.ApprovedDocument).filter(
                models.ApprovedDocument.document_id == submission.document_id
            ).first()
            
            # Create section ID
            section_id = f"DOC-{submission.document_id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
            
            # Delete old files if they exist
            if existing_approved:
                # Delete old XML file
                if os.path.exists(existing_approved.xml_file_path):
                    try:
                        os.remove(existing_approved.xml_file_path)
                    except Exception as e:
                        print(f"Warning: Could not delete old XML file: {str(e)}")
                # Delete old JSON file
                if os.path.exists(existing_approved.json_file_path):
                    try:
                        os.remove(existing_approved.json_file_path)
                    except Exception as e:
                        print(f"Warning: Could not delete old JSON file: {str(e)}")
            
            # Save XML file (from submission)
            xml_file_path = APPROVED_DIR / f"{section_id}.xml"
            with open(xml_file_path, "w", encoding="utf-8") as f:
                f.write(submission.document_xml)
            
            # Save JSON file with updated values
            json_file_path = APPROVED_DIR / f"{section_id}.json"
            with open(json_file_path, "w", encoding="utf-8") as f:
                json.dump(final_structured_data, f, indent=2)
            
            # Update existing approved document or create new one
            current_version = 1
            if existing_approved:
                # Update existing approved document
                existing_approved.section_id = section_id
                existing_approved.version += 1
                current_version = existing_approved.version
                existing_approved.xml_file_path = str(xml_file_path)
                existing_approved.json_file_path = str(json_file_path)
                existing_approved.approved_by = review.reviewed_by
                existing_approved.approved_at = datetime.utcnow()
                existing_approved.approval_notes = review.review_notes
            else:
                # Create new approved document record in database
                approved_doc = models.ApprovedDocument(
                    document_id=submission.document_id,
                    section_id=section_id,
                    version=1,
                    xml_file_path=str(xml_file_path),
                    json_file_path=str(json_file_path),
                    approved_by=review.reviewed_by,
                    approval_notes=review.review_notes
                )
                db.add(approved_doc)
            
            # Create audit history entry for approval
            audit_entry = models.AuditHistory(
                document_id=submission.document_id,
                submission_id=submission_id,
                action="approved",
                performed_by=review.reviewed_by,
                performed_at=datetime.utcnow(),
                notes=review.review_notes,
                version=current_version,
                previous_status=previous_status,
                new_status="approved"
            )
            db.add(audit_entry)
        elif review.status == "rejected":
            # Unlock document for editing
            document.status = "draft"
            document.is_locked = False
            
            # Create audit history entry for rejection
            audit_entry = models.AuditHistory(
                document_id=submission.document_id,
                submission_id=submission_id,
                action="rejected",
                performed_by=review.reviewed_by,
                performed_at=datetime.utcnow(),
                notes=review.review_notes,
                previous_status=previous_status,
                new_status="draft"
            )
            db.add(audit_entry)
        
        db.commit()
        db.refresh(submission)
        
        return submission
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        error_detail = traceback.format_exc()
        print(f"Review error: {error_detail}")
        raise HTTPException(status_code=500, detail=f"Failed to review submission: {str(e)}")

# ==================== Approved Documents Endpoints ====================

@app.get("/api/approved", response_model=List[schemas.ApprovedDocumentResponse])
def list_approved_documents(db: Session = Depends(database.get_db)):
    """List all approved documents"""
    approved = db.query(models.ApprovedDocument).order_by(models.ApprovedDocument.approved_at.desc()).all()
    return approved

@app.get("/api/approved/{approved_id}/download")
def download_approved_xml(approved_id: int, db: Session = Depends(database.get_db)):
    """Download approved document as XML"""
    approved = db.query(models.ApprovedDocument).filter(models.ApprovedDocument.id == approved_id).first()
    if not approved:
        raise HTTPException(status_code=404, detail="Approved document not found")
    
    if not os.path.exists(approved.xml_file_path):
        raise HTTPException(status_code=404, detail="XML file not found")
    
    return FileResponse(
        approved.xml_file_path,
        media_type="application/xml",
        filename=f"{approved.section_id}.xml"
    )

@app.get("/api/approved/{approved_id}/xml")
def get_approved_xml(approved_id: int, db: Session = Depends(database.get_db)):
    """Get approved document XML content as text"""
    approved = db.query(models.ApprovedDocument).filter(models.ApprovedDocument.id == approved_id).first()
    if not approved:
        raise HTTPException(status_code=404, detail="Approved document not found")
    
    if not os.path.exists(approved.xml_file_path):
        raise HTTPException(status_code=404, detail="XML file not found")
    
    with open(approved.xml_file_path, "r", encoding="utf-8") as f:
        xml_content = f.read()
    
    return JSONResponse(content={
        "section_id": approved.section_id,
        "approved_at": approved.approved_at.isoformat(),
        "approved_by": approved.approved_by,
        "xml_content": xml_content
    })

@app.get("/api/approved/{approved_id}/json")
def get_approved_json(approved_id: int, db: Session = Depends(database.get_db)):
    """Get approved document as JSON (for reuse)"""
    approved = db.query(models.ApprovedDocument).filter(models.ApprovedDocument.id == approved_id).first()
    if not approved:
        raise HTTPException(status_code=404, detail="Approved document not found")
    
    if not os.path.exists(approved.json_file_path):
        raise HTTPException(status_code=404, detail="JSON file not found")
    
    with open(approved.json_file_path, "r", encoding="utf-8") as f:
        json_data = json.load(f)
    
    return JSONResponse(content={
        "section_id": approved.section_id,
        "approved_at": approved.approved_at.isoformat(),
        "approved_by": approved.approved_by,
        "data": json_data
    })

@app.get("/api/approved/{approved_id}/download-json")
def download_approved_json(approved_id: int, db: Session = Depends(database.get_db)):
    """Download approved document as JSON file"""
    approved = db.query(models.ApprovedDocument).filter(models.ApprovedDocument.id == approved_id).first()
    if not approved:
        raise HTTPException(status_code=404, detail="Approved document not found")
    
    if not os.path.exists(approved.json_file_path):
        raise HTTPException(status_code=404, detail="JSON file not found")
    
    return FileResponse(
        approved.json_file_path,
        media_type="application/json",
        filename=f"{approved.section_id}.json"
    )

@app.get("/api/documents/{document_id}/download-json")
def download_document_json(document_id: int, db: Session = Depends(database.get_db)):
    """Download document structured data as JSON"""
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get structured data
    docx_data = get_docx_for_editing(document.file_path)
    
    # Create temporary JSON file
    import tempfile
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
    json.dump(docx_data["structured_data"], temp_file, indent=2)
    temp_file.close()
    
    return FileResponse(
        temp_file.name,
        media_type="application/json",
        filename=f"document-{document_id}-data.json"
    )

# ==================== Audit History Endpoints ====================

@app.get("/api/documents/{document_id}/audit-history", response_model=List[schemas.AuditHistoryResponse])
def get_document_audit_history(document_id: int, db: Session = Depends(database.get_db)):
    """Get audit history for a document"""
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    audit_history = db.query(models.AuditHistory).filter(
        models.AuditHistory.document_id == document_id
    ).order_by(models.AuditHistory.performed_at.desc()).all()
    
    return audit_history

@app.get("/api/approved/{approved_id}/db-object")
def get_approved_db_object(approved_id: int, db: Session = Depends(database.get_db)):
    """Get the database object with actual document content updated values"""
    approved = db.query(models.ApprovedDocument).filter(models.ApprovedDocument.id == approved_id).first()
    if not approved:
        raise HTTPException(status_code=404, detail="Approved document not found")
    
    # Get related document info
    document = db.query(models.Document).filter(models.Document.id == approved.document_id).first()
    
    # Load the actual JSON data with updated values
    document_content = {}
    if os.path.exists(approved.json_file_path):
        with open(approved.json_file_path, "r", encoding="utf-8") as f:
            document_content = json.load(f)
    
    # Extract materials, equipment, and verification activities from approved document
    # The document_content from JSON file should contain structured_data
    structured_data = {}
    document_structure = None
    
    if isinstance(document_content, dict):
        # Check if document_content has structured_data key
        if "structured_data" in document_content:
            structured_data = document_content["structured_data"]
            document_structure = document_content.get("document_structure")
        # Or if document_content itself IS structured_data (materials, equipment keys)
        elif "materials" in document_content or "equipment" in document_content:
            structured_data = document_content
            document_structure = document_content.get("document_structure")
        else:
            structured_data = document_content
    
    # Also try to get document structure from original document if not in JSON
    if not document_structure and document and os.path.exists(document.file_path):
        try:
            docx_data = get_docx_for_editing(document.file_path)
            document_structure = docx_data.get("document_structure", {})
        except Exception as e:
            print(f"Warning: Could not load document structure: {str(e)}")
    
    # Format as a database object with actual content values
    db_object = {
        "table_name": "approved_documents",
        "approved_document": {
            "id": approved.id,
            "document_id": approved.document_id,
            "section_id": approved.section_id,
            "product_id": approved.product_id,
            "section_type": approved.section_type,
            "version": approved.version,
            "approved_by": approved.approved_by,
            "approved_at": approved.approved_at.isoformat() if approved.approved_at else None,
            "approval_notes": approved.approval_notes
        },
        "related_document": {
            "id": document.id if document else None,
            "filename": document.filename if document else None,
            "original_filename": document.original_filename if document else None,
            "status": document.status if document else None,
            "uploaded_at": document.uploaded_at.isoformat() if document and document.uploaded_at else None
        },
        "document_content": {
            "materials": structured_data.get("materials", []),
            "equipment": structured_data.get("equipment", []),
            "verification_activities": structured_data.get("verification_activities", []),
            "methods": structured_data.get("methods", []),
            "metadata": structured_data.get("metadata", {}),
            "document_structure": document_structure,
            "full_data": structured_data  # Keep full data for reference
        }
    }
    
    return db_object

# ==================== Chatbot Endpoints ====================

@app.post("/api/chat/message")
def send_chat_message(message_data: schemas.ChatMessageRequest):
    """Handle general chat messages with hardcoded responses"""
    message = message_data.message
    document_id = message_data.document_id
    
    # Hardcoded sample responses based on keywords
    lower_message = message.lower()
    
    if "hello" in lower_message or "hi" in lower_message:
        return {
            "response": "👋 Hello! I'm DocuFix AI. I can help you with:\n• Detecting and fixing gaps\n• Editing documents via natural language\n• Managing workflow transitions\n• Summarizing audit trails\n• Exporting approved data\n\nHow can I help you today?",
            "message": "Chat message processed"
        }
    elif "help" in lower_message:
        return {
            "response": "I can help you with:\n\n1. **Gap Detection**: Ask me to 'detect gaps' or 'show gaps'\n2. **Suggest Fixes**: Say 'suggest fixes' or 'fill gaps'\n3. **Edit Document**: Try 'Fill in missing supplier codes' or 'Update section 2'\n4. **Workflow**: Use 'Submit for review' or 'Check status'\n5. **Audit Summary**: Ask 'Show audit summary' or 'What changed?'\n6. **Export Data**: Request 'Export approved data' or 'Generate JSON'\n\nWhat would you like to do?",
            "message": "Help information provided"
        }
    else:
        return {
            "response": "I understand. You said: '" + message + "'\n\nTry asking me to:\n• Detect gaps\n• Suggest fixes\n• Edit your document\n• Submit for review\n• Show audit summary\n• Export approved data\n\nHow can I help?",
            "message": "General response"
        }

@app.get("/api/chat/{document_id}/gap-suggestions")
def get_gap_suggestions(document_id: int, db: Session = Depends(database.get_db)):
    """Get gap suggestions with hardcoded sample values"""
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Hardcoded sample suggestions
    return {
        "materials": [
            {
                "name": "Syringe Barrel",
                "section": "Section 2",
                "suggested_catalog_number": "SUP-4589",
                "source": "Last approved version"
            },
            {
                "name": "Stopper",
                "section": "Section 3",
                "suggested_catalog_number": "SUP-4621",
                "source": "Approved vendor database"
            }
        ],
        "equipment": [
            {
                "name": "Filling Machine",
                "section": "Section 4",
                "suggested_configuration": "Model XYZ-2024, Serial: FM-12345",
                "source": "Equipment registry"
            }
        ],
        "table_cells": [
            {
                "table_name": "Verification Results",
                "row": 5,
                "column": 3,
                "suggested_value": "Jane Doe",
                "field_name": "Reviewer Field",
                "source": "Last approved version"
            }
        ]
    }

@app.post("/api/chat/{document_id}/edit")
def execute_edit_command(document_id: int, edit_data: schemas.EditCommandRequest, db: Session = Depends(database.get_db)):
    """Execute edit command with hardcoded responses"""
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    command = edit_data.command.lower()
    
    # Hardcoded sample edit responses
    if "supplier" in command or "catalog" in command or "code" in command:
        return {
            "message": "✅ Done. I've inserted Supplier Code 'SUP-4589' in Section 2 based on the last approved version.",
            "changes": [
                "Supplier Code 'SUP-4589' added to Section 2",
                "Material 'Syringe Barrel' updated with catalog number"
            ],
            "status": "success"
        }
    elif "date" in command or "format" in command:
        return {
            "message": "✅ Done. I've corrected the date format in Section 3 to 'YYYY-MM-DD'.",
            "changes": [
                "Date format corrected in Section 3",
                "Invalid date values updated"
            ],
            "status": "success"
        }
    elif "reviewer" in command or "empty" in command:
        return {
            "message": "✅ Done. I've filled the empty Reviewer Field in Section 5 with 'Jane Doe' from the last approved version.",
            "changes": [
                "Reviewer field filled in Section 5",
                "Empty field populated with 'Jane Doe'"
            ],
            "status": "success"
        }
    else:
        return {
            "message": "✅ Edit completed successfully. Changes have been applied to your document.",
            "changes": [
                "Document updated based on your request"
            ],
            "status": "success"
        }

@app.post("/api/chat/{document_id}/workflow")
def submit_via_chat(document_id: int, workflow_data: schemas.WorkflowCommandRequest, db: Session = Depends(database.get_db)):
    """Handle workflow commands via chatbot with hardcoded responses"""
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    command = workflow_data.command.lower()
    
    # Hardcoded sample workflow responses
    if "submit" in command or "review" in command:
        # Actually create a submission if document is ready
        try:
            if not document.is_locked:
                # Lock document first
                document.is_locked = True
                document.status = "submitted"
                db.commit()
        except:
            pass  # Don't fail if already locked
        
        return {
            "message": "✅ Document locked. Routing to Compliance Reviewer (Jane Doe).\nExpected review completion: 2 business days.",
            "status": "submitted",
            "reviewer": "Jane Doe",
            "expected_completion": "2 business days",
            "action": "submitted"
        }
    elif "status" in command or "check" in command:
        return {
            "message": f"📊 Current Document Status:\n• Status: {document.status}\n• Locked: {'Yes' if document.is_locked else 'No'}\n• Last Updated: {document.updated_at.strftime('%Y-%m-%d %H:%M:%S') if document.updated_at else 'N/A'}",
            "status": document.status,
            "is_locked": document.is_locked
        }
    elif "approve" in command:
        return {
            "message": "⚠️ Document must be submitted for review before approval. Would you like me to submit it now?",
            "status": document.status,
            "action": "pending_submission"
        }
    else:
        return {
            "message": "I can help you with workflow actions:\n• Submit document for review\n• Check document status\n• Route to reviewer\n\nWhat would you like to do?",
            "status": document.status
        }

@app.get("/api/chat/{document_id}/audit-summary")
def get_audit_summary(document_id: int, db: Session = Depends(database.get_db)):
    """Get audit summary with hardcoded sample values"""
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Try to get real audit history
    audit_history = db.query(models.AuditHistory).filter(
        models.AuditHistory.document_id == document_id
    ).order_by(models.AuditHistory.performed_at.desc()).limit(5).all()
    
    # Hardcoded sample summary with some real data
    gaps_filled = 3
    rejections = 1 if document.status == "draft" else 0
    
    recent_changes = []
    for audit in audit_history[:3]:
        recent_changes.append(f"{audit.action} by {audit.performed_by or 'System'} on {audit.performed_at.strftime('%Y-%m-%d')}")
    
    # Add hardcoded sample changes if not enough real ones
    if len(recent_changes) < 3:
        recent_changes.extend([
            "3 gaps filled (Supplier Code, Date, Reviewer)",
            "1 rejection (Reviewer field corrected by Compliance)",
            f"Document now in '{document.status}' state"
        ])
    
    return {
        "gaps_filled": gaps_filled,
        "rejections": rejections,
        "current_status": document.status,
        "recent_changes": recent_changes[:5],
        "summary": f"Summary of recent activity:\n• {gaps_filled} gaps filled (Supplier Code, Date, Reviewer)\n• {rejections} rejection{'s' if rejections != 1 else ''} (Reviewer field corrected by Compliance)\n• Document now in '{document.status}' state"
    }

@app.get("/api/chat/{document_id}/export-data")
def export_approved_data(document_id: int, db: Session = Depends(database.get_db)):
    """Export approved data with hardcoded sample values"""
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Hardcoded sample export data
    export_data = {
        "section_id": f"DOC-{document_id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "supplier_records": [
            {
                "supplier_code": "SUP-4589",
                "name": "Syringe Barrel",
                "vendor": "ABC Medical Supplies",
                "approved_date": "2024-01-15"
            },
            {
                "supplier_code": "SUP-4621",
                "name": "Stopper",
                "vendor": "XYZ Components Inc",
                "approved_date": "2024-01-20"
            },
            {
                "supplier_code": "SUP-4712",
                "name": "Plunger Rod",
                "vendor": "ABC Medical Supplies",
                "approved_date": "2024-02-01"
            }
        ],
        "linked_documents": [
            {
                "document_id": document_id - 1 if document_id > 1 else 1,
                "section": "Section 2",
                "relationship": "Previous approved version"
            },
            {
                "document_id": document_id - 2 if document_id > 2 else 2,
                "section": "Section 3",
                "relationship": "Related compliance document"
            },
            {
                "document_id": document_id - 3 if document_id > 3 else 3,
                "section": "Section 5",
                "relationship": "Quality control reference"
            }
        ],
        "exported_at": datetime.utcnow().isoformat(),
        "total_records": 12
    }
    
    return {
        "message": "✅ JSON file generated with 12 supplier records.\nLinked to 3 related compliance documents.",
        "data": export_data,
        "download_url": f"/api/chat/{document_id}/export-data/download"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

