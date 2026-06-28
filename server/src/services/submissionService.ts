import { createHash } from 'node:crypto';
import type { CreateSubmissionInput } from '../../../shared/schemas';

export interface SubmissionWriter {
  create(tokenHash: string, input: CreateSubmissionInput): Promise<{ id: number }>;
}

export class SubmissionService {
  constructor(private readonly repository: SubmissionWriter) {}

  async submit(participantToken: string, input: CreateSubmissionInput): Promise<{ id: number }> {
    if (!participantToken) throw new Error('participant token is required');
    const tokenHash = createHash('sha256').update(participantToken).digest('hex');
    return this.repository.create(tokenHash, input);
  }

  async clearAllSubmissions(): Promise<void> {
    if ((this.repository as any).clearAll) {
      await (this.repository as any).clearAll();
    }
  }
}
