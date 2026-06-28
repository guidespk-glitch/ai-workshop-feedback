import type { ResultsSnapshot } from '../../../../shared/results';

export async function getPresenterSession(): Promise<{ authenticated: boolean }> {
  const response = await fetch('/api/presenter/session');
  if (!response.ok) {
    throw new Error('Failed to fetch session');
  }
  return response.json();
}

export async function getPresenterResults(): Promise<ResultsSnapshot> {
  const response = await fetch('/api/presenter/results');
  if (!response.ok) {
    if (response.status === 401) {
      const err = new Error('Unauthorized');
      (err as any).status = 401;
      throw err;
    }
    throw new Error('Failed to fetch results');
  }
  return response.json();
}

export async function logoutPresenter(): Promise<void> {
  const response = await fetch('/api/presenter/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to logout');
  }
}
