import React, { useState, useEffect, useRef } from 'react';
import mammoth from 'mammoth';
import { updateDocumentContent } from '../services/api';
import './DocumentViewer.css';

const DocumentViewer = ({ documentId, filePath, isLocked, onSave, onContentChange, originalStructure, gaps }) => {
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const contentRef = useRef(null);
  const originalContentRef = useRef('');
  const originalStructureRef = useRef(null);
  const savedScrollPositionRef = useRef(null);
  const savedSelectionRef = useRef(null);
  const lastEditedElementRef = useRef(null);

  useEffect(() => {
    if (documentId) {
      loadDocument();
    }
  }, [filePath, documentId]);
  
  // Also reload when originalStructure changes (after save)
  useEffect(() => {
    if (originalStructure && filePath && documentId) {
      originalStructureRef.current = JSON.parse(JSON.stringify(originalStructure));
    }
  }, [originalStructure, filePath, documentId]);
  
  // Restore cursor position after HTML content is updated
  useEffect(() => {
    if (htmlContent && savedSelectionRef.current && contentRef.current) {
      // Wait for React to finish rendering
      const timeoutId = setTimeout(() => {
        // Ensure all cells have data-cell-id
        const tables = contentRef.current.querySelectorAll('table');
        tables.forEach((table, tableIdx) => {
          const rows = table.querySelectorAll('tr');
          rows.forEach((row, rowIdx) => {
            const cells = row.querySelectorAll('td, th');
            cells.forEach((cell, cellIdx) => {
              if (!cell.getAttribute('data-cell-id')) {
                cell.setAttribute('data-cell-id', `table-${tableIdx}-row-${rowIdx}-cell-${cellIdx}`);
              }
            });
          });
        });
        
        // Now restore cursor
        restoreCursorPosition();
      }, 400);
      
      return () => clearTimeout(timeoutId);
    }
  }, [htmlContent]);

  const loadDocument = async () => {
    if (!documentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch the DOCX file with cache busting to ensure we get the latest version
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const cacheBuster = `?t=${Date.now()}`;
      const url = `${API_BASE_URL}/api/documents/${documentId}/download${cacheBuster}`;
      
      console.log('Loading document from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/octet-stream, */*'
        }
      }).catch((fetchError) => {
        console.error('Fetch error:', fetchError);
        throw new Error(`Network error: ${fetchError.message}. Make sure the backend server is running on ${API_BASE_URL}`);
      });
      
      if (!response.ok) {
        let errorText = 'Unknown error';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = `${response.status} ${response.statusText}`;
        }
        console.error('Document fetch error:', errorText);
        throw new Error(`Failed to load document: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      // Convert DOCX to HTML using mammoth
      const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
      let html = result.value;
      
      // Process highlighting - process text nodes only, avoiding HTML tags
      // Process patterns in order: null values FIRST, then pending patterns
      // This prevents "pending" from wrapping "null"
      
      const highlightTextContent = (text) => {
        if (!text || !text.trim()) return text;
        
        // Use a temporary marker to track already highlighted content
        const PLACEHOLDER = '___HIGHLIGHTED___';
        let processed = text;
        const replacements = [];
        
        // Step 1: Mark null and missing values FIRST (they should be highlighted independently)
        // Include missing value keywords: missing, not provided, not available, unavailable, tbd, tba, unknown, etc.
        processed = processed.replace(/\b(null|NULL|Null|none|NONE|None|nil|NIL|Nil|n\/a|N\/A|na|NA|n\.a\.|missing|Missing|MISSING|not provided|Not Provided|NOT PROVIDED|not available|Not Available|NOT AVAILABLE|unavailable|Unavailable|UNAVAILABLE|tbd|TBD|T\.B\.D\.|to be determined|To Be Determined|tba|TBA|to be announced|To Be Announced|unknown|Unknown|UNKNOWN|unk|Unk|UNK)\b/gi, (match) => {
          const placeholder = `${PLACEHOLDER}${replacements.length}${PLACEHOLDER}`;
          replacements.push(`<span class="highlight-pending">${match}</span>`);
          return placeholder;
        });
        
        // Step 2: Mark complete "(Pending)" patterns
        processed = processed.replace(/(\(Pending\)|\(pending\)|\(PENDING\))/gi, (match) => {
          const placeholder = `${PLACEHOLDER}${replacements.length}${PLACEHOLDER}`;
          replacements.push(`<span class="highlight-pending">${match}</span>`);
          return placeholder;
        });
        
        // Step 3: Mark partial pending patterns
        processed = processed.replace(/(Pending\)|\(Pending|pending\)|\(pending|PENDING\)|\(PENDING)/gi, (match) => {
          const placeholder = `${PLACEHOLDER}${replacements.length}${PLACEHOLDER}`;
          replacements.push(`<span class="highlight-pending">${match}</span>`);
          return placeholder;
        });
        
        // Step 4: Mark standalone "Pending" words (last, to avoid matching inside "(Pending)")
        processed = processed.replace(/\b(Pending|PENDING|pending)\b/gi, (match, offset, string) => {
          // Skip if part of "(Pending)" - check context
          const charBefore = offset > 0 ? string[offset - 1] : '';
          const charAfter = offset + match.length < string.length ? string[offset + match.length] : '';
          if (charBefore === '(' || charAfter === ')') {
            return match; // Don't highlight, it's part of "(Pending)"
          }
          const placeholder = `${PLACEHOLDER}${replacements.length}${PLACEHOLDER}`;
          replacements.push(`<span class="highlight-pending">${match}</span>`);
          return placeholder;
        });
        
        // Step 5: Replace all placeholders with actual HTML
        replacements.forEach((replacement, idx) => {
          processed = processed.replace(`${PLACEHOLDER}${idx}${PLACEHOLDER}`, replacement);
        });
        
        return processed;
      };
      
      // Process text content between HTML tags only
      html = html.replace(/>([^<]+)</g, (match, textContent) => {
        // Only process if it looks like actual text content (not attributes)
        if (textContent.includes('=') || textContent.trim().startsWith('/')) {
          return match;
        }
        return `>${highlightTextContent(textContent)}<`;
      });
      
      // Add unique data attributes to table cells for reliable identification after reload
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const tables = tempDiv.querySelectorAll('table');
      tables.forEach((table, tableIdx) => {
        const rows = table.querySelectorAll('tr');
        rows.forEach((row, rowIdx) => {
          const cells = row.querySelectorAll('td, th');
          cells.forEach((cell, cellIdx) => {
            // Add unique identifier to each cell
            cell.setAttribute('data-cell-id', `table-${tableIdx}-row-${rowIdx}-cell-${cellIdx}`);
            // Also store cell text for matching
            const cellText = (cell.textContent || cell.innerText || '').trim();
            if (cellText) {
              cell.setAttribute('data-cell-text', cellText.substring(0, 100)); // First 100 chars
            }
          });
        });
      });
      html = tempDiv.innerHTML;
      
      // Apply gap-based highlighting to table cells if gaps data is available
      if (gaps && gaps.table_cells && gaps.table_cells.length > 0) {
        html = applyGapHighlightingToTables(html, gaps.table_cells, originalStructure);
      }
      
      setHtmlContent(html);
      originalContentRef.current = html;
      
      // Store original structure if provided
      if (originalStructure) {
        originalStructureRef.current = JSON.parse(JSON.stringify(originalStructure));
      }
      
      if (result.messages.length > 0) {
        console.warn('Conversion warnings:', result.messages);
      }
      
      // After HTML is set, try to restore cursor position if we have a saved one
      // Use a longer delay to ensure DOM is fully ready and rendered
      // Also add data-cell-id attributes to cells if not already present
      setTimeout(() => {
        if (contentRef.current) {
          // Ensure all table cells have data-cell-id attributes
          const tables = contentRef.current.querySelectorAll('table');
          tables.forEach((table, tableIdx) => {
            const rows = table.querySelectorAll('tr');
            rows.forEach((row, rowIdx) => {
              const cells = row.querySelectorAll('td, th');
              cells.forEach((cell, cellIdx) => {
                if (!cell.getAttribute('data-cell-id')) {
                  cell.setAttribute('data-cell-id', `table-${tableIdx}-row-${rowIdx}-cell-${cellIdx}`);
                }
              });
            });
          });
          
          // Now try to restore cursor
          if (savedSelectionRef.current) {
            restoreCursorPosition();
          }
        }
      }, 300); // Increased delay
    } catch (err) {
      console.error('Error loading document:', err);
      setError(`Failed to load document: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to apply gap highlighting to table cells based on gap data
  const applyGapHighlightingToTables = (html, tableCellGaps, structure) => {
    if (!tableCellGaps || tableCellGaps.length === 0) return html;
    
    // Create a temporary DOM element to manipulate the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Build a map of gaps by table index, row, and column for quick lookup
    const gapMap = new Map();
    tableCellGaps.forEach(gap => {
      // Try different ways to identify the table
      const tableId = gap.table_id || gap.table;
      // Get row index (try multiple field names)
      const rowIdx = gap.row !== undefined ? gap.row : 
                     (gap.row_idx !== undefined ? gap.row_idx : 
                      (gap.row_index !== undefined ? gap.row_index : -1));
      // Get column index (try multiple field names)
      const colIdx = gap.col !== undefined ? gap.col : 
                     (gap.col_idx !== undefined ? gap.col_idx : 
                      (gap.col_index !== undefined ? gap.col_index : 
                       (gap.column !== undefined ? gap.column : -1)));
      
      // Build keys for lookup - try both table ID and index-based
      if (rowIdx >= 0 && colIdx >= 0) {
        // Try with table ID
        if (tableId) {
          gapMap.set(`${tableId}_${rowIdx}_${colIdx}`, gap);
        }
        // Also store by table index if we can determine it
        const tableIndex = gap.table_index !== undefined ? gap.table_index : 
                          (tableId && tableId.startsWith('table_') ? parseInt(tableId.replace('table_', '')) : null);
        if (tableIndex !== null && !isNaN(tableIndex)) {
          gapMap.set(`table_${tableIndex}_${rowIdx}_${colIdx}`, gap);
        }
      }
    });
    
    // Find all tables in the HTML
    const tables = tempDiv.querySelectorAll('table');
    tables.forEach((table, tableIdx) => {
      // Try to match table by structure
      const tableIdFromStructure = structure?.tables?.[tableIdx]?.id;
      const tableId = tableIdFromStructure || `table_${tableIdx}`;
      
      const rows = table.querySelectorAll('tr');
      rows.forEach((row, rowIdx) => {
        const cells = row.querySelectorAll('td, th');
        cells.forEach((cell, colIdx) => {
          // Try multiple key formats to find the gap
          const gapKey1 = `${tableId}_${rowIdx}_${colIdx}`;
          const gapKey2 = `table_${tableIdx}_${rowIdx}_${colIdx}`;
          const gapKey3 = tableIdFromStructure ? `${tableIdFromStructure}_${rowIdx}_${colIdx}` : null;
          
          const gap = gapMap.get(gapKey1) || gapMap.get(gapKey2) || (gapKey3 ? gapMap.get(gapKey3) : null);
          
            if (gap) {
            // Get cell text content
            const cellText = (cell.textContent || cell.innerText || '').trim().toLowerCase();
            const gapText = gap.text ? gap.text.toLowerCase() : '';
            
            // Check if this is actually a gap cell
            // Gap exists if: has gap flags, or cell text matches gap indicators, or gap text indicates a gap
            // Treat missing values the same as null values
            const missingKeywords = ['missing', 'not provided', 'not available', 'unavailable', 'tbd', 'tba', 'unknown', 'unk'];
            const isMissingText = missingKeywords.some(keyword => cellText.includes(keyword) || gapText.includes(keyword));
            
            const hasGapValue = gap.is_null || gap.is_pending || gap.is_missing || gap.is_empty || gap.has_gap ||
                                gap.issue || gap.status || // If issue or status is set, it's a gap
                                cellText === 'null' || cellText === 'pending' || cellText === '(pending)' ||
                                cellText === 'none' || cellText === 'n/a' || cellText === '' ||
                                gapText === 'null' || gapText === '(empty)' || gapText.includes('pending') ||
                                gapText === 'none' || gapText === 'n/a' ||
                                isMissingText || // Missing values should be highlighted
                                (gap.status && (gap.status === 'missing' || gap.status === 'null')); // Missing status should be highlighted
            
            if (hasGapValue) {
              // Check if cell doesn't already have highlight class
              if (!cell.querySelector('.highlight-pending') && !cell.classList.contains('highlight-pending')) {
                // Get the innerHTML and check if it's already wrapped
                const cellInnerHTML = cell.innerHTML;
                
                // If the cell content is already wrapped or contains highlight, skip wrapping the whole thing
                // Instead, ensure the text content is highlighted
                if (!cellInnerHTML.includes('highlight-pending')) {
                  // Check if cell has simple text content
                  const hasOnlyText = !cell.querySelector('span, div, p, strong, em');
                  
                  if (hasOnlyText && cellInnerHTML.trim()) {
                    // Simple case: wrap the content
                    cell.innerHTML = `<span class="highlight-pending">${cellInnerHTML}</span>`;
                  } else if (cellText) {
                    // Complex HTML: wrap only if we can find the specific text
                    // For now, add a class to the cell itself and let CSS handle it
                    cell.classList.add('highlight-pending');
                  }
                }
              }
            }
          }
        });
      });
    });
    
    return tempDiv.innerHTML;
  };

  // Save cursor position and scroll position - improved version
  const saveCursorPosition = () => {
    if (!contentRef.current) return;
    
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      
      // Find the closest editable element (cell, paragraph, etc.)
      let element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
      while (element && element !== contentRef.current) {
        // Check if this is a table cell or paragraph
        if (element.tagName === 'TD' || element.tagName === 'TH' || element.tagName === 'P') {
          break;
        }
        element = element.parentElement;
      }
      
      if (element && element !== contentRef.current) {
        // Get the text content before editing (to find it after reload)
        const textBeforeEdit = element.textContent || element.innerText || '';
        
        // Get unique cell ID if it's a table cell (most reliable method)
        let cellId = null;
        if (element.tagName === 'TD' || element.tagName === 'TH') {
          cellId = element.getAttribute('data-cell-id');
          if (!cellId) {
            // Generate cell ID if not present
            const table = element.closest('table');
            if (table) {
              const tableIndex = Array.from(contentRef.current.querySelectorAll('table')).indexOf(table);
              const row = element.parentElement;
              const rowIndex = Array.from(table.rows).indexOf(row);
              const cellIndex = Array.from(row.cells).indexOf(element);
              cellId = `table-${tableIndex}-row-${rowIndex}-cell-${cellIndex}`;
              element.setAttribute('data-cell-id', cellId);
            }
          }
        }
        
        // Get cell position if it's a table cell (fallback)
        let cellPosition = null;
        if (element.tagName === 'TD' || element.tagName === 'TH') {
          const table = element.closest('table');
          if (table) {
            const tableIndex = Array.from(contentRef.current.querySelectorAll('table')).indexOf(table);
            const row = element.parentElement;
            const rowIndex = Array.from(table.rows).indexOf(row);
            const cellIndex = Array.from(row.cells).indexOf(element);
            cellPosition = { tableIndex, rowIndex, cellIndex };
          }
        }
        
        // Get paragraph index if it's a paragraph
        let paragraphIndex = null;
        if (element.tagName === 'P') {
          const paragraphs = contentRef.current.querySelectorAll('p');
          paragraphIndex = Array.from(paragraphs).indexOf(element);
        }
        
        // Save selection info with multiple identifiers
        savedSelectionRef.current = {
          cellId, // Most reliable - unique ID
          textContent: textBeforeEdit.substring(0, 100), // Save first 100 chars for matching
          cellPosition,
          paragraphIndex,
          tagName: element.tagName,
          offset: range.startOffset,
          // Also save surrounding context for better matching
          parentText: element.parentElement ? (element.parentElement.textContent || '').substring(0, 50) : ''
        };
        
        // Mark the element with a data attribute for easier finding
        element.setAttribute('data-editing', 'true');
        lastEditedElementRef.current = element;
        
        // Save scroll position
        savedScrollPositionRef.current = {
          top: contentRef.current.scrollTop,
          left: contentRef.current.scrollLeft
        };
        
        console.log('Saved cursor position:', savedSelectionRef.current);
      }
    }
  };

  // Restore cursor position after content reload - improved version
  const restoreCursorPosition = () => {
    if (!contentRef.current || !savedSelectionRef.current) {
      console.log('No saved cursor position to restore');
      return false;
    }
    
    if (!contentRef.current.querySelector) {
      console.warn('Content ref not ready for querying');
      return false;
    }
    
    try {
      const saved = savedSelectionRef.current;
      let targetElement = null;
      
      // Try to find element by unique cell ID first (most reliable)
      if (saved.cellId) {
        const elementById = contentRef.current.querySelector(`[data-cell-id="${saved.cellId}"]`);
        if (elementById) {
          targetElement = elementById;
          console.log('Found element by cell ID:', saved.cellId);
        }
      }
      
      // Try to find element by data attribute
      if (!targetElement) {
        const markedElement = contentRef.current.querySelector('[data-editing="true"]');
        if (markedElement) {
          targetElement = markedElement;
          markedElement.removeAttribute('data-editing');
          console.log('Found element by data-editing attribute');
        }
      }
      
      // Try to find by cell position (fallback for table cells)
      if (!targetElement && saved.cellPosition) {
        const tables = contentRef.current.querySelectorAll('table');
        if (tables[saved.cellPosition.tableIndex]) {
          const table = tables[saved.cellPosition.tableIndex];
          const rows = table.querySelectorAll('tr');
          if (rows[saved.cellPosition.rowIndex]) {
            const cells = rows[saved.cellPosition.rowIndex].querySelectorAll('td, th');
            if (cells[saved.cellPosition.cellIndex]) {
              targetElement = cells[saved.cellPosition.cellIndex];
              console.log('Found element by cell position:', saved.cellPosition);
            }
          }
        }
      }
      
      // If not found by position, try to find by edited text (most reliable after save)
      if (!targetElement && saved.editedText) {
        const allElements = contentRef.current.querySelectorAll('td, th, p');
        for (const el of allElements) {
          const elText = (el.textContent || el.innerText || '').trim();
          const savedEditedText = saved.editedText.trim();
          // Match if text matches the edited text (exact or close match)
          if (elText && (elText === savedEditedText || 
              elText.startsWith(savedEditedText) || 
              savedEditedText.startsWith(elText) ||
              elText.substring(0, Math.min(50, savedEditedText.length)) === savedEditedText.substring(0, Math.min(50, elText.length)))) {
            targetElement = el;
            console.log('Found element by edited text match:', elText, '===', savedEditedText);
            break;
          }
        }
      }
      
      // Fallback: try to find by original text content
      if (!targetElement && saved.textContent) {
        const allElements = contentRef.current.querySelectorAll('td, th, p');
        for (const el of allElements) {
          const elText = (el.textContent || el.innerText || '').trim();
          const savedText = saved.textContent.trim();
          // Match if text starts with saved text or contains it
          if (elText && (elText.startsWith(savedText) || savedText.startsWith(elText) || 
              elText.substring(0, 50) === savedText.substring(0, 50))) {
            targetElement = el;
            break;
          }
        }
      }
      
      // Fallback: find by paragraph index
      if (!targetElement && saved.paragraphIndex !== null) {
        const paragraphs = contentRef.current.querySelectorAll('p');
        if (paragraphs[saved.paragraphIndex]) {
          targetElement = paragraphs[saved.paragraphIndex];
        }
      }
      
      if (targetElement) {
        console.log('Found target element for cursor restoration:', targetElement, targetElement.textContent);
        
        // Make sure element is visible and focusable
        targetElement.setAttribute('contenteditable', 'true');
        targetElement.setAttribute('tabindex', '-1');
        
        // Scroll to element first (smooth scroll)
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        
        // Wait a bit for scroll to complete, then set cursor
        setTimeout(() => {
          // Ensure element is still in DOM
          if (!targetElement.isConnected) {
            console.warn('Target element no longer in DOM, trying to find again');
            // Try to find again by cell ID
            if (saved.cellId) {
              targetElement = contentRef.current.querySelector(`[data-cell-id="${saved.cellId}"]`);
            }
            if (!targetElement) return;
          }
          // Focus the element
          targetElement.focus();
          
          // Try to set cursor position
          const range = document.createRange();
          const selection = window.getSelection();
          
          // Find text node
          let textNode = null;
          let textOffset = saved.offset || 0;
          
          const walker = document.createTreeWalker(
            targetElement,
            NodeFilter.SHOW_TEXT,
            null
          );
          
          let node;
          let totalLength = 0;
          while ((node = walker.nextNode())) {
            const nodeLength = node.textContent.length;
            if (totalLength + nodeLength >= textOffset) {
              textNode = node;
              textOffset = textOffset - totalLength;
              break;
            }
            totalLength += nodeLength;
          }
          
          if (!textNode && targetElement.firstChild) {
            // Fallback: use first text node
            if (targetElement.firstChild.nodeType === Node.TEXT_NODE) {
              textNode = targetElement.firstChild;
            } else {
              // Find first text node
              const findTextNode = (node) => {
                if (node.nodeType === Node.TEXT_NODE) return node;
                for (let child of node.childNodes) {
                  const found = findTextNode(child);
                  if (found) return found;
                }
                return null;
              };
              textNode = findTextNode(targetElement);
            }
          }
          
          if (textNode) {
            const maxOffset = Math.min(textOffset, textNode.textContent.length);
            range.setStart(textNode, maxOffset);
            range.setEnd(textNode, maxOffset);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            // If no text node, place cursor at end of element
            range.selectNodeContents(targetElement);
            range.collapse(false); // Collapse to end
            selection.removeAllRanges();
            selection.addRange(range);
          }
          
          // Restore scroll position
          if (savedScrollPositionRef.current) {
            setTimeout(() => {
              if (contentRef.current) {
                contentRef.current.scrollTop = savedScrollPositionRef.current.top;
                contentRef.current.scrollLeft = savedScrollPositionRef.current.left;
              }
            }, 50);
          }
          
          // Add visual highlight
          targetElement.classList.add('recently-edited');
          setTimeout(() => {
            if (targetElement && targetElement.isConnected) {
              targetElement.classList.remove('recently-edited');
            }
          }, 2000);
          
          return true; // Success
        }, 300); // Wait for scroll animation
        
        return true; // Element found, restoration in progress
      } else {
        console.warn('Could not find target element for cursor restoration. Saved data:', savedSelectionRef.current);
        // At least restore scroll position
        if (savedScrollPositionRef.current && contentRef.current) {
          setTimeout(() => {
            if (contentRef.current) {
              contentRef.current.scrollTop = savedScrollPositionRef.current.top;
              contentRef.current.scrollLeft = savedScrollPositionRef.current.left;
            }
          }, 100);
        }
        return false; // Element not found
      }
    } catch (error) {
      console.error('Error restoring cursor position:', error);
      // At least restore scroll position
      if (savedScrollPositionRef.current && contentRef.current) {
        setTimeout(() => {
          if (contentRef.current) {
            contentRef.current.scrollTop = savedScrollPositionRef.current.top;
            contentRef.current.scrollLeft = savedScrollPositionRef.current.left;
          }
        }, 100);
      }
      return false; // Error occurred
    }
  };

  const handleContentChange = (e) => {
    if (contentRef.current && !isLocked) {
      // Save cursor position when content changes (debounced to avoid too many saves)
      if (contentRef.current._saveCursorTimeout) {
        clearTimeout(contentRef.current._saveCursorTimeout);
      }
      if (contentRef.current) {
        contentRef.current._saveCursorTimeout = setTimeout(() => {
          saveCursorPosition();
        }, 100);
      }
      
      const currentContent = contentRef.current.innerHTML;
      // Compare without highlight spans for accurate change detection
      const cleanedCurrent = currentContent.replace(/<span class="highlight-pending">([^<]*)<\/span>/gi, '$1');
      const cleanedOriginal = originalContentRef.current.replace(/<span class="highlight-pending">([^<]*)<\/span>/gi, '$1');
      const hasChanged = cleanedCurrent !== cleanedOriginal;
      setHasChanges(hasChanged);
      if (onContentChange) {
        onContentChange(currentContent);
      }
    }
  };
  
  // Also save cursor position on blur (when user clicks away)
  const handleBlur = () => {
    if (contentRef.current && !isLocked) {
      saveCursorPosition();
      handleContentChange();
    }
  };

  const handleSave = async () => {
    if (!contentRef.current || !hasChanges) {
      console.log('Save skipped - no changes or no content ref');
      return;
    }
    
    // Save cursor position BEFORE any save operations
    saveCursorPosition();
    
    // Get the currently focused element before save
    const activeElement = document.activeElement;
    const wasEditing = activeElement && (
      activeElement === contentRef.current || 
      contentRef.current.contains(activeElement)
    );
    
    try {
      const editedHtml = contentRef.current.innerHTML;
      console.log('Saving edited HTML, length:', editedHtml.length);
      
      // Use original structure if available, otherwise extract from HTML
      let documentStructure = originalStructureRef.current;
      
      if (!documentStructure && originalStructure) {
        // Deep clone the original structure to preserve formatting
        documentStructure = JSON.parse(JSON.stringify(originalStructure));
      }
      
      if (!documentStructure) {
        // Fallback: Extract from HTML (loses formatting)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = editedHtml;
        
        const paragraphs = [];
        const paragraphElements = tempDiv.querySelectorAll('p');
        paragraphElements.forEach(p => {
          const text = p.innerText || p.textContent || '';
          if (text.trim()) {
            paragraphs.push({ text: text.trim() });
          }
        });
        
        const tables = [];
        const tableElements = tempDiv.querySelectorAll('table');
        tableElements.forEach((table, tableIdx) => {
          const tableData = {
            id: `table_${tableIdx}`,
            rows: []
          };
          
          const rows = table.querySelectorAll('tr');
          rows.forEach((row, rowIdx) => {
            const rowData = {
              id: `row_${tableIdx}_${rowIdx}`,
              cells: []
            };
            
            const cells = row.querySelectorAll('td, th');
            cells.forEach((cell, cellIdx) => {
              // Clone cell to avoid modifying original
              const cellClone = cell.cloneNode(true);
              // Remove highlight spans to get clean text
              const highlightSpans = cellClone.querySelectorAll('.highlight-pending');
              highlightSpans.forEach(span => {
                const parent = span.parentNode;
                if (parent) {
                  parent.replaceChild(document.createTextNode(span.textContent), span);
                  parent.normalize();
                }
              });
              const cellText = (cellClone.innerText || cellClone.textContent || '').trim();
              rowData.cells.push({
                id: `cell_${tableIdx}_${rowIdx}_${cellIdx}`,
                text: cellText,
                row: rowIdx,
                col: cellIdx
              });
            });
            
            tableData.rows.push(rowData);
          });
          
          if (tableData.rows.length > 0) {
            tables.push(tableData);
          }
        });
        
        documentStructure = { paragraphs, tables };
      } else {
        // Update only the cell values from edited HTML, preserving structure
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = editedHtml;
        
        // Update table cell values from HTML while preserving original structure
        if (documentStructure.tables) {
          const htmlTables = tempDiv.querySelectorAll('table');
          htmlTables.forEach((htmlTable, tableIdx) => {
            if (documentStructure.tables[tableIdx]) {
              const originalTable = documentStructure.tables[tableIdx];
              
              // Preserve table name, id, and column_headers from original structure
              // Do NOT update these fields - they should remain unchanged
              const preservedTableName = originalTable.name;
              const preservedTableId = originalTable.id;
              const preservedColumnHeaders = originalTable.column_headers;
              
              const htmlRows = htmlTable.querySelectorAll('tr');
              
              htmlRows.forEach((htmlRow, rowIdx) => {
                if (originalTable.rows[rowIdx]) {
                  const originalRow = originalTable.rows[rowIdx];
                  const htmlCells = htmlRow.querySelectorAll('td, th');
                  
                  htmlCells.forEach((htmlCell, cellIdx) => {
                    if (originalRow.cells[cellIdx]) {
                      // Get the actual text content from the cell
                      // Use textContent which gets all text including inside spans
                      // This captures edited values even if they're inside highlight spans
                      let newText = '';
                      
                      // First try to get text directly from the cell
                      if (htmlCell.textContent) {
                        newText = htmlCell.textContent.trim();
                      } else if (htmlCell.innerText) {
                        newText = htmlCell.innerText.trim();
                      } else {
                        // Fallback: clone and remove spans
                        const cellClone = htmlCell.cloneNode(true);
                        const highlightSpans = cellClone.querySelectorAll('.highlight-pending');
                        highlightSpans.forEach(span => {
                          const parent = span.parentNode;
                          if (parent) {
                            parent.replaceChild(document.createTextNode(span.textContent), span);
                            parent.normalize();
                          }
                        });
                        newText = (cellClone.textContent || cellClone.innerText || '').trim();
                      }
                      
                      const oldText = originalRow.cells[cellIdx].text;
                      if (oldText !== newText) {
                        console.log(`Updating cell [${tableIdx}][${rowIdx}][${cellIdx}]: "${oldText}" -> "${newText}"`);
                        originalRow.cells[cellIdx].text = newText;
                      }
                    }
                  });
                }
              });
              
              // Explicitly preserve table name, id, and column_headers
              originalTable.name = preservedTableName;
              originalTable.id = preservedTableId;
              if (preservedColumnHeaders) {
                originalTable.column_headers = preservedColumnHeaders;
              }
            }
          });
        }
        
        // Update paragraph values from HTML while preserving structure
        if (documentStructure.paragraphs) {
          const htmlParagraphs = tempDiv.querySelectorAll('p');
          htmlParagraphs.forEach((htmlPara, paraIdx) => {
            if (documentStructure.paragraphs[paraIdx]) {
              // Get the actual text content from the paragraph
              // Use textContent which gets all text including inside spans
              let newText = '';
              
              if (htmlPara.textContent) {
                newText = htmlPara.textContent.trim();
              } else if (htmlPara.innerText) {
                newText = htmlPara.innerText.trim();
              } else {
                // Fallback: clone and remove spans
                const paraClone = htmlPara.cloneNode(true);
                const highlightSpans = paraClone.querySelectorAll('.highlight-pending');
                highlightSpans.forEach(span => {
                  const parent = span.parentNode;
                  if (parent) {
                    parent.replaceChild(document.createTextNode(span.textContent), span);
                    parent.normalize();
                  }
                });
                newText = (paraClone.textContent || paraClone.innerText || '').trim();
              }
              
              const oldText = documentStructure.paragraphs[paraIdx].text;
              if (oldText !== newText) {
                console.log(`Updating paragraph [${paraIdx}]: "${oldText}" -> "${newText}"`);
                documentStructure.paragraphs[paraIdx].text = newText;
              }
            }
          });
        }
      }
      
      // Save using the structured update endpoint
      const formData = new FormData();
      formData.append('structure', JSON.stringify(documentStructure));
      
      console.log('Saving document structure:', {
        tables: documentStructure.tables?.length || 0,
        paragraphs: documentStructure.paragraphs?.length || 0
      });
      
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/update`, {
        method: 'PUT',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save document');
      }
      
      const responseData = await response.json();
      console.log('Save response:', responseData);
      
      // Update original structure if returned from backend
      if (responseData.document_structure) {
        originalStructureRef.current = JSON.parse(JSON.stringify(responseData.document_structure));
        console.log('Updated original structure from save response');
      }
      
      // Capture the current edited text from the element being edited
      if (lastEditedElementRef.current && lastEditedElementRef.current.isConnected) {
        const editedText = (lastEditedElementRef.current.textContent || lastEditedElementRef.current.innerText || '').trim();
        if (editedText && savedSelectionRef.current) {
          // Update saved selection with the edited text (for better matching after reload)
          savedSelectionRef.current.editedText = editedText;
          if (!savedSelectionRef.current.originalText) {
            savedSelectionRef.current.originalText = savedSelectionRef.current.textContent;
          }
          // Also update the cell ID if we have it
          const cellId = lastEditedElementRef.current.getAttribute('data-cell-id');
          if (cellId && !savedSelectionRef.current.cellId) {
            savedSelectionRef.current.cellId = cellId;
          }
        }
      } else if (wasEditing && activeElement && activeElement !== contentRef.current) {
        // If we lost track of the element, try to get it from activeElement
        const cellId = activeElement.getAttribute('data-cell-id');
        if (cellId && savedSelectionRef.current) {
          savedSelectionRef.current.cellId = cellId;
          const editedText = (activeElement.textContent || activeElement.innerText || '').trim();
          if (editedText) {
            savedSelectionRef.current.editedText = editedText;
          }
        }
      }
      
      // Update original content reference - we'll reload to get fresh content
      setHasChanges(false);
      
      if (onSave) {
        onSave();
      }
      
      // Reload document to get updated content
      // Use a small delay to ensure file system has written the changes
      setTimeout(async () => {
        // Clear any existing restoration timeouts
        if (contentRef.current && contentRef.current._restoreTimeout) {
          clearTimeout(contentRef.current._restoreTimeout);
        }
        
        await loadDocument();
        
        // Restore cursor position after reload - wait for DOM to be ready
        // Use multiple attempts to ensure restoration works
        const attemptRestore = (attempt = 1, maxAttempts = 5) => {
          if (attempt > maxAttempts) {
            console.warn('Failed to restore cursor after', maxAttempts, 'attempts');
            // At least restore scroll position
            if (savedScrollPositionRef.current && contentRef.current) {
              contentRef.current.scrollTop = savedScrollPositionRef.current.top;
              contentRef.current.scrollLeft = savedScrollPositionRef.current.left;
            }
            return;
          }
          
          // Check if contentRef is still available
          if (!contentRef.current) {
            console.warn('Content ref no longer available, stopping restoration attempts');
            return;
          }
          
          const targetFound = restoreCursorPosition();
          if (!targetFound && attempt < maxAttempts && contentRef.current) {
            // Try again after a delay
            contentRef.current._restoreTimeout = setTimeout(() => {
              attemptRestore(attempt + 1, maxAttempts);
            }, 200 * attempt); // Increasing delay
          }
        };
        
        // Start restoration attempts - only if contentRef is available
        if (contentRef.current) {
          contentRef.current._restoreTimeout = setTimeout(() => {
            attemptRestore(1, 5);
          }, 300);
        }
      }, 300);
    } catch (error) {
      console.error('Error saving document:', error);
      alert(`Failed to save: ${error.response?.data?.detail || error.message}`);
    }
  };

  return (
    <div className="document-viewer-container">
      <div className="viewer-header">
        <h3>📄 Word Document Editor</h3>
        <div className="viewer-actions">
          {!isLocked && hasChanges && (
            <button 
              onClick={handleSave}
              className="save-viewer-button"
            >
              💾 Save Changes
            </button>
          )}
          {!isLocked && (
            <span className="edit-status">
              {isEditing ? '✏️ Editing' : '🔓 Checked Out'}
            </span>
          )}
          {isLocked && (
            <span className="lock-status-badge">🔒 Checked In</span>
          )}
        </div>
      </div>
      
      {loading && (
        <div className="viewer-loading">
          <p>Loading document...</p>
        </div>
      )}
      
      {error && (
        <div className="viewer-error">
          <p>{error}</p>
        </div>
      )}
      
      {!loading && !error && htmlContent && (
        <div 
          ref={contentRef}
          className={`word-document-content ${!isLocked ? 'editable-content' : ''}`}
          contentEditable={!isLocked}
          suppressContentEditableWarning={true}
          onInput={handleContentChange}
          onBlur={handleBlur}
          onKeyUp={(e) => {
            // Save cursor position on arrow key movements (for better tracking)
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
              setTimeout(() => saveCursorPosition(), 50);
            }
          }}
          onClick={(e) => {
            // When clicking on a highlighted missing value, select all text for easy editing
            if (!isLocked) {
              const target = e.target;
              // Find the actual cell or element
              let element = target;
              if (target.tagName !== 'TD' && target.tagName !== 'TH' && target.tagName !== 'P') {
                element = target.closest('td, th, p');
              }
              
              if (element && (element.classList.contains('highlight-pending') || 
                  element.querySelector('.highlight-pending') ||
                  element.classList.contains('recently-edited'))) {
                // Save cursor position when clicking
                setTimeout(() => saveCursorPosition(), 50);
                
                // Select all text in the element for easy replacement if it's a missing value
                const hasHighlight = element.classList.contains('highlight-pending') || element.querySelector('.highlight-pending');
                if (hasHighlight) {
                  setTimeout(() => {
                    const range = document.createRange();
                    range.selectNodeContents(element);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                    // Save position after selection
                    saveCursorPosition();
                  }, 10);
                }
              } else if (element) {
                // Save cursor position for any click
                setTimeout(() => saveCursorPosition(), 50);
              }
            }
          }}
          onFocus={(e) => {
            // Save cursor position when focus enters the editor
            if (!isLocked) {
              setTimeout(() => saveCursorPosition(), 100);
            }
          }}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      )}
    </div>
  );
};

export default DocumentViewer;

