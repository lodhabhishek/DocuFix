import React, { useState, useEffect } from 'react';
import { listApprovedDocuments, downloadApprovedXML, getApprovedXML, getApprovedJSON, getApprovedDBObject, getDocumentAuditHistory } from '../services/api';
import DocumentViewer from '../components/DocumentViewer';
import './ApprovedDocuments.css';

const ApprovedDocuments = () => {
  const [approvedDocs, setApprovedDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [jsonData, setJsonData] = useState(null);
  const [xmlData, setXmlData] = useState(null);
  const [dbObject, setDbObject] = useState(null);
  const [auditHistory, setAuditHistory] = useState(null);
  const [viewMode, setViewMode] = useState(null); // 'doc', 'reusable', 'db', 'audit'
  const [reusableTab, setReusableTab] = useState('json'); // 'json' or 'xml' when in reusable view
  const [selectedApprovedDoc, setSelectedApprovedDoc] = useState(null);

  useEffect(() => {
    loadApprovedDocuments();
  }, []);

  const loadApprovedDocuments = async () => {
    setLoading(true);
    try {
      const response = await listApprovedDocuments();
      setApprovedDocs(response.data);
    } catch (error) {
      setMessage(`❌ Error loading approved documents: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewApprovedDoc = async (approvedDoc) => {
    try {
      // Set the approved document for viewing
      setSelectedApprovedDoc(approvedDoc);
      setJsonData(null);
      setXmlData(null);
      setDbObject(null);
      setAuditHistory(null);
      setSelectedDoc(approvedDoc.id);
      setViewMode('doc');
    } catch (error) {
      setMessage(`❌ Error opening document: ${error.response?.data?.detail || error.message}`);
    }
  };

  // Helper function to extract table data with specific columns
  const extractTableData = (data) => {
    if (!data) return null;
    
    const tables = [];
    
    // First, check structured_data for materials/equipment (most reliable)
    if (data.structured_data) {
      const structured = data.structured_data;
      
      // Materials table - map to specific columns
      if (structured.materials && structured.materials.length > 0) {
        tables.push({
          tableName: 'Materials Used',
          headers: ['Materials Used', 'Material_CTG #', 'BG_ATN', 'Supplier', 'Lot Number'],
          rows: structured.materials.map(mat => ({
            'Materials Used': mat.name || mat.material_name || '',
            'Material_CTG #': mat.catalog_number || mat.material_ctg || '',
            'BG_ATN': mat.bg_atn || mat.bg_atn_code || '',
            'Supplier': mat.supplier || '',
            'Lot Number': mat.lot_number || ''
          }))
        });
      }
      
      // Equipment table
      if (structured.equipment && structured.equipment.length > 0) {
        tables.push({
          tableName: 'Equipment',
          headers: ['Equipment Name', 'Configuration', 'Model Number', 'Serial Number'],
          rows: structured.equipment.map(eq => ({
            'Equipment Name': eq.name || eq.equipment_name || '',
            'Configuration': eq.configuration || '',
            'Model Number': eq.model_number || '',
            'Serial Number': eq.serial_number || ''
          }))
        });
      }
    }
    
    // Also check document_structure for tables in the document
    const documentStructure = data.document_structure || data.structure || {};
    const tablesData = documentStructure.tables || [];
    
    tablesData.forEach((table, idx) => {
      if (table.rows && table.rows.length > 1) { // Need at least header + 1 data row
        // Get table name
        const tableName = table.name || table.id || `Table ${idx + 1}`;
        
        // Get column headers from first row
        const headers = [];
        if (table.rows[0] && table.rows[0].cells) {
          table.rows[0].cells.forEach(cell => {
            const headerText = (cell.text || '').trim();
            if (headerText) headers.push(headerText);
          });
        }
        
        // If we have headers, extract data rows
        if (headers.length > 0) {
          const rows = [];
          for (let i = 1; i < table.rows.length; i++) {
            const row = table.rows[i];
            if (row && row.cells) {
              const rowData = {};
              row.cells.forEach((cell, cellIdx) => {
                if (cellIdx < headers.length) {
                  rowData[headers[cellIdx]] = (cell.text || '').trim();
                }
              });
              // Only add row if it has at least one non-empty value
              if (Object.values(rowData).some(val => val && val.trim())) {
                rows.push(rowData);
              }
            }
          }
          
          if (rows.length > 0) {
            tables.push({
              tableName,
              headers,
              rows
            });
          }
        }
      }
    });
    
    return tables.length > 0 ? tables : null;
  };

  const handleViewReusable = async (approvedId, sectionId) => {
    try {
      // Load both JSON and XML
      const [jsonResponse, xmlResponse] = await Promise.all([
        getApprovedJSON(approvedId),
        getApprovedXML(approvedId)
      ]);
      setJsonData(jsonResponse.data);
      setXmlData(xmlResponse.data);
      setDbObject(null);
      setAuditHistory(null);
      setSelectedDoc(approvedId);
      setViewMode('reusable');
      setReusableTab('json'); // Default to JSON tab
    } catch (error) {
      setMessage(`❌ Error loading reusable data: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleViewDBObject = async (approvedId, documentId) => {
    try {
      const response = await getApprovedDBObject(approvedId);
      setDbObject(response.data);
      setJsonData(null);
      setXmlData(null);
      setAuditHistory(null);
      setSelectedDoc(approvedId);
      setViewMode('db');
    } catch (error) {
      setMessage(`❌ Error loading DB object: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleViewAuditHistory = async (documentId) => {
    try {
      const response = await getDocumentAuditHistory(documentId);
      setAuditHistory(response.data);
      setJsonData(null);
      setXmlData(null);
      setDbObject(null);
      setViewMode('audit');
    } catch (error) {
      setMessage(`❌ Error loading audit history: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleDownloadJSON = async (approvedId, sectionId) => {
    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/approved/${approvedId}/download-json`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sectionId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setMessage('✅ JSON file downloaded successfully!');
    } catch (error) {
      setMessage(`❌ Error downloading JSON: ${error.message}`);
    }
  };

  return (
    <div className="approved-documents">
      <h2>✅ Approved Documents</h2>
      <p className="subtitle">View and download reusable XML and JSON formats of approved documents</p>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="loading">⏳ Loading approved documents...</div>
      ) : approvedDocs.length === 0 ? (
        <div className="no-documents">
          <p>No approved documents yet</p>
          <p className="hint">Documents will appear here after they are approved in the Review page</p>
        </div>
      ) : (
        <div className="documents-layout">
          <div className="documents-list">
            <h3>Approved Documents</h3>
            <div className="documents-grid">
              {approvedDocs.map(doc => (
                <div key={doc.id} className="document-card">
                  <div className="document-header">
                    <span className="section-id">{doc.section_id}</span>
                    <span className="version-badge">v{doc.version}</span>
                  </div>
                  
                  {doc.product_id && (
                    <p className="document-info">
                      <strong>Product:</strong> {doc.product_id}
                    </p>
                  )}
                  
                  {doc.section_type && (
                    <p className="document-info">
                      <strong>Type:</strong> {doc.section_type}
                    </p>
                  )}
                  
                  <p className="document-info">
                    <strong>Approved by:</strong> {doc.approved_by}
                  </p>
                  
                  <p className="document-date">
                    {new Date(doc.approved_at).toLocaleString()}
                  </p>
                  
                  {doc.approval_notes && (
                    <div className="approval-notes">
                      <strong>Notes:</strong>
                      <p>{doc.approval_notes}</p>
                    </div>
                  )}
                  
                  <div className="document-actions-right">
                    <button
                      onClick={() => handleViewApprovedDoc(doc)}
                      className={`action-button ${selectedDoc === doc.id && viewMode === 'doc' ? 'active' : ''}`}
                    >
                      📄 View Approve Doc
                    </button>
                    <button
                      onClick={() => handleViewReusable(doc.id, doc.section_id)}
                      className={`action-button ${selectedDoc === doc.id && viewMode === 'reusable' ? 'active' : ''}`}
                    >
                      🔄 Reusable XML and JSON
                    </button>
                    <button
                      onClick={() => handleViewDBObject(doc.id, doc.document_id)}
                      className={`action-button ${selectedDoc === doc.id && viewMode === 'db' ? 'active' : ''}`}
                    >
                      🗄️ View DB Object
                    </button>
                    <button
                      onClick={() => handleViewAuditHistory(doc.document_id)}
                      className={`action-button ${viewMode === 'audit' ? 'active' : ''}`}
                    >
                      📊 Review & Approval Audit History
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side Panel - Document View */}
          {selectedApprovedDoc && viewMode === 'doc' && (
            <div className="right-panel doc-panel">
              <div className="panel-header">
                <h3>📄 Approved Document</h3>
                <span className="doc-meta">{selectedApprovedDoc.section_id} - v{selectedApprovedDoc.version}</span>
              </div>
              <div className="document-viewer-wrapper">
                <DocumentViewer
                  documentId={selectedApprovedDoc.document_id}
                  filePath="view"
                  isLocked={true}
                  onSave={null}
                  onContentChange={null}
                  originalStructure={null}
                />
              </div>
            </div>
          )}

          {/* Right Side Panel - Reusable XML and JSON View */}
          {jsonData && xmlData && viewMode === 'reusable' && (
            <div className="right-panel reusable-panel">
              <div className="panel-header">
                <h3>🔄 Reusable XML and JSON</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <strong>Section ID:</strong> {jsonData.section_id}
                  </div>
                  <div className="info-item">
                    <strong>Approved At:</strong> {new Date(jsonData.approved_at).toLocaleString()}
                  </div>
                  <div className="info-item">
                    <strong>Approved By:</strong> {jsonData.approved_by}
                  </div>
                </div>
              </div>
              
              {/* Tabs for JSON and XML */}
              <div className="reusable-tabs">
                <button 
                  className={`tab-button ${reusableTab === 'json' ? 'active' : ''}`}
                  onClick={() => setReusableTab('json')}
                >
                  📋 JSON Format
                </button>
                <button 
                  className={`tab-button ${reusableTab === 'xml' ? 'active' : ''}`}
                  onClick={() => setReusableTab('xml')}
                >
                  📄 XML Format
                </button>
              </div>
              
              {/* JSON Tab Content */}
              {reusableTab === 'json' && (() => {
                const tableData = extractTableData(jsonData.data);
                return (
                  <div className="reusable-content">
                    {/* Extract table data with specific columns */}
                    {tableData && (
                      <div className="table-data-section">
                        <h4>📊 Table Data (JSON Format)</h4>
                        {tableData.map((table, idx) => (
                          <div key={idx} className="table-json-section">
                            <h5>{table.tableName}</h5>
                            <div className="table-preview">
                              <table className="data-preview-table">
                                <thead>
                                  <tr>
                                    {table.headers.map((header, hIdx) => (
                                      <th key={hIdx}>{header}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {table.rows.map((row, rIdx) => (
                                    <tr key={rIdx}>
                                      {table.headers.map((header, hIdx) => (
                                        <td key={hIdx}>{row[header] || 'N/A'}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <details className="json-details">
                              <summary>View Full JSON</summary>
                              <pre className="json-code">{JSON.stringify(table.rows, null, 2)}</pre>
                            </details>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="json-actions">
                      <button
                        onClick={() => {
                          const jsonToCopy = tableData ? JSON.stringify(tableData, null, 2) : JSON.stringify(jsonData.data, null, 2);
                          navigator.clipboard.writeText(jsonToCopy);
                          setMessage('✅ JSON data copied to clipboard!');
                        }}
                        className="copy-button"
                      >
                        📋 Copy JSON
                      </button>
                      <button
                        onClick={() => handleDownloadJSON(selectedDoc, jsonData.section_id)}
                        className="download-json-button"
                      >
                        📥 Download JSON File
                      </button>
                    </div>
                    
                    {/* Full JSON View */}
                    <details className="full-json-details">
                      <summary>View Complete JSON Data</summary>
                      <pre className="json-code">{JSON.stringify(jsonData.data, null, 2)}</pre>
                    </details>
                  </div>
                );
              })()}
              
              {/* XML Tab Content */}
              {reusableTab === 'xml' && (
                <div className="reusable-content">
                  <div className="xml-content">
                    <h4>📄 XML Document</h4>
                    <pre className="xml-code">{xmlData.xml_content}</pre>
                  </div>
                  
                  <div className="xml-actions">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(xmlData.xml_content);
                        setMessage('✅ XML content copied to clipboard!');
                      }}
                      className="copy-button"
                    >
                      📋 Copy XML
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const response = await downloadApprovedXML(selectedDoc);
                          const blob = await response.data;
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `${xmlData.section_id}.xml`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                          setMessage('✅ XML file downloaded successfully!');
                        } catch (error) {
                          setMessage(`❌ Error downloading XML: ${error.response?.data?.detail || error.message}`);
                        }
                      }}
                      className="download-xml-button"
                    >
                      📥 Download XML File
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          

          {/* Right Side Panel - DB Object View */}
          {dbObject && viewMode === 'db' && (
            <div className="right-panel db-panel">
              <div className="panel-header">
                <h3>🗄️ Document Content - Approved Values</h3>
                <p className="panel-subtitle">Tables from approved document</p>
              </div>
              
              {dbObject.document_content && (
                <>
                  {/* Document Tables - Only section to display */}
                  {dbObject.document_content.document_structure && dbObject.document_content.document_structure.tables && 
                   dbObject.document_content.document_structure.tables.length > 0 && (
                    <div className="content-object-section">
                      <h4>📊 Document Tables (From Approved Document)</h4>
                      <p className="info-text">Tables extracted from the approved document structure</p>
                      {dbObject.document_content.document_structure.tables.map((table, tableIdx) => (
                        <div key={tableIdx} className="table-section">
                          <h5>{table.name || table.id || `Table ${tableIdx + 1}`}</h5>
                          {table.rows && table.rows.length > 0 && (
                            <table className="content-table">
                              <thead>
                                <tr>
                                  {table.rows[0] && table.rows[0].cells && table.rows[0].cells.map((cell, cellIdx) => (
                                    <th key={cellIdx}>{cell.text || `Column ${cellIdx + 1}`}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {table.rows.slice(1).map((row, rowIdx) => (
                                  <tr key={rowIdx}>
                                    {row.cells && row.cells.map((cell, cellIdx) => (
                                      <td key={cellIdx}>{cell.text || 'N/A'}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {(!dbObject.document_content.document_structure || 
                    !dbObject.document_content.document_structure.tables || 
                    dbObject.document_content.document_structure.tables.length === 0) && (
                    <div className="content-object-section">
                      <p className="no-data">No document tables available in approved document</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Right Side Panel - Audit History View */}
          {auditHistory && viewMode === 'audit' && (
            <div className="right-panel audit-panel">
              <div className="panel-header">
                <h3>📊 Review & Approval Audit History</h3>
                <span className="history-count">{auditHistory.length} entries</span>
              </div>
              
              <div className="audit-timeline">
                {auditHistory.length > 0 ? (
                  auditHistory.map((entry, idx) => (
                    <div key={entry.id || idx} className="audit-entry">
                      <div className="audit-entry-header">
                        <span className={`audit-action action-${entry.action}`}>
                          {entry.action ? entry.action.toUpperCase() : 'UNKNOWN'}
                        </span>
                        <span className="audit-date">
                          {entry.performed_at ? new Date(entry.performed_at).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <div className="audit-entry-body">
                        <div className="audit-field">
                          <strong>Performed by:</strong> {entry.performed_by || 'System'}
                        </div>
                        {entry.version && (
                          <div className="audit-field">
                            <strong>Version:</strong> v{entry.version}
                          </div>
                        )}
                        {entry.previous_status && entry.new_status && (
                          <div className="audit-field">
                            <strong>Status change:</strong> 
                            <span className="status-change">
                              {entry.previous_status} → {entry.new_status}
                            </span>
                          </div>
                        )}
                        {entry.notes && (
                          <div className="audit-field">
                            <strong>Notes:</strong> {entry.notes}
                          </div>
                        )}
                        {entry.submission_id && (
                          <div className="audit-field">
                            <strong>Submission ID:</strong> #{entry.submission_id}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-audit">
                    <p>No audit history available yet.</p>
                    <p className="audit-hint">Audit history will be created automatically when documents are submitted and approved.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!selectedApprovedDoc && !jsonData && !xmlData && !dbObject && !auditHistory && (
            <div className="right-panel empty-panel">
              <p>Select an action to view details</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ApprovedDocuments;

