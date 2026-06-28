import type { CreateSubmissionInput } from '@shared/schemas';

export async function submitFeedback(input: CreateSubmissionInput): Promise<{ success: boolean; id: number }> {
  const response = await fetch('/api/submissions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let errorMessage = 'เกิดข้อผิดพลาดในการส่งข้อมูล';
    try {
      const errBody = await response.json();
      if (errBody && errBody.error) {
        errorMessage = errBody.error;
      }
    } catch {
      // ignore
    }
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}
