import React from 'react';
import './WarningDialog.css';

const WarningDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "⚠️ Warning", 
  message, 
  confirmText = "Continue", 
  cancelText = "Cancel",
  type = "warning" // warning, danger, info
}) => {
  if (!isOpen) return null;

  return (
    <div className="warning-dialog-overlay" onClick={onClose}>
      <div className="warning-dialog-container" onClick={(e) => e.stopPropagation()}>
        <div className={`warning-dialog-header ${type}`}>
          <div className="warning-dialog-icon">
            {type === 'warning' && '⚠️'}
            {type === 'danger' && '🚨'}
            {type === 'info' && 'ℹ️'}
          </div>
          <h3 className="warning-dialog-title">{title}</h3>
        </div>
        <div className="warning-dialog-body">
          <p className="warning-dialog-message">{message}</p>
        </div>
        <div className="warning-dialog-footer">
          <button 
            className="warning-dialog-button cancel-button" 
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button 
            className={`warning-dialog-button confirm-button ${type}`} 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WarningDialog;

