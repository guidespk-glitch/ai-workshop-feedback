import { describe, expect, it, vi } from 'vitest';
import type { CreateSubmissionInput } from '../../../shared/schemas';
import { SubmissionService } from './submissionService';

const validSubmission: CreateSubmissionInput = {
  answers: ['AI', 'สร้างสรรค์', 'นำไปใช้'],
  emojis: ['wow', 'fun'],
};

describe('SubmissionService', () => {
  it('hashes the participant token before creating a submission', async () => {
    const repository = { create: vi.fn().mockResolvedValue({ id: 7 }) };
    const service = new SubmissionService(repository);

    await expect(service.submit('participant-secret', validSubmission)).resolves.toEqual({ id: 7 });
    expect(repository.create).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-f0-9]{64}$/),
      validSubmission,
    );
    expect(repository.create.mock.calls[0][0]).not.toContain('participant-secret');
  });

  it('rejects an empty participant token before accessing storage', async () => {
    const repository = { create: vi.fn() };
    const service = new SubmissionService(repository);

    await expect(service.submit('', validSubmission)).rejects.toThrow('participant token');
    expect(repository.create).not.toHaveBeenCalled();
  });
});
