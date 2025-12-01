import React, { useState, useEffect } from 'react';
import { 
  getDocumentContent, 
  lockDocument, 
  unlockDocument, 
  updateDocumentContent,
  createSubmission,
  resetDocument
} from '../services/api';
import DocumentViewer from '../components/DocumentViewer';
import GapsPanel from '../components/GapsPanel';
import DocuFixChatbot from '../components/DocuFixChatbot';
import WarningDialog from '../components/WarningDialog';
import './DocumentEditor.css';

const DocumentEditor = ({ documentId }) => {
  const [document, setDocument] = useState(null);
  const [documentStructure, setDocumentStructure] = useState(null);
  const [structuredData, setStructuredData] = useState(null);
  const [gaps, setGaps] = useState(null);
  const [isLocked, setIsLocked] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [showCheckoutWarning, setShowCheckoutWarning] = useState(false);
  const [showForceCheckoutWarning, setShowForceCheckoutWarning] = useState(false);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  useEffect(() => {
    if (documentId) {
      loadDocument();
    }
  }, [documentId]);

  const loadDocument = async () => {
    if (!documentId) return;
    
    setLoading(true);
    try {
      const response = await getDocumentContent(documentId);
      const data = response.data;
      
      setDocument(data);
      setDocumentStructure(data.document_structure || null); // Tables and structure
      setStructuredData(data.structured_data);
      setGaps(data.gaps);
      setIsLocked(data.is_locked);
    } catch (error) {
      setMessage(`❌ Error loading document: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLockToggle = async () => {
    if (isLocked) {
      // Check Out (Unlock) - Show warning dialog
      setShowCheckoutWarning(true);
    } else {
      // Check In (Lock)
      try {
        await lockDocument(documentId);
        setIsLocked(true);
        setMessage('✅ Document checked in. Content is now protected.');
      } catch (error) {
        setMessage(`❌ Error checking in: ${error.response?.data?.detail || error.message}`);
      }
    }
  };

  const handleCheckoutConfirm = async () => {
    setShowCheckoutWarning(false);
    
    try {
      await unlockDocument(documentId);
      setIsLocked(false);
      setMessage('✅ Document checked out. You can now edit the content.');
      await loadDocument(); // Reload to get updated status
    } catch (error) {
      const errorDetail = error.response?.data?.detail || error.message;
      // If check out failed due to status, offer force check out
      if (errorDetail.includes('Cannot unlock document') && errorDetail.includes('status')) {
        setCheckoutError(errorDetail);
        setShowForceCheckoutWarning(true);
      } else {
        setMessage(`❌ Error checking out: ${errorDetail}`);
      }
    }
  };

  const handleForceCheckoutConfirm = async () => {
    setShowForceCheckoutWarning(false);
    
    try {
      await unlockDocument(documentId, true); // Force check out
      setIsLocked(false);
      setMessage('✅ Document force checked out. Status reset to draft.');
      await loadDocument();
      setCheckoutError(null);
    } catch (forceError) {
      setMessage(`❌ Error force checking out: ${forceError.response?.data?.detail || forceError.message}`);
      setCheckoutError(null);
    }
  };

  // Content update is now handled by DocumentViewer component

  const handleSubmit = async () => {
    if (!structuredData) {
      setMessage('⚠️ Please save changes first to generate structured data.');
      return;
    }
    setShowSubmissionForm(true);
  };

  const confirmSubmission = async () => {
    if (!submissionNotes.trim()) {
      setMessage('⚠️ Please add submission notes.');
      return;
    }
    try {
      const submissionPayload = {
        document_id: documentId,
        submission_notes: submissionNotes,
      };
      await createSubmission(submissionPayload);
      setMessage('✅ Document submitted for review!');
      setShowSubmissionForm(false);
      setSubmissionNotes('');
      await loadDocument(); // Reload to update status and lock state
    } catch (error) {
      setMessage(`❌ Submission failed: ${error.response?.data?.detail || error.message}`);
    }
  };

  if (!documentId) {
    return (
      <div className="document-editor">
        <div className="no-document">
          <p>📄 Please select or upload a document to start editing</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="document-editor">
        <div className="loading">⏳ Loading document...</div>
      </div>
    );
  }

  return (
    <div className="document-editor">
      <div className="editor-header">
        <h2>📝 Document Editor</h2>
        <div className="lock-controls">
          <span className={`lock-status ${isLocked ? 'locked' : 'unlocked'}`}>
            {isLocked ? '🔒 CHECKED IN' : '🔓 CHECKED OUT'}
          </span>
          <button 
            onClick={handleLockToggle}
            className={`lock-button ${isLocked ? 'unlock' : 'lock'}`}
          >
            {isLocked ? '🔓 Check Out Document' : '🔒 Check In Document'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : message.includes('⚠️') ? 'warning' : 'error'}`}>
          {message}
        </div>
      )}

      {document?.status === 'submitted' || document?.status === 'under_review' || document?.status === 'approved' ? (
        <div className="status-warning">
          <h3>⚠️ Document Status: {document.status}</h3>
          <p>This document is currently {document.status} and cannot be edited.</p>
          {document.status === 'approved' && (
            <p>✅ This document has been approved and is available for download.</p>
          )}
          <div className="reset-action" style={{ marginTop: '1rem' }}>
            <button 
              onClick={() => setShowResetWarning(true)}
              className="reset-button"
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🔄 Reset to Draft & Check Out
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Data Quality Summary - Sleek Panel at Top */}
          {gaps && (
            <GapsPanel gaps={gaps} />
          )}

          {/* Word Document Viewer - Main Editor */}
          <DocumentViewer 
            key={`viewer-${documentId}-${document?.updated_at || ''}`}
            documentId={documentId} 
            filePath={document?.file_path}
            isLocked={isLocked}
            originalStructure={documentStructure}
            gaps={gaps}
            onSave={async () => {
              setMessage('✅ Document saved successfully!');
              // Reload document to get updated structure and gaps
              await loadDocument();
            }}
            onContentChange={(content) => {
              // Track content changes if needed
            }}
          />

          {/* Submit for Approval */}
          <div className="editor-actions">
            <button 
              onClick={handleSubmit} 
              className="submit-button" 
              disabled={
                isLocked || 
                !structuredData || 
                (document?.status && ['submitted', 'under_review', 'approved'].includes(document.status))
              }
              title={
                isLocked 
                  ? 'Please check out the document first to enable submission' 
                  : !structuredData 
                    ? 'Please save changes first to generate structured data'
                    : document?.status && ['submitted', 'under_review', 'approved'].includes(document.status)
                      ? `Document is in ${document.status} status and cannot be submitted`
                      : 'Submit document for review and approval'
              }
            >
              🚀 Submit for Approval
            </button>
          </div>

          {showSubmissionForm && (
            <div className="submission-form">
              <h3>Add Submission Notes</h3>
              <textarea
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                placeholder="Enter notes for the reviewer..."
                rows="4"
              />
              <div className="submission-form-actions">
                <button onClick={confirmSubmission} className="confirm-submit-button">
                  ✅ Confirm Submission
                </button>
                <button onClick={() => setShowSubmissionForm(false)} className="cancel-button">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* DocuFix AI Chatbot - Docked on Right Side */}
      <DocuFixChatbot 
        documentId={documentId}
        currentGaps={gaps}
        onGapHighlight={(gap) => {
          // Handle gap highlighting if needed
          console.log('Gap highlighted:', gap);
        }}
        onEditConfirm={(result) => {
          // Reload document after edit
          if (documentId) {
            loadDocument();
            setMessage('✅ Document updated via AI assistant!');
          }
        }}
        onWorkflowUpdate={(result) => {
          // Reload document after workflow update
          if (documentId) {
            loadDocument();
            setMessage('✅ Workflow action completed via AI assistant!');
          }
        }}
      />

      {/* Checkout Warning Dialog */}
      <WarningDialog
        isOpen={showCheckoutWarning}
        onClose={() => setShowCheckoutWarning(false)}
        onConfirm={handleCheckoutConfirm}
        title="⚠️ Check Out Document"
        message={`This will check out the document and allow direct editing.\n\n• Document will be checked out to you\n• You can now edit the content\n• Check in when done editing\n\nContinue with check out?`}
        confirmText="Check Out"
        cancelText="Cancel"
        type="warning"
      />

      {/* Force Checkout Warning Dialog */}
      <WarningDialog
        isOpen={showForceCheckoutWarning}
        onClose={() => {
          setShowForceCheckoutWarning(false);
          setCheckoutError(null);
        }}
        onConfirm={handleForceCheckoutConfirm}
        title="⚠️ Force Check Out Document"
        message={`Document is in ${document?.status || 'restricted'} status.\n\nChecking out will reset the document to draft status.\n\nContinue with force check out?`}
        confirmText="Force Check Out"
        cancelText="Cancel"
        type="warning"
      />

      {/* Reset to Draft Warning Dialog */}
      <WarningDialog
        isOpen={showResetWarning}
        onClose={() => setShowResetWarning(false)}
        onConfirm={async () => {
          setShowResetWarning(false);
          try {
            await resetDocument(documentId);
            setMessage('✅ Document reset to draft and checked out.');
            await loadDocument();
          } catch (error) {
            setMessage(`❌ Error resetting: ${error.response?.data?.detail || error.message}`);
          }
        }}
        title="⚠️ Reset Document to Draft"
        message="This will check out the document and reset its status to draft, allowing editing.\n\nContinue?"
        confirmText="Reset & Check Out"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
};

export default DocumentEditor;

