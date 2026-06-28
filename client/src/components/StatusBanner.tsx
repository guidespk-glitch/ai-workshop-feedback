import React from 'react';

interface StatusBannerProps {
  type: 'error' | 'warning' | 'success' | 'info';
  message: string;
  onRetry?: () => void;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ type, message, onRetry }) => {
  if (!message) return null;

  return (
    <div className={`status-banner status-banner-${type}`} role="alert">
      <div className="status-banner-content">
        <span className="status-banner-icon">
          {type === 'error' && '⚠️'}
          {type === 'warning' && '📶'}
          {type === 'success' && '✅'}
          {type === 'info' && 'ℹ️'}
        </span>
        <span className="status-banner-text">{message}</span>
      </div>
      {onRetry && (
        <button type="button" className="status-banner-retry-btn" onClick={onRetry}>
          ลองใหม่
        </button>
      )}
    </div>
  );
};
