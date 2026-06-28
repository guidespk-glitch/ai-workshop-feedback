import React from 'react';

interface AnswerFieldsProps {
  answers: [string, string, string];
  onChange: (index: number, value: string) => void;
}

export const AnswerFields: React.FC<AnswerFieldsProps> = ({ answers, onChange }) => {
  return (
    <div className="question-card">
      <div className="question-header">
        <div className="question-number">1</div>
        <h2 className="question-title">
          ระบุคำที่ท่านคิดถึงเป็นอันดับแรกเกี่ยวกับ AI บูรณาการในห้องเรียน (กรอก 3 คำ)
        </h2>
      </div>
      <p className="question-subtitle">
        โปรดระบุคำตอบสั้นๆ 1 - 40 ตัวอักษร (ห้ามเว้นว่าง หรือกรอกเฉพาะเครื่องหมายวรรคตอน)
      </p>
      
      <div className="answer-inputs-container">
        {[0, 1, 2].map((idx) => (
          <div className="input-group" key={idx}>
            <label htmlFor={`answer-${idx}`}>คำที่ {idx + 1}</label>
            <input
              id={`answer-${idx}`}
              type="text"
              value={answers[idx]}
              onChange={(e) => onChange(idx, e.target.value)}
              placeholder={`เช่น คำตอบที่ ${idx + 1}`}
              maxLength={40}
              className="answer-input"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
