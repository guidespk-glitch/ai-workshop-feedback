import React, { useState, useRef, useEffect } from 'react';

interface SecretPresenterAccessProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SecretPresenterAccess: React.FC<SecretPresenterAccessProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setLoading(false);
      // Auto focus the PIN input when modal opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 6) {
      setError('รหัสผ่าน (PIN) ต้องมีอย่างน้อย 6 หลัก');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/presenter/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin, // browsers include this automatically
        },
        body: JSON.stringify({ pin }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.error || 'รหัสผ่าน (PIN) ไม่ถูกต้อง');
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="secret-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="secret-title">
      <div className="secret-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="secret-modal-close" onClick={onClose} aria-label="ปิด">
          ✕
        </button>
        <h2 id="secret-title" className="secret-modal-title">เข้าสู่ระบบผู้นำเสนอ</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="pin-input">กรอกรหัสผ่าน (PIN)</label>
            <input
              id="pin-input"
              ref={inputRef}
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              maxLength={12}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="secret-modal-error" role="alert">{error}</p>}
          <button
            type="submit"
            className="secret-modal-submit-btn btn-capsule"
            disabled={loading || pin.length < 6}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'ยืนยัน'}
          </button>
        </form>
      </div>
    </div>
  );
};

export function useSecretPresenterAccess() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const clickTimes = useRef<number[]>([]);

  const handleLogoClick = () => {
    const now = Date.now();
    // Keep only clicks within the last 3000ms
    clickTimes.current = clickTimes.current.filter((t) => now - t < 3000);
    clickTimes.current.push(now);

    if (clickTimes.current.length >= 5) {
      clickTimes.current = [];
      setIsModalOpen(true);
    }
  };

  return {
    isModalOpen,
    setIsModalOpen,
    handleLogoClick,
  };
}
