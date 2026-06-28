import React, { useState } from 'react';
import { EMOJI_IDS, type EmojiId } from '../../../../shared/emoji';

interface EmojiOption {
  id: EmojiId;
  emoji: string;
  label: string;
}

const EMOJI_OPTIONS: EmojiOption[] = [
  { id: 'love', emoji: '🥰', label: 'รัก' },
  { id: 'wow', emoji: '🤩', label: 'ว้าว' },
  { id: 'excited', emoji: '😃', label: 'ตื่นเต้น' },
  { id: 'fun', emoji: '😂', label: 'สนุกสนาน' },
  { id: 'okay', emoji: '😌', label: 'โอเค' },
  { id: 'bored', emoji: '😒', label: 'เบื่อ' },
  { id: 'dissatisfied', emoji: '🙁', label: 'ไม่ค่อยพอใจ' },
  { id: 'angry', emoji: '😡', label: 'โกรธ' },
];

interface EmojiPickerProps {
  selectedEmojis: EmojiId[];
  onChange: (emojis: EmojiId[]) => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ selectedEmojis, onChange }) => {
  const [notice, setNotice] = useState('');

  const handleSelect = (id: EmojiId) => {
    setNotice('');
    if (selectedEmojis.includes(id)) {
      onChange(selectedEmojis.filter((emoji) => emoji !== id));
    } else {
      if (selectedEmojis.length >= 2) {
        setNotice('เลือกได้เพียง 2 ความรู้สึกเท่านั้น โปรดยกเลิกความรู้สึกเดิมก่อน');
        // Clear notice after 3 seconds
        setTimeout(() => setNotice(''), 3000);
      } else {
        onChange([...selectedEmojis, id]);
      }
    }
  };

  return (
    <div className="question-card">
      <div className="question-header">
        <div className="question-number">2</div>
        <h2 className="question-title">
          เลือกความรู้สึกที่อธิบายความเป็นคุณในตอนนี้ (เลือก 2 แบบที่แตกต่างกัน)
        </h2>
      </div>

      <div className="emoji-grid">
        {EMOJI_OPTIONS.map(({ id, emoji, label }) => {
          const isSelected = selectedEmojis.includes(id);
          return (
            <button
              key={id}
              type="button"
              className={`emoji-option-btn ${isSelected ? 'selected' : ''}`}
              onClick={() => handleSelect(id)}
              aria-pressed={isSelected}
              aria-label={`${label} ${isSelected ? 'เลือกอยู่' : ''}`}
            >
              <span className="emoji-graphic">{emoji}</span>
              <span className="emoji-label">{label}</span>
              {isSelected && <span className="emoji-check" aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
      {notice && (
        <div className="emoji-notice-bubble" role="status">
          {notice}
        </div>
      )}
    </div>
  );
};
