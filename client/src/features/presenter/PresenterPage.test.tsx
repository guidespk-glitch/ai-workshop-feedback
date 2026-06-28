// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PresenterPage } from './PresenterPage';
import type { ResultsSnapshot } from '../../../../shared/results';

// Mock react-router-dom useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock the API calls
vi.mock('./api', () => ({
  getPresenterSession: vi.fn(),
  getPresenterResults: vi.fn(),
  logoutPresenter: vi.fn(),
}));

// Mock the Socket module
vi.mock('./socket', () => ({
  connectResultsSocket: vi.fn(() => ({
    close: vi.fn(),
    on: vi.fn(),
  })),
}));

const sampleResults: ResultsSnapshot = {
  totalSubmissions: 20,
  words: [
    { key: 'ai', label: 'AI', count: 20 },
    { key: 'สร้างสรรค์', label: 'สร้างสรรค์', count: 5 },
  ],
  emojis: [
    { id: 'love', count: 2 },
    { id: 'wow', count: 20 },
    { id: 'excited', count: 10 },
    { id: 'fun', count: 8 },
    { id: 'okay', count: 4 },
    { id: 'bored', count: 1 },
    { id: 'dissatisfied', count: 0 },
    { id: 'angry', count: 0 },
  ],
  updatedAt: '2026-06-28T05:00:00Z',
};

describe('PresenterPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders larger words and emoji for higher counts', () => {
    render(<PresenterPage initialResults={sampleResults} socketState="connected" />);

    // Verify word cloud layout sizes
    const aiWord = screen.getByText('AI');
    expect(aiWord).toHaveStyle({ fontSize: '96px' }); // formula maps maxCount to 96px

    const creativeWord = screen.getByText('สร้างสรรค์');
    // count 5 of max 20 should be: 20 + 76 * sqrt(5 / 20) = 20 + 76 * 0.5 = 58px
    expect(creativeWord).toHaveStyle({ fontSize: '58px' });

    // Verify emoji rankings & data-rank attribute
    // Max count is 20 for 'wow'
    const wowEmojiRow = screen.getByLabelText('ว้าว 20 คน');
    expect(wowEmojiRow).toHaveAttribute('data-rank', '1');

    const excitedEmojiRow = screen.getByLabelText('ตื่นเต้น 10 คน');
    expect(excitedEmojiRow).toHaveAttribute('data-rank', '2');
  });

  it('keeps the latest results visible while reconnecting', () => {
    render(<PresenterPage initialResults={sampleResults} socketState="reconnecting" />);

    // Warning banner should be visible
    expect(screen.getByText(/กำลังพยายามเชื่อมต่อใหม่/i)).toBeInTheDocument();
    
    // Latest results should still be visible
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByLabelText('ว้าว 20 คน')).toBeInTheDocument();
  });
});
