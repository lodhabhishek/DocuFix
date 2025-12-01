import React, { useState } from 'react';
import './GapsPanel.css';

const GapsPanel = ({ gaps }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!gaps) return null;

  // Calculate total gaps accurately from actual arrays
  const materialsCount = gaps.materials?.length || 0;
  const equipmentCount = gaps.equipment?.length || 0;
  const tableCellsCount = gaps.table_cells?.length || 0;
  const totalGaps = materialsCount + equipmentCount + tableCellsCount;
  
  // Use the calculated total instead of gaps.total_gaps to ensure accuracy

  // Group table cells by issue type
  const groupedIssues = {
    materials: gaps.materials || [],
    equipment: gaps.equipment || [],
    table_cells: (gaps.table_cells || []).reduce((acc, cell) => {
      const issueType = cell.issue || 'Data quality gap';
      if (!acc[issueType]) {
        acc[issueType] = [];
      }
      acc[issueType].push(cell);
      return acc;
    }, {})
  };

  return (
    <div className={`gaps-panel ${totalGaps > 0 ? 'has-gaps' : 'no-gaps'}`}>
      <div className="panel-header">
        <div className="panel-icon">
          {totalGaps > 0 ? '⚠️' : '✅'}
        </div>
        <div className="panel-title-inline">
          <span className="panel-title">Data Quality Summary</span>
          {totalGaps > 0 && (
            <>
              <span className="panel-subtitle-inline">
                {totalGaps} gap{totalGaps !== 1 ? 's' : ''} detected
              </span>
              {gaps.table_cells && gaps.table_cells.length > 0 && (
                <span className="cell-count-inline">
                  {gaps.table_cells.length} CELLS
                  <button 
                    className="expand-button-inline"
                    onClick={() => setIsExpanded(!isExpanded)}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                </span>
              )}
            </>
          )}
        </div>
        {totalGaps > 0 && (
          <div className="panel-right">
            <div className="panel-stats">
              {gaps.materials && gaps.materials.length > 0 && (
                <div className="stat-badge">
                  <span className="stat-number">{gaps.materials.length}</span>
                  <span className="stat-label">Materials</span>
                </div>
              )}
              {gaps.equipment && gaps.equipment.length > 0 && (
                <div className="stat-badge">
                  <span className="stat-number">{gaps.equipment.length}</span>
                  <span className="stat-label">Equipment</span>
                </div>
              )}
            </div>
            {(!gaps.table_cells || gaps.table_cells.length === 0) && (
              <button 
                className="expand-button"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            )}
          </div>
        )}
      </div>

      {totalGaps > 0 && isExpanded && (
        <div className="panel-details">
          {/* Materials Issues */}
          {groupedIssues.materials.length > 0 && (
            <div className="issue-group">
              <h4 className="issue-group-title">
                📦 Materials ({groupedIssues.materials.length})
              </h4>
              <ul className="issue-list">
                {groupedIssues.materials.map((gap, idx) => (
                  <li key={idx} className="issue-item">
                    <span className="issue-badge material">Material</span>
                    <span className="issue-text">
                      <strong>{gap.material_name || 'Unknown'}</strong> - Missing {gap.field}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Equipment Issues */}
          {groupedIssues.equipment.length > 0 && (
            <div className="issue-group">
              <h4 className="issue-group-title">
                🔧 Equipment ({groupedIssues.equipment.length})
              </h4>
              <ul className="issue-list">
                {groupedIssues.equipment.map((gap, idx) => (
                  <li key={idx} className="issue-item">
                    <span className="issue-badge equipment">Equipment</span>
                    <span className="issue-text">
                      <strong>{gap.equipment_name || 'Unknown'}</strong> - Invalid {gap.field}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Table Cell Issues - Grouped by type */}
          {Object.keys(groupedIssues.table_cells).length > 0 && (
            <div className="issue-group">
              <h4 className="issue-group-title">
                📊 Table Cells ({gaps.table_cells.length})
              </h4>
              {Object.entries(groupedIssues.table_cells).map(([issueType, cells]) => (
                <div key={issueType} className="issue-subgroup">
                  <h5 className="issue-subgroup-title">{issueType} ({cells.length})</h5>
                  <ul className="issue-list">
                    {cells.map((cell, idx) => (
                      <li key={idx} className="issue-item">
                        <span className={`issue-badge ${cell.status || 'gap'}`}>
                          {cell.status || 'gap'}
                        </span>
                        <span className="issue-text">
                          {cell.description || 
                           `Table ${cell.table_id}, Row ${(cell.row || 0) + 1}, Column ${(cell.col || 0) + 1}: ${cell.text || '(empty)'}`
                          }
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GapsPanel;

