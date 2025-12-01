import React, { useState } from 'react';
import './TableEditor.css';

const TableEditor = ({ table, onTableChange, isLocked }) => {
  const [tableData, setTableData] = useState(table);

  // Check if a cell has a gap (Pending, null, or missing)
  const hasGap = (cell) => {
    if (!cell) return false;
    const text = (cell.text || "").trim().toLowerCase();
    
    // Check for backend gap indicators
    if (cell.has_gap || cell.is_pending || cell.is_missing || cell.is_null || cell.is_empty) {
      return true;
    }
    
    // Check for pending values (various formats)
    const isPending = text.includes("(pending)") || 
                      text.includes("pending)") || 
                      text.includes("(pending") ||
                      text === "pending";
    
    // Check for null values (exact match or as string)
    const isNull = text === "null" || 
                   text === "none" || 
                   text === "nil" || 
                   text === "n/a" || 
                   text === "na" ||
                   text === "n.a.";
    
    // Check for missing/empty values
    const missingValues = ["missing", "not provided", "not available", "unavailable", 
                          "tbd", "to be determined", "t.b.d.", "tba", "to be announced",
                          "unknown", "unk", ""];
    const isMissing = !text || missingValues.includes(text);
    
    return isPending || isNull || isMissing;
  };

  // Check if a cell was previously a gap but now has valid data (should be green)
  const isFilled = (cell) => {
    if (!cell) return false;
    // If cell originally had a gap but now has valid content
    const hadGap = cell.original_has_gap || cell.was_gap;
    const hasValidContent = cell.text && cell.text.trim() && !hasGap(cell);
    return hadGap && hasValidContent;
  };

  const handleCellChange = (rowIdx, cellIdx, newValue) => {
    if (isLocked) return;
    
    const updatedTable = { ...tableData };
    const cell = updatedTable.rows[rowIdx].cells[cellIdx];
    
    // Track if this cell originally had a gap (before editing)
    if (cell.original_has_gap === undefined) {
      cell.original_has_gap = hasGap(cell);
      cell.was_gap = cell.original_has_gap;
    }
    
    cell.text = newValue;
    
    // Update gap indicators
    const text = newValue.trim().toLowerCase();
    cell.is_pending = text.includes("(pending)") || 
                      text.includes("pending)") || 
                      text.includes("(pending") ||
                      text === "pending";
    
    const isNull = text === "null" || text === "none" || text === "nil" || 
                   text === "n/a" || text === "na" || text === "n.a.";
    const missingValues = ["missing", "not provided", "not available", "unavailable", 
                          "tbd", "to be determined", "t.b.d.", "tba", "to be announced",
                          "unknown", "unk", ""];
    cell.is_null = isNull;
    cell.is_missing = !text || missingValues.includes(text);
    cell.is_empty = !text || text === "";
    cell.has_gap = cell.is_pending || cell.is_null || cell.is_missing || cell.is_empty;
    
    // Mark as filled if it was a gap but now has valid content
    cell.is_filled = cell.original_has_gap && !cell.has_gap && newValue.trim().length > 0;
    
    setTableData(updatedTable);
    
    if (onTableChange) {
      onTableChange(updatedTable);
    }
  };

  const addRow = () => {
    if (isLocked) return;
    
    const numCols = tableData.rows[0]?.cells.length || 1;
    const newRow = {
      id: `row_${tableData.rows.length}`,
      cells: Array.from({ length: numCols }, (_, idx) => ({
        id: `cell_${tableData.rows.length}_${idx}`,
        text: '',
        row: tableData.rows.length,
        col: idx
      }))
    };
    
    const updatedTable = {
      ...tableData,
      rows: [...tableData.rows, newRow]
    };
    setTableData(updatedTable);
    
    if (onTableChange) {
      onTableChange(updatedTable);
    }
  };

  const addColumn = () => {
    if (isLocked) return;
    
    const updatedTable = {
      ...tableData,
      rows: tableData.rows.map((row, rowIdx) => ({
        ...row,
        cells: [
          ...row.cells,
          {
            id: `cell_${rowIdx}_${row.cells.length}`,
            text: '',
            row: rowIdx,
            col: row.cells.length
          }
        ]
      }))
    };
    setTableData(updatedTable);
    
    if (onTableChange) {
      onTableChange(updatedTable);
    }
  };

  if (!tableData || !tableData.rows || tableData.rows.length === 0) {
    return <div className="empty-table">No table data</div>;
  }

  return (
    <div className="table-editor-container">
      <div className="table-controls">
        <h4>Table: {tableData.id}</h4>
        {!isLocked && (
          <div className="table-buttons">
            <button onClick={addRow} className="table-button">➕ Add Row</button>
            <button onClick={addColumn} className="table-button">➕ Add Column</button>
          </div>
        )}
      </div>
      <div className="table-wrapper">
        <table className="editable-table">
          <tbody>
            {tableData.rows.map((row, rowIdx) => {
              // Check if first row should be treated as header
              const isHeaderRow = rowIdx === 0;
              return (
                <tr key={row.id || rowIdx} className={isHeaderRow ? 'header-row' : ''}>
                  {row.cells.map((cell, cellIdx) => {
                    const cellHasGap = hasGap(cell);
                    const cellIsFilled = isFilled(cell);
                    const cellClass = cellIsFilled ? 'cell-filled' : (cellHasGap ? 'cell-gap' : '');
                    const inputClass = cellIsFilled ? 'cell-filled-input' : (cellHasGap ? 'cell-gap-input' : '');
                    const contentClass = cellIsFilled ? 'cell-filled-content' : (cellHasGap ? 'cell-gap-content' : '');
                    
                    return (
                      <td 
                        key={cell.id || cellIdx}
                        className={cellClass}
                      >
                        {isLocked ? (
                          <div className={`cell-content ${contentClass}`}>
                            {cell.text || ''}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={cell.text || ''}
                            onChange={(e) => handleCellChange(rowIdx, cellIdx, e.target.value)}
                            className={`cell-input ${inputClass}`}
                            placeholder="Enter text..."
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableEditor;

