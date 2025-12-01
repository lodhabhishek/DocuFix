import axios from 'axios';

// Use environment variable if available, otherwise default to localhost
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Document endpoints
export const uploadDocument = (formData) => {
  console.log('Uploading document with FormData');
  return api.post('/api/documents/upload', formData, {
    headers: { 
      'Content-Type': 'multipart/form-data'
    },
    timeout: 60000 // 60 second timeout for large files
  });
};

export const listDocuments = (status) => 
  api.get('/api/documents', { params: { status } });

export const getDocument = (id) => 
  api.get(`/api/documents/${id}`);

export const getDocumentContent = (id) => 
  api.get(`/api/documents/${id}/content`);

export const lockDocument = (id) => 
  api.post(`/api/documents/${id}/lock`);

export const unlockDocument = (id, force = false) => 
  api.post(`/api/documents/${id}/unlock?force=${force}`);

export const resetDocument = (id) => 
  api.post(`/api/documents/${id}/reset`);

export const deleteDocument = (id) => 
  api.delete(`/api/documents/${id}`);

export const updateDocumentContent = (id, content, structure = null) => {
  const formData = new FormData();
  if (structure) {
    formData.append('structure', JSON.stringify(structure));
  } else {
    formData.append('content', content);
  }
  return api.put(`/api/documents/${id}/update`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// Submission endpoints
export const createSubmission = (submission) => 
  api.post('/api/submissions/create', submission);

export const listSubmissions = (status) => 
  api.get('/api/submissions', { params: { status } });

export const getSubmission = (id) => 
  api.get(`/api/submissions/${id}`);

export const getSubmissionDetails = (id) => 
  api.get(`/api/submissions/${id}/details`);

export const reviewSubmission = (id, review) => 
  api.post(`/api/submissions/${id}/review`, review);

// Approved documents endpoints
export const listApprovedDocuments = () => 
  api.get('/api/approved');

export const downloadApprovedXML = (id) => 
  api.get(`/api/approved/${id}/download`, { responseType: 'blob' });

export const getApprovedXML = (id) => 
  api.get(`/api/approved/${id}/xml`);

export const getApprovedJSON = (id) => 
  api.get(`/api/approved/${id}/json`);

export const getApprovedDBObject = (id) => 
  api.get(`/api/approved/${id}/db-object`);

export const getDocumentAuditHistory = (documentId) => 
  api.get(`/api/documents/${documentId}/audit-history`);

// Chatbot endpoints
export const sendChatMessage = (messageData) => {
  // Support both old format (message, documentId) and new format (object)
  if (typeof messageData === 'string') {
    return api.post('/api/chat/message', { message: messageData, document_id: null });
  }
  return api.post('/api/chat/message', messageData);
};

export const getGapSuggestions = (documentId) => 
  api.get(`/api/chat/${documentId}/gap-suggestions`);

export const executeEditCommand = (documentId, command) => 
  api.post(`/api/chat/${documentId}/edit`, { command });

export const submitViaChat = (documentId, command) => 
  api.post(`/api/chat/${documentId}/workflow`, { command });

export const getAuditSummary = (documentId) => 
  api.get(`/api/chat/${documentId}/audit-summary`);

export const exportApprovedData = (documentId) => 
  api.get(`/api/chat/${documentId}/export-data`);

export default api;

