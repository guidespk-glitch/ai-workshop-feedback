import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WordCloudCard } from './WordCloudCard';
import { EmojiResultsCard } from './EmojiResultsCard';
import { getPresenterSession, getPresenterResults, logoutPresenter, resetPresenterData } from './api';
import { connectResultsSocket } from './socket';
import type { ResultsSnapshot } from '../../../../shared/results';

interface PresenterPageProps {
  initialResults?: ResultsSnapshot;
  socketState?: 'connected' | 'reconnecting' | 'disconnected';
}

export const PresenterPage: React.FC<PresenterPageProps> = ({
  initialResults,
  socketState: mockSocketState,
}) => {
  const [results, setResults] = useState<ResultsSnapshot | null>(initialResults || null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [connState, setConnState] = useState<'connected' | 'reconnecting' | 'disconnected'>(
    mockSocketState || 'connected'
  );
  const navigate = useNavigate();

  // Set document title
  useEffect(() => {
    document.title = 'หน้าจอผู้นำเสนอ | สสวท.';
  }, []);

  // Handle session check
  useEffect(() => {
    // Skip session check in testing environment if initialResults are supplied
    if (initialResults) {
      setSessionLoading(false);
      return;
    }

    getPresenterSession()
      .then((data) => {
        if (!data.authenticated) {
          navigate('/');
        } else {
          setSessionLoading(false);
          // Load initial results
          getPresenterResults()
            .then(setResults)
            .catch(() => {});
        }
      })
      .catch(() => {
        navigate('/');
      });
  }, [navigate, initialResults]);

  // Handle Socket.IO connection
  useEffect(() => {
    if (sessionLoading || initialResults) return;

    const socket = connectResultsSocket(
      (data) => {
        setResults(data);
      },
      (state) => {
        setConnState(state);
      }
    );

    // Sync results when reconnected
    socket.on('connect', () => {
      getPresenterResults()
        .then(setResults)
        .catch(() => {});
    });

    return () => {
      socket.close();
    };
  }, [sessionLoading, initialResults]);

  // Fail-safe fallback polling for non-websocket environments
  useEffect(() => {
    if (sessionLoading || initialResults) return;

    const interval = setInterval(() => {
      getPresenterResults()
        .then((data) => {
          setResults(data);
        })
        .catch(() => {});
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [sessionLoading, initialResults]);

  const handleLogout = async () => {
    try {
      await logoutPresenter();
      navigate('/');
    } catch {
      // Force navigation to home anyway
      navigate('/');
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm('คุณต้องการล้างข้อมูลคำตอบทั้งหมดใช่หรือไม่? การดำเนินการนี้จะลบข้อมูลออกจากฐานข้อมูลและรีเซ็ตการแสดงผลทั้งหมดทันที (ไม่สามารถกู้คืนได้)');
    if (!confirmed) return;

    try {
      await resetPresenterData();
      setResults({
        totalSubmissions: 0,
        words: [],
        emojis: [
          { id: 'love', count: 0 },
          { id: 'wow', count: 0 },
          { id: 'excited', count: 0 },
          { id: 'fun', count: 0 },
          { id: 'okay', count: 0 },
          { id: 'bored', count: 0 },
          { id: 'dissatisfied', count: 0 },
          { id: 'angry', count: 0 },
        ],
        updatedAt: new Date().toISOString(),
      });
      alert('ล้างข้อมูลเรียบร้อยแล้ว');
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการล้างข้อมูล');
    }
  };

  if (sessionLoading) {
    return (
      <div className="presenter-loading-screen">
        <div className="loading-spinner-circle"></div>
        <p>กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
      </div>
    );
  }

  // Fallback default snapshot if none is loaded yet
  const activeResults = results || {
    totalSubmissions: 0,
    words: [],
    emojis: [
      { id: 'love', count: 0 },
      { id: 'wow', count: 0 },
      { id: 'excited', count: 0 },
      { id: 'fun', count: 0 },
      { id: 'okay', count: 0 },
      { id: 'bored', count: 0 },
      { id: 'dissatisfied', count: 0 },
      { id: 'angry', count: 0 },
    ],
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="presenter-dashboard-layout">
      <header className="presenter-header">
        <div className="presenter-header-left">
          <img src="/brand/ipst-logo.png" alt="โลโก้ สสวท." className="presenter-logo" />
          <div>
            <h1 className="presenter-title">หน้าจอผู้นำเสนอ</h1>
            <p className="presenter-training">
              การอบรมเชิงปฏิบัติการ บูรณาการ AI อย่างสร้างสรรค์สู่การเรียนรู้ในห้องเรียน (สสวท. x ศธจ.มหาสารคาม)
            </p>
          </div>
        </div>

        <div className="presenter-header-right">
          {/* Socket Connection Status Indicator */}
          <div className={`connection-status status-${connState}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {connState === 'connected' && 'เชื่อมต่อเรียบร้อย'}
              {connState === 'reconnecting' && 'กำลังเชื่อมต่อใหม่'}
              {connState === 'disconnected' && 'ขาดการเชื่อมต่อ'}
            </span>
          </div>

          <button
            onClick={() => navigate('/report')}
            className="presenter-report-btn btn-capsule"
            style={{ marginRight: '8px' }}
          >
            📊 Report
          </button>

          <button onClick={handleReset} className="presenter-reset-btn btn-capsule" style={{ marginRight: '8px' }}>
            ล้างผลข้อมูล
          </button>
          <button onClick={handleLogout} className="presenter-logout-btn btn-capsule">
            ออกจากระบบ
          </button>
        </div>
        
        <div className="presenter-header-star">
          <svg viewBox="0 0 100 100" width="70" height="70" className="header-star-svg" aria-hidden="true">
            <defs>
              <linearGradient id="starGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffd43b" />
                <stop offset="100%" stopColor="#f59f00" />
              </linearGradient>
            </defs>
            <path d="M50 5 L63 36 L96 36 L70 56 L80 88 L50 68 L20 88 L30 56 L4 36 L37 36 Z" fill="url(#starGrad2)" stroke="#e9ecef" strokeWidth="2" />
            <circle cx="40" cy="48" r="3" fill="#212529" />
            <circle cx="60" cy="48" r="3" fill="#212529" />
            <path d="M46 54 Q50 58 54 54" fill="none" stroke="#212529" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      </header>

      {/* Reconnecting banner overlay */}
      {connState !== 'connected' && (
        <div className="connection-warning-banner" role="alert">
          ⚠️ การเชื่อมต่อกับเซิร์ฟเวอร์ขาดหาย กำลังพยายามเชื่อมต่อใหม่... (ยังคงแสดงผลล่าสุดไว้)
        </div>
      )}

      <div className="presenter-total-submissions-badge">
        จำนวนผู้ตอบแบบสอบถามทั้งหมด: <strong>{activeResults.totalSubmissions}</strong> คน
      </div>

      <main className="presenter-content-grid">
        <div className="word-cloud-section">
          <WordCloudCard words={activeResults.words} />
        </div>
        <div className="emoji-section">
          <EmojiResultsCard emojis={activeResults.emojis} />
        </div>
      </main>
    </div>
  );
};
export default PresenterPage;
