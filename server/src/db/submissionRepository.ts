import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { EmojiId } from '../../../shared/emoji';
import type { CreateSubmissionInput } from '../../../shared/schemas';
import type { AggregateSource } from '../services/resultsService';

export interface DatabaseConnection {
  beginTransaction(): Promise<unknown>;
  execute(sql: string, values?: any[]): Promise<any>;
  commit(): Promise<unknown>;
  rollback(): Promise<unknown>;
  release(): unknown;
}

export interface DatabasePool {
  getConnection(): Promise<DatabaseConnection>;
  execute(sql: string, values?: any[]): Promise<any>;
}

interface CountRow extends RowDataPacket {
  total: number;
}

interface AnswerRow extends RowDataPacket {
  answerText: string;
}

interface EmojiCountRow extends RowDataPacket {
  id: EmojiId;
  count: number;
}

export class SubmissionRepository {
  constructor(private readonly pool: DatabasePool) {}

  async create(tokenHash: string, input: CreateSubmissionInput): Promise<{ id: number }> {
    const connection = await this.pool.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const [submissionResult] = (await connection.execute(
        'INSERT INTO submissions (participant_token_hash) VALUES (?)',
        [tokenHash],
      )) as unknown as [ResultSetHeader];
      const submissionId = Number(submissionResult.insertId);

      await connection.execute(
        `INSERT INTO submission_answers (submission_id, answer_index, answer_text)
         VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)`,
        [
          submissionId,
          1,
          input.answers[0],
          submissionId,
          2,
          input.answers[1],
          submissionId,
          3,
          input.answers[2],
        ],
      );

      await connection.execute(
        `INSERT INTO submission_emojis (submission_id, emoji_id)
         VALUES (?, ?), (?, ?)`,
        [submissionId, input.emojis[0], submissionId, input.emojis[1]],
      );

      await connection.commit();
      return { id: submissionId };
    } catch (error) {
      if (transactionStarted) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getAggregateSource(): Promise<AggregateSource> {
    const [[countRow], answerRows, emojiRows] = await Promise.all([
      this.pool.execute('SELECT COUNT(*) AS total FROM submissions'),
      this.pool.execute('SELECT answer_text AS answerText FROM submission_answers ORDER BY submission_id, answer_index'),
      this.pool.execute(`SELECT emoji_id AS id, COUNT(*) AS count
                         FROM submission_emojis GROUP BY emoji_id`),
    ]);

    return {
      totalSubmissions: Number((countRow as CountRow).total),
      answers: (answerRows[0] as AnswerRow[]).map((row) => row.answerText),
      emojiCounts: (emojiRows[0] as EmojiCountRow[]).map((row) => ({
        id: row.id,
        count: Number(row.count),
      })),
    };
  }

  async clearAll(): Promise<void> {
    await this.pool.execute('DELETE FROM submissions');
  }
}
