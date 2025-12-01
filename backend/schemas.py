from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

# Document schemas
class DocumentBase(BaseModel):
    filename: str
    original_filename: str

class DocumentCreate(DocumentBase):
    pass

class DocumentResponse(DocumentBase):
    id: int
    file_type: str
    status: str
    is_locked: bool
    uploaded_by: str
    uploaded_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class DocumentUpdate(BaseModel):
    content: Optional[str] = None
    is_locked: Optional[bool] = None

# Submission schemas
class SubmissionCreate(BaseModel):
    document_id: int
    submission_notes: Optional[str] = None
    document_xml: Optional[str] = None  # Will be generated from document if not provided
    normalized_json: Optional[Dict[str, Any]] = None  # Will be extracted from document if not provided
    changes_summary: Optional[str] = None  # Can use submission_notes if not provided

class SubmissionResponse(BaseModel):
    id: int
    document_id: int
    status: str
    submitted_by: str
    submitted_at: datetime
    reviewed_by: Optional[str]
    reviewed_at: Optional[datetime]
    review_notes: Optional[str]
    changes_summary: Optional[str]
    
    class Config:
        from_attributes = True

class SubmissionReview(BaseModel):
    status: str  # approved, rejected
    review_notes: Optional[str] = None
    reviewed_by: str = "reviewer"

# Approved document schemas
class ApprovedDocumentResponse(BaseModel):
    id: int
    document_id: int
    section_id: str
    product_id: Optional[str]
    section_type: Optional[str]
    version: int
    approved_by: str
    approved_at: datetime
    approval_notes: Optional[str]
    
    class Config:
        from_attributes = True

# File upload response
class FileUploadResponse(BaseModel):
    document_id: int
    filename: str
    message: str
    status: str

# Audit history schemas
class AuditHistoryResponse(BaseModel):
    id: int
    document_id: int
    submission_id: Optional[int]
    action: str
    performed_by: str
    performed_at: datetime
    notes: Optional[str]
    version: Optional[int]
    previous_status: Optional[str]
    new_status: Optional[str]
    
    class Config:
        from_attributes = True

# Chat schemas
class ChatMessageRequest(BaseModel):
    message: str
    document_id: Optional[int] = None

class EditCommandRequest(BaseModel):
    command: str

class WorkflowCommandRequest(BaseModel):
    command: str

