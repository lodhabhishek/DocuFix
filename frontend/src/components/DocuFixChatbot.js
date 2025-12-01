import React, { useState, useEffect, useRef } from 'react';
import { sendChatMessage, getGapSuggestions, executeEditCommand, submitViaChat, getAuditSummary, exportApprovedData } from '../services/api';
import './DocuFixChatbot.css';

const DocuFixChatbot = ({ documentId, currentGaps, onGapHighlight, onEditConfirm, onWorkflowUpdate, onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const messagesEndRef = useRef(null);
  const isLoadingHistoryRef = useRef(false);

  // Notify parent when chatbot state changes and update body class for layout control
  useEffect(() => {
    // Update body class to control layout
    if (isOpen) {
      document.body.classList.add('chatbot-open');
    } else {
      document.body.classList.remove('chatbot-open');
    }
    
    // Call callback if provided
    if (onToggle) {
      onToggle(isOpen);
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('chatbot-open');
    };
  }, [isOpen, onToggle]);

  // Load chat history from localStorage when documentId changes
  useEffect(() => {
    if (documentId) {
      loadChatHistory();
    } else {
      // Clear messages if no documentId
      setMessages([]);
      setChatHistory([]);
    }
  }, [documentId]);

  // Save messages to localStorage whenever they change (but not when loading)
  useEffect(() => {
    if (documentId && messages.length > 0 && !isLoadingHistoryRef.current) {
      saveChatToHistory();
    }
  }, [messages, documentId]);

  // Load chat history from localStorage
  const loadChatHistory = () => {
    isLoadingHistoryRef.current = true;
    try {
      const historyKey = `docufix_chat_history_${documentId}`;
      const savedHistory = localStorage.getItem(historyKey);
      if (savedHistory) {
        const history = JSON.parse(savedHistory);
        setChatHistory(history);
        
        // Load the most recent conversation if it exists
        if (history.length > 0 && history[0].messages && history[0].messages.length > 0) {
          const recentChat = history[0];
          const restoredMessages = recentChat.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(restoredMessages);
        } else {
          // Initialize with welcome message if no history
          initializeWelcomeMessage();
        }
      } else {
        initializeWelcomeMessage();
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      initializeWelcomeMessage();
    } finally {
      // Reset loading flag after a short delay to allow state updates
      setTimeout(() => {
        isLoadingHistoryRef.current = false;
      }, 100);
    }
  };

  // Save current chat to history
  const saveChatToHistory = () => {
    try {
      if (messages.length === 0) return;
      
      const historyKey = `docufix_chat_history_${documentId}`;
      let history = [];
      
      const savedHistory = localStorage.getItem(historyKey);
      if (savedHistory) {
        history = JSON.parse(savedHistory);
      }
      
      // Convert messages to serializable format
      const serializedMessages = messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp
      }));
      
      // Check if this is a continuation of the last session (within 1 hour)
      const now = new Date();
      let updatedExisting = false;
      
      if (history.length > 0) {
        const lastSession = history[0];
        const lastMessageTime = new Date(lastSession.lastMessageTime || lastSession.timestamp);
        const timeDiff = now - lastMessageTime;
        
        // If last message was within 1 hour, update existing session
        if (timeDiff < 60 * 60 * 1000) {
          lastSession.messages = serializedMessages;
          lastSession.lastMessageTime = now.toISOString();
          updatedExisting = true;
        }
      }
      
      // Create new session if needed
      if (!updatedExisting) {
        const newSession = {
          id: Date.now(),
          timestamp: now.toISOString(),
          lastMessageTime: now.toISOString(),
          messageCount: serializedMessages.length,
          messages: serializedMessages,
          documentId: documentId
        };
        history.unshift(newSession);
        
        // Keep only last 10 sessions
        if (history.length > 10) {
          history = history.slice(0, 10);
        }
      }
      
      localStorage.setItem(historyKey, JSON.stringify(history));
      setChatHistory(history);
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  // Initialize with welcome message
  const initializeWelcomeMessage = () => {
    const welcomeMsg = {
      id: Date.now(),
      type: 'ai',
      content: '👋 Hi! I\'m DocuFix AI. I can help you with:\n• Detecting and fixing gaps\n• Editing documents via natural language\n• Managing workflow transitions\n• Summarizing audit trails\n• Viewing chat history\n\nHow can I help you today?',
      timestamp: new Date()
    };
    setMessages([welcomeMsg]);
  };

  // Initialize with welcome message on open
  useEffect(() => {
    if (isOpen && messages.length === 0 && !documentId) {
      initializeWelcomeMessage();
    }
  }, [isOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-detect gaps when document is loaded
  useEffect(() => {
    if (documentId && currentGaps && currentGaps.total_gaps > 0 && isOpen) {
      const gapMessage = generateGapDetectionMessage(currentGaps);
      if (!messages.some(m => m.type === 'gap-detection')) {
        setMessages(prev => [...prev, gapMessage]);
      }
    }
  }, [documentId, currentGaps, isOpen]);

  const generateGapDetectionMessage = (gaps) => {
    const gapList = [];
    
    if (gaps.materials && gaps.materials.length > 0) {
      gaps.materials.forEach((gap, idx) => {
        gapList.push(`• Missing Catalog Number for material "${gap.name || 'N/A'}" in Section ${gap.section || 'N/A'}`);
      });
    }
    
    if (gaps.equipment && gaps.equipment.length > 0) {
      gaps.equipment.forEach((gap, idx) => {
        gapList.push(`• Invalid Configuration for equipment "${gap.name || 'N/A'}" (currently: ${gap.configuration || 'None'})`);
      });
    }
    
    if (gaps.table_cells && gaps.table_cells.length > 0) {
      gaps.table_cells.forEach((gap, idx) => {
        gapList.push(`• Empty/Pending value in ${gap.table_name || 'table'} - Row ${gap.row || 'N/A'}, Column ${gap.column || 'N/A'}`);
      });
    }

    const gapText = gapList.length > 0 
      ? `🔍 I found ${gaps.total_gaps} gap(s) in your document:\n\n${gapList.join('\n')}\n\nWould you like me to suggest fixes?`
      : `✅ No gaps detected in your document!`;

    return {
      id: Date.now(),
      type: 'gap-detection',
      content: gapText,
      timestamp: new Date(),
      hasSuggestions: gapList.length > 0
    };
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Check for commands
      const lowerInput = inputValue.toLowerCase();

      if (lowerInput.includes('suggest') || lowerInput.includes('fix') || lowerInput.includes('fill')) {
        await handleSuggestFixes();
      } else if (lowerInput.includes('submit') || lowerInput.includes('review')) {
        await handleWorkflowCommand(inputValue);
      } else if (lowerInput.includes('summary') || lowerInput.includes('audit') || lowerInput.includes('history') || lowerInput.includes('activity')) {
        await handleAuditSummary();
      } else if (lowerInput.includes('edit') || lowerInput.includes('change') || lowerInput.includes('update') || lowerInput.includes('fill in')) {
        await handleEditCommand(inputValue);
      } else if (lowerInput.includes('export') || lowerInput.includes('download') || lowerInput.includes('json') || lowerInput.includes('reuse')) {
        await handleExportData();
      } else if (lowerInput.includes('gap') && (lowerInput.includes('detect') || lowerInput.includes('show') || lowerInput.includes('find'))) {
        // Auto-detect gaps if not already shown
        if (currentGaps && currentGaps.total_gaps > 0) {
          const gapMessage = generateGapDetectionMessage(currentGaps);
          if (!messages.some(m => m.type === 'gap-detection' && m.id === gapMessage.id)) {
            setMessages(prev => [...prev, gapMessage]);
          }
        } else {
          addAIMessage('✅ No gaps detected in your document!');
        }
      } else {
        // General chat
        const response = await sendChatMessage({ message: inputValue, document_id: documentId });
        addAIMessage(response.data.response || response.data.message || 'I understand. How can I help you further?');
      }
    } catch (error) {
      addAIMessage(`Sorry, I encountered an error: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestFixes = async () => {
    try {
      const response = await getGapSuggestions(documentId);
      const suggestions = response.data;
      
      setSuggestions(suggestions);
      
      let suggestionText = '💡 Here are my suggestions to fix the gaps:\n\n';
      
      if (suggestions.materials) {
        suggestions.materials.forEach(sug => {
          suggestionText += `• Material "${sug.name}": Use Supplier Code "${sug.suggested_catalog_number}"\n`;
        });
      }
      
      if (suggestions.equipment) {
        suggestions.equipment.forEach(sug => {
          suggestionText += `• Equipment "${sug.name}": Update Configuration to "${sug.suggested_configuration}"\n`;
        });
      }

      suggestionText += '\nWould you like me to apply these fixes?';
      
      addAIMessage(suggestionText);
    } catch (error) {
      addAIMessage(`Sorry, I couldn't generate suggestions: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleEditCommand = async (command) => {
    try {
      const response = await executeEditCommand(documentId, command);
      const result = response.data;
      
      let message = result.message || 'Edit completed successfully.';
      if (result.changes) {
        message += `\n\nChanges made:\n${result.changes.map(c => `• ${c}`).join('\n')}`;
      }
      
      addAIMessage(message);
      
      if (onEditConfirm) {
        onEditConfirm(result);
      }
    } catch (error) {
      addAIMessage(`Sorry, I couldn't execute that edit: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleWorkflowCommand = async (command) => {
    try {
      const response = await submitViaChat(documentId, command);
      const result = response.data;
      
      let message = result.message || 'Workflow action completed.';
      if (result.status) {
        message += `\n\nDocument status: ${result.status}`;
      }
      if (result.reviewer) {
        message += `\nRouting to: ${result.reviewer}`;
      }
      if (result.expected_completion) {
        message += `\nExpected completion: ${result.expected_completion}`;
      }
      
      addAIMessage(message);
      
      if (onWorkflowUpdate) {
        onWorkflowUpdate(result);
      }
    } catch (error) {
      addAIMessage(`Sorry, I couldn't process that workflow command: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleAuditSummary = async () => {
    try {
      const response = await getAuditSummary(documentId);
      const summary = response.data;
      
      let summaryText = '📊 Audit Trail Summary:\n\n';
      summaryText += summary.summary || '';
      
      if (!summary.summary) {
        summaryText += `• ${summary.gaps_filled || 0} gaps filled\n`;
        summaryText += `• ${summary.rejections || 0} rejections\n`;
        summaryText += `• Current status: ${summary.current_status || 'N/A'}\n`;
        
        if (summary.recent_changes && summary.recent_changes.length > 0) {
          summaryText += '\nRecent changes:\n';
          summary.recent_changes.forEach(change => {
            summaryText += `• ${change}\n`;
          });
        }
      }
      
      addAIMessage(summaryText);
    } catch (error) {
      addAIMessage(`Sorry, I couldn't generate the audit summary: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleExportData = async () => {
    try {
      const response = await exportApprovedData(documentId);
      const exportData = response.data;
      
      let exportText = exportData.message || '✅ Data export generated successfully!\n\n';
      
      if (exportData.data) {
        exportText += `📦 Export Details:\n`;
        exportText += `• Total Records: ${exportData.data.total_records || 0}\n`;
        exportText += `• Section ID: ${exportData.data.section_id || 'N/A'}\n`;
        
        if (exportData.data.supplier_records && exportData.data.supplier_records.length > 0) {
          exportText += `\nSupplier Records:\n`;
          exportData.data.supplier_records.slice(0, 3).forEach(record => {
            exportText += `• ${record.supplier_code}: ${record.name}\n`;
          });
        }
        
        if (exportData.data.linked_documents && exportData.data.linked_documents.length > 0) {
          exportText += `\nLinked Documents: ${exportData.data.linked_documents.length} related compliance documents\n`;
        }
        
        exportText += `\n💾 JSON file ready for download. Click the download button to export.`;
      }
      
      addAIMessage(exportText, 'export', exportData.data);
    } catch (error) {
      addAIMessage(`Sorry, I couldn't export the data: ${error.response?.data?.detail || error.message}`);
    }
  };

  const addAIMessage = (content, messageType = 'ai', exportData = null) => {
    const aiMessage = {
      id: Date.now(),
      type: messageType,
      content: content,
      timestamp: new Date(),
      exportData: exportData
    };
    setMessages(prev => [...prev, aiMessage]);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear this chat? The conversation will be removed from history.')) {
      isLoadingHistoryRef.current = true;
      
      // Clear current messages
      setMessages([]);
      setSuggestions(null);
      
      // Remove from history
      if (documentId) {
        try {
          const historyKey = `docufix_chat_history_${documentId}`;
          const savedHistory = localStorage.getItem(historyKey);
          if (savedHistory) {
            const history = JSON.parse(savedHistory);
            // Remove the most recent session
            if (history.length > 0) {
              history.shift();
              localStorage.setItem(historyKey, JSON.stringify(history));
              setChatHistory(history);
            } else {
              localStorage.removeItem(historyKey);
              setChatHistory([]);
            }
          }
        } catch (error) {
          console.error('Error clearing chat history:', error);
        }
      }
      
      // Initialize new welcome message
      setTimeout(() => {
        initializeWelcomeMessage();
        isLoadingHistoryRef.current = false;
      }, 100);
    }
  };

  const handleLoadHistorySession = (session) => {
    try {
      const restoredMessages = session.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      setMessages(restoredMessages);
      setShowHistory(false);
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error loading session:', error);
      addAIMessage('Sorry, I couldn\'t load that chat session.');
    }
  };

  const handleDeleteHistorySession = (sessionId) => {
    if (window.confirm('Are you sure you want to delete this chat session?')) {
      try {
        const historyKey = `docufix_chat_history_${documentId}`;
        const savedHistory = localStorage.getItem(historyKey);
        if (savedHistory) {
          let history = JSON.parse(savedHistory);
          history = history.filter(session => session.id !== sessionId);
          localStorage.setItem(historyKey, JSON.stringify(history));
          setChatHistory(history);
          
          // If deleted session was the current one, clear messages
          if (history.length === 0 || history[0].id !== sessionId) {
            initializeWelcomeMessage();
          }
        }
      } catch (error) {
        console.error('Error deleting session:', error);
      }
    }
  };

  return (
    <>
      {/* Chatbot Button */}
      {!isOpen && (
        <button 
          className="chatbot-toggle-btn"
          onClick={() => setIsOpen(true)}
          title="AI Mode - Ask DocuFix AI"
          aria-label="Open DocuFix AI Assistant"
        >
          <svg 
            className="chatbot-icon-svg" 
            viewBox="0 0 24 24" 
            fill="none"
          >
            {/* Detailed Robot Head with Headset - Minimalist */}
            {/* Head - rounded rectangle */}
            <rect x="4" y="3" width="16" height="15" rx="3" ry="3" fill="#9CA3AF"></rect>
            {/* Face band */}
            <rect x="4" y="5" width="16" height="6" rx="1" ry="1" fill="#374151"></rect>
            {/* Left eye */}
            <circle cx="9.5" cy="8" r="2" fill="#3B82F6"></circle>
            <circle cx="9.5" cy="8" r="0.8" fill="white"></circle>
            {/* Right eye */}
            <circle cx="14.5" cy="8" r="2" fill="#3B82F6"></circle>
            <circle cx="14.5" cy="8" r="0.8" fill="white"></circle>
            {/* Left antenna */}
            <line x1="6" y1="3" x2="6" y2="0.5" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"></line>
            <circle cx="6" cy="0.5" r="1" fill="#FCD34D"></circle>
            {/* Right antenna */}
            <line x1="18" y1="3" x2="18" y2="0.5" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"></line>
            <circle cx="18" cy="0.5" r="1" fill="#FCD34D"></circle>
            {/* Left headphone/ear */}
            <circle cx="2.5" cy="9" r="1.8" fill="#EF4444"></circle>
            {/* Right headphone/ear */}
            <circle cx="21.5" cy="9" r="1.8" fill="#EF4444"></circle>
            {/* Microphone arm - curved from right ear */}
            <path d="M21.5 9 Q23 10.5 22.5 12.5" stroke="#374151" strokeWidth="1.5" fill="none" strokeLinecap="round"></path>
            <ellipse cx="22.5" cy="13.5" rx="0.8" ry="1.2" fill="#F97316"></ellipse>
            {/* Neck */}
            <rect x="10.5" y="18" width="3" height="2" rx="0.5" fill="#9CA3AF"></rect>
            {/* Torso */}
            <rect x="4" y="20" width="16" height="4" rx="2" ry="2" fill="#9CA3AF"></rect>
            {/* Chest panel */}
            <rect x="9" y="21" width="6" height="2.5" rx="0.5" fill="#06B6D4"></rect>
            <line x1="9" y1="22" x2="15" y2="22" stroke="#0284C7" strokeWidth="0.8"></line>
            <line x1="9" y1="22.8" x2="15" y2="22.8" stroke="#0284C7" strokeWidth="0.8"></line>
          </svg>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-container">
          <div className="chatbot-header">
            <div className="chatbot-title">
              <span className="chatbot-icon">🤖</span>
              <span>DocuFix AI Assistant</span>
            </div>
            <div className="chatbot-header-actions">
              {documentId && (
                <>
                  <button 
                    className="chatbot-history-btn"
                    onClick={() => setShowHistory(!showHistory)}
                    title="Chat History"
                  >
                    📜
                  </button>
                  <button 
                    className="chatbot-clear-btn"
                    onClick={handleClearChat}
                    title="Clear Chat"
                  >
                    🗑️
                  </button>
                </>
              )}
            <button 
              className="chatbot-close-btn"
              onClick={() => setIsOpen(false)}
              title="Close"
            >
                ✕
              </button>
            </div>
          </div>

          {/* Chat History Panel */}
          {showHistory && documentId && (
            <div className="chat-history-panel">
              <div className="chat-history-header">
                <h4>📜 Chat History</h4>
                <button 
                  className="chat-history-close-btn"
                  onClick={() => setShowHistory(false)}
                >
                  ✕
                </button>
              </div>
              <div className="chat-history-list">
                {chatHistory.length === 0 ? (
                  <div className="no-history">
                    <p>No chat history yet.</p>
                    <p className="history-hint">Your conversations will be saved here.</p>
                  </div>
                ) : (
                  chatHistory.map((session) => (
                    <div key={session.id} className="history-session-item">
                      <div 
                        className="history-session-content"
                        onClick={() => handleLoadHistorySession(session)}
                      >
                        <div className="history-session-date">
                          {formatDate(session.timestamp)}
                        </div>
                        <div className="history-session-preview">
                          {session.messages && session.messages.length > 0 && (
                            <div className="history-preview-text">
                              {session.messages[0].content.substring(0, 60)}
                              {session.messages[0].content.length > 60 ? '...' : ''}
                            </div>
                          )}
                          <div className="history-session-meta">
                            {session.messageCount || (session.messages?.length || 0)} message{(session.messageCount || session.messages?.length || 0) !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <button 
                        className="history-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteHistorySession(session.id);
                        }}
                        title="Delete session"
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="chatbot-messages">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`chat-message ${message.type}`}
              >
                <div className="message-content">
                  <pre className="message-text">{message.content}</pre>
                  <span className="message-time">{formatTimestamp(message.timestamp)}</span>
                </div>
                {message.hasSuggestions && (
                  <button 
                    className="suggestion-btn"
                    onClick={handleSuggestFixes}
                  >
                    💡 Suggest Fixes
                  </button>
                )}
                {message.type === 'export' && message.exportData && (
                  <div className="export-actions">
                    <button 
                      className="export-btn"
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(message.exportData, null, 2)], { type: 'application/json' });
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `approved-data-${message.exportData.section_id || Date.now()}.json`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                        addAIMessage('✅ JSON file downloaded successfully!');
                      }}
                    >
                      📥 Download JSON
                    </button>
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="chat-message ai typing">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {suggestions && (
            <div className="suggestions-panel">
              <h4>💡 Suggested Fixes</h4>
              <div className="suggestions-list">
                {suggestions.materials && suggestions.materials.map((sug, idx) => (
                  <div key={idx} className="suggestion-item">
                    <span>{sug.name}: {sug.suggested_catalog_number}</span>
                    <button onClick={() => {/* Apply suggestion */}}>Apply</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form className="chatbot-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="chatbot-input"
              placeholder="Ask me anything about your document..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button type="submit" className="chatbot-send-btn">Send</button>
          </form>
        </div>
      )}
    </>
  );
};

export default DocuFixChatbot;

