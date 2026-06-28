import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('initial MariaDB migration', () => {
  it('defines normalized submission, emoji, and presenter session tables', async () => {
    const sql = await readFile(new URL('../../../migrations/001_initial.sql', import.meta.url), 'utf8');

    for (const table of [
      'submissions',
      'submission_answers',
      'emoji_options',
      'submission_emojis',
      'presenter_sessions',
    ]) {
      expect(sql).toMatch(new RegExp(`CREATE TABLE ${table}`, 'i'));
    }
    expect(sql).toMatch(/participant_token_hash\s+CHAR\(64\).*UNIQUE/is);
    expect(sql).toMatch(/FOREIGN KEY.*submission_id/is);
    expect(sql).toContain("('angry', '😡', 'โกรธ', 8)");
  });
});
