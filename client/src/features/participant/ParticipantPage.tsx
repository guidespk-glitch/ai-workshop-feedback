import React, { useState, useEffect } from 'react';
import { BrandHeader } from '../../components/BrandHeader';
import { StatusBanner } from '../../components/StatusBanner';
import { SecretPresenterAccess, useSecretPresenterAccess } from '../../components/SecretPresenterAccess';
import { AnswerFields } from './AnswerFields';
import { EmojiPicker } from './EmojiPicker';
import { submitFeedback } from './api';
import type { EmojiId } from '../../../../shared/emoji';

export const ParticipantPage: React.FC = () => {
  const [answers, setAnswers] = useState<[string, string, string]>(['', '', '']);
  const [selectedEmojis, setSelectedEmojis] = useState<EmojiId[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [offline, setOffline] = useState(!navigator.onLine);

  // Hidden presenter access hook
  const { isModalOpen, setIsModalOpen, handleLogoClick } = useSecretPresenterAccess();

  // Load from sessionStorage on mount
  useEffect(() => {
    const isSubmitted = sessionStorage.getItem('workshop_submitted') === 'true';
    if (isSubmitted) {
      setSubmitted(true);
      return;
    }

    const savedAnswers = sessionStorage.getItem('workshop_answers');
    const savedEmojis = sessionStorage.getItem('workshop_emojis');

    if (savedAnswers) {
      try {
        setAnswers(JSON.parse(savedAnswers));
      } catch {
        // ignore
      }
    }
    if (savedEmojis) {
      try {
        setSelectedEmojis(JSON.parse(savedEmojis));
      } catch {
        // ignore
      }
    }
  }, []);

  // Save to sessionStorage when values change
  useEffect(() => {
    if (!submitted) {
      sessionStorage.setItem('workshop_answers', JSON.stringify(answers));
    }
  }, [answers, submitted]);

  useEffect(() => {
    if (!submitted) {
      sessionStorage.setItem('workshop_emojis', JSON.stringify(selectedEmojis));
    }
  }, [selectedEmojis, submitted]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers] as [string, string, string];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  // Validate form
  const isAnswersValid = answers.every((ans) => {
    const trimmed = ans.trim();
    // Must be 1-40 chars and not contain only punctuation/spaces
    if (trimmed.length < 1 || trimmed.length > 40) return false;
    // Check if it's only punctuation
    const onlyPunc = /^[\p{P}\s]+$/u.test(trimmed);
    return !onlyPunc;
  });

  const isEmojisValid = selectedEmojis.length === 2 && selectedEmojis[0] !== selectedEmojis[1];
  const isFormValid = isAnswersValid && isEmojisValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const trimmedAnswers = answers.map((ans) => ans.trim()) as [string, string, string];
      await submitFeedback({
        answers: trimmedAnswers,
        emojis: selectedEmojis as [EmojiId, EmojiId],
      });

      setSubmitted(true);
      sessionStorage.setItem('workshop_submitted', 'true');
      sessionStorage.removeItem('workshop_answers');
      sessionStorage.removeItem('workshop_emojis');
    } catch (err: any) {
      if (err.status === 409) {
        setSubmitted(true);
        sessionStorage.setItem('workshop_submitted', 'true');
      } else if (!navigator.onLine) {
        setErrorMsg('ไม่สามารถเชื่อมต่อเครือข่ายได้ ระบบบันทึกคำตอบไว้ชั่วคราวแล้ว โปรดกดส่งใหม่อีกครั้ง');
      } else {
        setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการส่งคำตอบ โปรดลองอีกครั้ง');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="participant-page-container">
        <BrandHeader onLogoClick={handleLogoClick} />
        <main className="content-container animate-fade-in">
          <div className="question-card thank-you-card">
            <div className="thank-you-icon">🥰🎉</div>
            <h2 className="thank-you-title">ส่งคำตอบเรียบร้อยแล้ว!</h2>
            <p className="thank-you-subtitle">
              ขอบพระคุณสำหรับข้อมูลและความคิดเห็นอันมีค่าของท่านในการอบรมครั้งนี้
            </p>
          </div>
        </main>
        <SecretPresenterAccess
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            window.location.href = '/presenter';
          }}
        />
      </div>
    );
  }

  return (
    <div className="participant-page-container">
      <BrandHeader onLogoClick={handleLogoClick} />
      <main className="content-container">
        {offline && (
          <StatusBanner
            type="warning"
            message="ไม่มีสัญญาณอินเทอร์เน็ต กำลังทำงานในโหมดออฟไลน์ ระบบได้บันทึกคำตอบของคุณไว้เพื่อรอส่งใหม่"
          />
        )}
        {errorMsg && (
          <StatusBanner
            type="error"
            message={errorMsg}
            onRetry={isFormValid ? handleSubmit as any : undefined}
          />
        )}

        <form onSubmit={handleSubmit} className="participant-form">
          <AnswerFields answers={answers} onChange={handleAnswerChange} />
          <EmojiPicker selectedEmojis={selectedEmojis} onChange={setSelectedEmojis} />

          <button
            type="submit"
            className="submit-feedback-btn btn-capsule"
            disabled={!isFormValid || submitting}
          >
            {submitting ? (
              'กำลังส่งคำตอบ...'
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="currentColor"
                  style={{ transform: 'rotate(-30deg) translateY(-2px)' }}
                  aria-hidden="true"
                >
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
                ส่งคำตอบ
              </>
            )}
          </button>
        </form>
      </main>

      <SecretPresenterAccess
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          window.location.href = '/presenter';
        }}
      />
    </div>
  );
};
