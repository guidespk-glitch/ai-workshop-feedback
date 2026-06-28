import { describe, expect, it } from 'vitest';
import { createSubmissionSchema } from './schemas';

describe('createSubmissionSchema', () => {
  it('accepts exactly three trimmed answers and two distinct emoji IDs', () => {
    const result = createSubmissionSchema.parse({
      answers: [' AI ', 'สร้างสรรค์', 'นำไปใช้'],
      emojis: ['wow', 'fun'],
    });

    expect(result.answers).toEqual(['AI', 'สร้างสรรค์', 'นำไปใช้']);
    expect(result.emojis).toEqual(['wow', 'fun']);
  });

  it.each([
    { answers: ['', 'สอง', 'สาม'], emojis: ['wow', 'fun'] },
    { answers: ['หนึ่ง', 'สอง'], emojis: ['wow', 'fun'] },
    { answers: ['หนึ่ง', 'สอง', 'สาม'], emojis: ['wow', 'wow'] },
    { answers: ['หนึ่ง', 'สอง', 'สาม'], emojis: ['wow', 'unknown'] },
    { answers: ['x'.repeat(41), 'สอง', 'สาม'], emojis: ['wow', 'fun'] },
  ])('rejects an invalid payload: %#', (payload) => {
    expect(() => createSubmissionSchema.parse(payload)).toThrow();
  });
});
