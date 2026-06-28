import React from 'react';

interface BrandHeaderProps {
  onLogoClick?: () => void;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({ onLogoClick }) => {
  return (
    <header className="brand-header">
      <img
        src="/brand/ipst-logo.png"
        alt="โลโก้ สสวท."
        className="brand-logo"
        onClick={onLogoClick}
        style={{ cursor: onLogoClick ? 'pointer' : 'default' }}
        data-testid="brand-logo"
      />
      <h1 className="brand-title">แบบสอบถามความรู้สึกหลังอบรม</h1>
      <p className="brand-training-name">
        การอบรมเชิงปฏิบัติการ บูรณาการ AI อย่างสร้างสรรค์สู่การเรียนรู้ในห้องเรียน (สสวท. x ศธจ.มหาสารคาม)
      </p>
      <div className="brand-time-badge">
        <span>⏱️ ใช้เวลาไม่เกิน 1 นาที</span>
      </div>
      <div className="header-star-container">
        <svg viewBox="0 0 100 100" width="70" height="70" className="header-star-svg" aria-hidden="true">
          <defs>
            <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffd43b" />
              <stop offset="100%" stopColor="#f59f00" />
            </linearGradient>
          </defs>
          <path d="M50 5 L63 36 L96 36 L70 56 L80 88 L50 68 L20 88 L30 56 L4 36 L37 36 Z" fill="url(#starGrad)" stroke="#e9ecef" strokeWidth="2" />
          <circle cx="40" cy="48" r="3" fill="#212529" />
          <circle cx="60" cy="48" r="3" fill="#212529" />
          <path d="M46 54 Q50 58 54 54" fill="none" stroke="#212529" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    </header>
  );
};
