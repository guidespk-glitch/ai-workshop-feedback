CREATE TABLE submissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  participant_token_hash CHAR(64) NOT NULL UNIQUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  schema_version SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE submission_answers (
  submission_id BIGINT UNSIGNED NOT NULL,
  answer_index TINYINT UNSIGNED NOT NULL,
  answer_text VARCHAR(40) NOT NULL,
  PRIMARY KEY (submission_id, answer_index),
  CONSTRAINT chk_answer_index CHECK (answer_index BETWEEN 1 AND 3),
  CONSTRAINT chk_answer_text CHECK (CHAR_LENGTH(TRIM(answer_text)) BETWEEN 1 AND 40),
  CONSTRAINT fk_answers_submission FOREIGN KEY (submission_id)
    REFERENCES submissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE emoji_options (
  id VARCHAR(20) NOT NULL,
  emoji VARCHAR(16) NOT NULL,
  label_th VARCHAR(40) NOT NULL,
  display_order TINYINT UNSIGNED NOT NULL UNIQUE,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO emoji_options (id, emoji, label_th, display_order) VALUES
  ('love', '🥰', 'รัก', 1),
  ('wow', '🤩', 'ว้าว', 2),
  ('excited', '😃', 'ตื่นเต้น', 3),
  ('fun', '😂', 'สนุกสนาน', 4),
  ('okay', '😌', 'โอเค', 5),
  ('bored', '😒', 'เบื่อ', 6),
  ('dissatisfied', '🙁', 'ไม่ค่อยพอใจ', 7),
  ('angry', '😡', 'โกรธ', 8);

CREATE TABLE submission_emojis (
  submission_id BIGINT UNSIGNED NOT NULL,
  emoji_id VARCHAR(20) NOT NULL,
  PRIMARY KEY (submission_id, emoji_id),
  CONSTRAINT fk_emojis_submission FOREIGN KEY (submission_id)
    REFERENCES submissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_emojis_option FOREIGN KEY (emoji_id)
    REFERENCES emoji_options(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE presenter_sessions (
  session_id VARCHAR(128) NOT NULL,
  expires INT UNSIGNED NOT NULL,
  data MEDIUMTEXT,
  PRIMARY KEY (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
