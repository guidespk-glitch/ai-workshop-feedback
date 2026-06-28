import { z } from 'zod';
import { EMOJI_IDS } from './emoji';

const answerSchema = z
  .string()
  .trim()
  .min(1, 'กรุณากรอกคำตอบให้ครบ')
  .max(40, 'คำตอบต้องไม่เกิน 40 ตัวอักษร')
  .refine((value) => /[\p{L}\p{N}]/u.test(value), 'คำตอบต้องมีตัวอักษรหรือตัวเลข');

const emojiSchema = z.enum(EMOJI_IDS);

export const createSubmissionSchema = z
  .object({
    answers: z.tuple([answerSchema, answerSchema, answerSchema]),
    emojis: z.tuple([emojiSchema, emojiSchema]),
  })
  .superRefine((value, context) => {
    if (value.emojis[0] === value.emojis[1]) {
      context.addIssue({
        code: 'custom',
        path: ['emojis'],
        message: 'เลือกความรู้สึก 2 แบบที่แตกต่างกัน',
      });
    }
  });

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
