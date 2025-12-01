import React, { useState, useEffect } from 'react';
import { listSubmissions, getSubmissionDetails, reviewSubmission } from '../services/api';
import DocumentViewer from '../components/DocumentViewer';
import DocuFixChatbot from '../components/DocuFixChatbot';
import './ReviewPage.css';

const ReviewPage = () => {
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [submissionDetails, setSubmissionDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const response = await listSubmissions();
      setSubmissions(response.data);
    } catch (error) {
      setMessage(`❌ Error loading submissions: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmissionClick = async (submissionId) => {
    try {
      const response = await getSubmissionDetails(submissionId);
      setSubmissionDetails(response.data);
      setSelectedSubmission(submissionId);
    } catch (error) {
      setMessage(`❌ Error loading submission details: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleReview = async (status) => {
    if (!selectedSubmission) return;

    try {
      await reviewSubmission(selectedSubmission, {
        status,
        review_notes: reviewNotes,
        reviewed_by: 'Reviewer'
      });

      setMessage(`✅ Submission ${status} successfully!`);
      setReviewNotes('');
      setSelectedSubmission(null);
      setSubmissionDetails(null);
      
      // Reload submissions
      await loadSubmissions();
    } catch (error) {
      setMessage(`❌ Error reviewing: ${error.response?.data?.detail || error.message}`);
    }
  };

  const filteredSubmissions = submissions.filter(s => 
    s.status === 'submitted' || s.status === 'under_review'
  );

  return (
    <div className="review-page">
      <h2>🔍 Review & Approval</h2>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="review-layout">
        <div className="submissions-list">
          <h3>Pending Submissions</h3>
          {loading ? (
            <div className="loading">⏳ Loading...</div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="no-submissions">
              <p>No pending submissions</p>
            </div>
          ) : (
            <div className="submissions-grid">
              {filteredSubmissions.map(submission => (
                <div
                  key={submission.id}
                  className={`submission-card ${selectedSubmission === submission.id ? 'selected' : ''}`}
                  onClick={() => handleSubmissionClick(submission.id)}
                >
                  <div className="submission-header">
                    <span className="submission-id">#{submission.id}</span>
                    <span className={`status-badge ${submission.status}`}>
                      {submission.status}
                    </span>
                  </div>
                  <p className="submission-info">
                    Document ID: {submission.document_id}
                  </p>
                  <p className="submission-date">
                    Submitted: {new Date(submission.submitted_at).toLocaleString()}
                  </p>
                  {submission.changes_summary && (
                    <p className="submission-summary">
                      {submission.changes_summary.substring(0, 100)}...
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="review-panel">
          {selectedSubmission && submissionDetails ? (
            <div className="review-content">
              <h3>Review Submission #{selectedSubmission}</h3>
              
              <div className="submission-info">
                <p><strong>Document ID:</strong> {submissionDetails.document_id}</p>
                <p><strong>Status:</strong> {submissionDetails.status}</p>
                <p><strong>Submitted:</strong> {new Date(submissionDetails.submitted_at).toLocaleString()}</p>
                {submissionDetails.document_original_filename && (
                  <p><strong>Document:</strong> {submissionDetails.document_original_filename}</p>
                )}
              </div>

              {/* Changes Summary Section */}
              {submissionDetails.changes_summary && (
                <div className="changes-summary-section">
                  <h4>📋 Changes Summary</h4>
                  <div className="changes-summary-content">
                    <p>{submissionDetails.changes_summary}</p>
                  </div>
                </div>
              )}

              {/* Gaps Summary */}
              {submissionDetails.gaps && submissionDetails.gaps.total_gaps !== undefined && (
                <div className="gaps-summary-section">
                  <h4>⚠️ Data Quality Gaps</h4>
                  <div className="gaps-summary-content">
                    <p className="gaps-total">
                      <strong>Total Gaps:</strong> {submissionDetails.gaps.total_gaps || 0}
                    </p>
                    <div className="gaps-breakdown">
                      {submissionDetails.gaps.materials && submissionDetails.gaps.materials.length > 0 && (
                        <div className="gap-item">
                          <span className="gap-count">{submissionDetails.gaps.materials.length}</span>
                          <span className="gap-label">Materials missing catalog numbers</span>
                        </div>
                      )}
                      {submissionDetails.gaps.equipment && submissionDetails.gaps.equipment.length > 0 && (
                        <div className="gap-item">
                          <span className="gap-count">{submissionDetails.gaps.equipment.length}</span>
                          <span className="gap-label">Equipment with invalid configurations</span>
                        </div>
                      )}
                      {submissionDetails.gaps.table_cells && submissionDetails.gaps.table_cells.length > 0 && (
                        <div className="gap-item">
                          <span className="gap-count">{submissionDetails.gaps.table_cells.length}</span>
                          <span className="gap-label">Table cells with pending/missing values</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Document Viewer */}
              {submissionDetails.document_file_path && (
                <div className="document-viewer-section">
                  <h4>📄 Document Preview</h4>
                  <DocumentViewer 
                    documentId={submissionDetails.document_id}
                    filePath={submissionDetails.document_file_path}
                    isLocked={true}
                    originalStructure={submissionDetails.document_structure}
                  />
                </div>
              )}

              {/* Review Form */}
              <div className="review-form">
                <h4>Review Notes</h4>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Enter review notes..."
                  rows="4"
                />
                <div className="review-actions">
                  <button
                    onClick={() => handleReview('approved')}
                    className="approve-button"
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => handleReview('rejected')}
                    className="reject-button"
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-selection">
              <p>Select a submission to review</p>
            </div>
          )}
        </div>
      </div>
      
      {/* DocuFix AI Chatbot - Docked on Right Side */}
      <DocuFixChatbot 
        documentId={selectedSubmission}
        currentGaps={submissionDetails?.gaps}
        onGapHighlight={(gap) => {
          // Handle gap highlighting if needed
          console.log('Gap highlighted:', gap);
        }}
        onEditConfirm={(result) => {
          // Reload submission details after edit
          if (selectedSubmission) {
            handleSubmissionClick(selectedSubmission);
          }
        }}
        onWorkflowUpdate={(result) => {
          // Reload submissions after workflow update
          loadSubmissions();
          if (selectedSubmission) {
            handleSubmissionClick(selectedSubmission);
          }
        }}
      />
    </div>
  );
};

export default ReviewPage;

