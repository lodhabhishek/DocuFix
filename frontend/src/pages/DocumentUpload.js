import React, { useState } from 'react';
import { uploadDocument, listDocuments, deleteDocument } from '../services/api';
import './DocumentUpload.css';

const DocumentUpload = ({ onDocumentSelect }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [documents, setDocuments] = useState([]);

  React.useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await listDocuments();
      setDocuments(response.data);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const isValidType = selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                          selectedFile.name.toLowerCase().endsWith('.docx') ||
                          selectedFile.type === 'application/octet-stream'; // Some browsers don't set MIME type correctly
      
      if (isValidType) {
        setFile(selectedFile);
        setMessage(null);
        console.log('File selected:', selectedFile.name, 'Size:', selectedFile.size, 'Type:', selectedFile.type);
      } else {
        setMessage('❌ Please upload a .docx file. Selected file type: ' + (selectedFile.type || 'unknown'));
        setFile(null);
      }
    } else {
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('⚠️ Please select a file to upload');
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log('Uploading file:', file.name, 'Size:', file.size);
      
      const response = await uploadDocument(formData);
      console.log('Upload response:', response.data);
      
      setMessage(`✅ ${response.data.message}`);
      
      // Reload documents list
      await loadDocuments();
      
      // Auto-select the uploaded document
      if (onDocumentSelect && response.data.document_id) {
        onDocumentSelect(response.data.document_id);
      }
      
      // Reset file input
      setFile(null);
      const fileInput = document.getElementById('file-input');
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown error occurred';
      setMessage(`❌ Upload failed: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentClick = (doc) => {
    if (onDocumentSelect) {
      onDocumentSelect(doc.id);
    }
  };

  const handleDeleteDocument = async (doc, e) => {
    e.stopPropagation(); // Prevent triggering document selection
    
    const confirmDelete = window.confirm(
      `⚠️ Delete Document?\n\n` +
      `Are you sure you want to delete "${doc.original_filename}"?\n\n` +
      `This action cannot be undone.`
    );
    
    if (!confirmDelete) return;
    
    // Additional check for documents in review/approved status
    if (doc.status === 'submitted' || doc.status === 'under_review' || doc.status === 'approved') {
      const forceDelete = window.confirm(
        `⚠️ Document is in "${doc.status}" status.\n\n` +
        `Deleting this document will also remove all associated submissions and approvals.\n\n` +
        `Continue with deletion?`
      );
      if (!forceDelete) return;
    }
    
    try {
      await deleteDocument(doc.id);
      setMessage(`✅ Document "${doc.original_filename}" deleted successfully`);
      await loadDocuments();
      
      // Clear selection if deleted document was selected
      if (onDocumentSelect) {
        onDocumentSelect(null);
      }
    } catch (error) {
      setMessage(`❌ Delete failed: ${error.response?.data?.detail || error.message}`);
    }
  };

  return (
    <div className="document-upload">
      <div className="widgets-container">
        {/* Upload Widget */}
        <div className="upload-widget widget">
          <div className="widget-header">
            <h3 className="widget-title">📤 Upload Document</h3>
          </div>
          <div className="widget-content">
            <div className="upload-box">
              <input
                id="file-input"
                type="file"
                accept=".docx"
                onChange={handleFileChange}
                disabled={uploading}
                className="file-input-compact"
              />
              <button 
                onClick={handleUpload} 
                disabled={!file || uploading}
                className="upload-button-compact"
              >
                {uploading ? '⏳ Uploading...' : 'Upload'}
              </button>
            </div>
            
            {message && (
              <div className={`message-compact ${message.includes('✅') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}
            
            {file && (
              <div className="file-selected">
                <span className="file-name">📄 {file.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Documents List Widget */}
        <div className="documents-widget widget">
          <div className="widget-header">
            <h3 className="widget-title">📋 Documents ({documents.length})</h3>
          </div>
          <div className="widget-content">
            {documents.length === 0 ? (
              <p className="no-documents-compact">No documents uploaded yet</p>
            ) : (
              <div className="documents-list-compact">
                {documents.map(doc => (
                  <div 
                    key={doc.id} 
                    className="document-item-compact"
                    onClick={() => handleDocumentClick(doc)}
                  >
                    <div className="doc-item-icon">📄</div>
                    <div className="doc-item-info">
                      <div className="doc-item-name">{doc.original_filename}</div>
                      <div className="doc-item-meta">
                        <span className={`status-badge-compact ${doc.status}`}>{doc.status}</span>
                        <span className="doc-item-lock">{doc.is_locked ? '🔒' : '🔓'}</span>
                        <span className="doc-item-date">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      className="delete-doc-button"
                      onClick={(e) => handleDeleteDocument(doc, e)}
                      title="Delete document"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload;

