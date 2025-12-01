import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import DocumentUpload from './pages/DocumentUpload';
import DocumentEditor from './pages/DocumentEditor';
import ReviewPage from './pages/ReviewPage';
import ApprovedDocuments from './pages/ApprovedDocuments';
import './App.css';

function App() {
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <div className="header-content">
            <h1>🔒 DocuFix POC</h1>
            <p className="tagline">Turn gaps into clarity — approved data, ready for reuse</p>
          </div>
          <nav className="App-nav">
            <Link to="/" className="nav-link">📄 Documents</Link>
            <Link to="/review" className="nav-link">🔍 Review</Link>
            <Link to="/approved" className="nav-link">✅ Approved</Link>
          </nav>
        </header>

        <main className="App-main">
          <Routes>
            <Route 
              path="/" 
              element={
                <div className="main-layout">
                  <DocumentUpload onDocumentSelect={setSelectedDocumentId} />
                  {selectedDocumentId && (
                    <div className="editor-section">
                      <DocumentEditor documentId={selectedDocumentId} />
                    </div>
                  )}
                </div>
              } 
            />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/approved" element={<ApprovedDocuments />} />
          </Routes>
        </main>

        <footer className="App-footer">
          <p>DocuFix POC - Document Quality & Approval Workflow</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
