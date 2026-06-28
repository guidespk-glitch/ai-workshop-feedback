import React from 'react';

interface BrandHeaderProps {
  onLogoClick?: () => void;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({ onLogoClick }) => {
  return (
    <header className="brand-header">
      <img
        src="/brand/ipst-logo.svg"
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
    </header>
  );
};
