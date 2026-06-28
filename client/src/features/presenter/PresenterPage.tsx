import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WordCloudCard } from './WordCloudCard';
import { EmojiResultsCard } from './EmojiResultsCard';
import { getPresenterSession, getPresenterResults, logoutPresenter } from './api';
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

  const handleLogout = async () => {
    try {
      await logoutPresenter();
      navigate('/');
    } catch {
      // Force navigation to home anyway
      navigate('/');
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
          <img src="/brand/ipst-logo.svg" alt="โลโก้ สสวท." className="presenter-logo" />
          <div>
            <h1 className="presenter-title">หน้าจอผู้นำเสนอ (Presenter Dashboard)</h1>
            <p className="presenter-training">
              การอบรมเชิงปฏิบัติการ บูรณาการ AI อย่างสร้างสรรค์สู่การเรียนรู้ในห้องเรียน
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

          <button onClick={handleLogout} className="presenter-logout-btn btn-capsule">
            ออกจากระบบ
          </button>
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
