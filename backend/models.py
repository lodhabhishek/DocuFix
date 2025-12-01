from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Document(Base):
    """Document model - stores uploaded documents"""
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, default="docx")
    status = Column(String, default="draft")  # draft, locked, submitted, under_review, approved
    is_locked = Column(Boolean, default=True)
    uploaded_by = Column(String, default="user")
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    submissions = relationship("Submission", back_populates="document", cascade="all, delete-orphan")
    approved_version = relationship("ApprovedDocument", back_populates="document", uselist=False)
    audit_history = relationship("AuditHistory", back_populates="document", cascade="all, delete-orphan")

class Submission(Base):
    """Submission model - stores document submissions for review"""
    __tablename__ = "submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    status = Column(String, default="submitted")  # submitted, under_review, approved, rejected
    submitted_by = Column(String, default="user")
    submitted_at = Column(DateTime, default=datetime.utcnow)
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_notes = Column(Text, nullable=True)
    
    # Document content at submission time
    document_xml = Column(Text, nullable=False)
    normalized_json = Column(Text, nullable=False)  # JSON string of normalized data
    changes_summary = Column(Text, nullable=True)  # Summary of changes made
    
    # Relationships
    document = relationship("Document", back_populates="submissions")

class ApprovedDocument(Base):
    """Approved document model - stores approved documents for reuse"""
    __tablename__ = "approved_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, unique=True)
    section_id = Column(String, nullable=False, unique=True)  # Unique identifier for reuse
    product_id = Column(String, nullable=True)
    section_type = Column(String, nullable=True)
    version = Column(Integer, default=1)
    
    # Storage paths
    xml_file_path = Column(String, nullable=False)  # Path to XML file
    json_file_path = Column(String, nullable=False)  # Path to JSON file
    
    # Approval metadata
    approved_by = Column(String, nullable=False)
    approved_at = Column(DateTime, default=datetime.utcnow)
    approval_notes = Column(Text, nullable=True)
    
    # Relationships
    document = relationship("Document", back_populates="approved_version")

class AuditHistory(Base):
    """Audit history model - tracks document approval/review cycles"""
    __tablename__ = "audit_history"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=True)
    action = Column(String, nullable=False)  # submitted, under_review, approved, rejected, updated
    performed_by = Column(String, nullable=False)
    performed_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)
    version = Column(Integer, nullable=True)  # Version number when approved/updated
    previous_status = Column(String, nullable=True)  # Previous status before action
    new_status = Column(String, nullable=True)  # New status after action
    
    # Relationships
    document = relationship("Document", back_populates="audit_history")
    submission = relationship("Submission")

