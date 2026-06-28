import { describe, expect, it, vi } from 'vitest';
import type { CreateSubmissionInput } from '../../../shared/schemas';
import { SubmissionRepository } from './submissionRepository';

const input: CreateSubmissionInput = {
  answers: ['AI', 'สร้างสรรค์', 'นำไปใช้'],
  emojis: ['wow', 'fun'],
};

function createDatabaseDouble(failAtExecute?: number) {
  const events: string[] = [];
  let executeCount = 0;
  const connection = {
    beginTransaction: vi.fn(async () => {
      events.push('begin');
      return undefined;
    }),
    execute: vi.fn(async (sql: string, values?: any) => {
      executeCount += 1;
      events.push(`execute:${executeCount}`);
      if (executeCount === failAtExecute) throw new Error('database write failed');
      return (executeCount === 1 ? [{ insertId: 42 }] : [[]]) as any;
    }),
    commit: vi.fn(async () => {
      events.push('commit');
      return undefined;
    }),
    rollback: vi.fn(async () => {
      events.push('rollback');
      return undefined;
    }),
    release: vi.fn(() => {
      events.push('release');
      return undefined;
    }),
  };
  const pool = {
    getConnection: vi.fn(async () => connection as any),
    execute: vi.fn(async (sql: string, values?: any) => [[]] as any),
  };
  return { pool, connection, events };
}

describe('SubmissionRepository.create', () => {
  it('writes the submission, three answers, and two emoji rows atomically', async () => {
    const database = createDatabaseDouble();
    const repository = new SubmissionRepository(database.pool);

    await expect(repository.create('a'.repeat(64), input)).resolves.toEqual({ id: 42 });
    expect(database.events).toEqual(['begin', 'execute:1', 'execute:2', 'execute:3', 'commit', 'release']);
    expect(database.connection.execute.mock.calls[1][1]).toEqual([
      42, 1, 'AI', 42, 2, 'สร้างสรรค์', 42, 3, 'นำไปใช้',
    ]);
    expect(database.connection.execute.mock.calls[2][1]).toEqual([42, 'wow', 42, 'fun']);
  });

  it('rolls back and releases the connection after a failed write', async () => {
    const database = createDatabaseDouble(2);
    const repository = new SubmissionRepository(database.pool);

    await expect(repository.create('a'.repeat(64), input)).rejects.toThrow('database write failed');
    expect(database.events).toEqual(['begin', 'execute:1', 'execute:2', 'rollback', 'release']);
    expect(database.connection.commit).not.toHaveBeenCalled();
  });
});
