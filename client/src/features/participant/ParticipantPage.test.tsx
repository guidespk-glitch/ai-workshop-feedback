// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ParticipantPage } from './ParticipantPage';
import * as api from './api';

// Mock the API module
vi.mock('./api', () => ({
  submitFeedback: vi.fn(),
}));

describe('ParticipantPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    sessionStorage.clear();
  });

  it('enables submission only after three valid answers and two emoji selections', async () => {
    const user = userEvent.setup();
    render(<ParticipantPage />);

    const submitBtn = screen.getByRole('button', { name: 'ส่งคำตอบ' });
    expect(submitBtn).toBeDisabled();

    // Fill inputs
    const input1 = screen.getByLabelText('คำที่ 1');
    const input2 = screen.getByLabelText('คำที่ 2');
    const input3 = screen.getByLabelText('คำที่ 3');

    await user.type(input1, 'AI');
    await user.type(input2, 'สร้างสรรค์');
    await user.type(input3, 'นำไปใช้');

    expect(submitBtn).toBeDisabled(); // Emojis not selected yet

    // Select Emojis
    const loveEmoji = screen.getByRole('button', { name: /รัก/ });
    const wowEmoji = screen.getByRole('button', { name: /ว้าว/ });

    await user.click(loveEmoji);
    expect(submitBtn).toBeDisabled(); // Only 1 emoji selected

    await user.click(wowEmoji);
    expect(submitBtn).toBeEnabled(); // Form is now valid

    // Deselect one emoji
    await user.click(wowEmoji);
    expect(submitBtn).toBeDisabled(); // Back to 1 emoji
  });

  it('submits the form successfully and displays the thank you message', async () => {
    const user = userEvent.setup();
    vi.mocked(api.submitFeedback).mockResolvedValue({ success: true, id: 1 });

    render(<ParticipantPage />);

    // Fill the form
    await user.type(screen.getByLabelText('คำที่ 1'), 'AI');
    await user.type(screen.getByLabelText('คำที่ 2'), 'สร้างสรรค์');
    await user.type(screen.getByLabelText('คำที่ 3'), 'นำไปใช้');

    await user.click(screen.getByRole('button', { name: /รัก/ }));
    await user.click(screen.getByRole('button', { name: /ว้าว/ }));

    const submitBtn = screen.getByRole('button', { name: 'ส่งคำตอบ' });
    await user.click(submitBtn);

    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent('กำลังส่งคำตอบ...');

    await waitFor(() => {
      expect(screen.getByText('ส่งคำตอบเรียบร้อยแล้ว!')).toBeInTheDocument();
      expect(screen.getByText(/ขอบพระคุณสำหรับข้อมูล/)).toBeInTheDocument();
    });

    expect(api.submitFeedback).toHaveBeenCalledWith({
      answers: ['AI', 'สร้างสรรค์', 'นำไปใช้'],
      emojis: ['love', 'wow'],
    });
  });

  it('triggers PIN modal after clicking the logo 5 times within 3 seconds', async () => {
    const user = userEvent.setup();
    render(<ParticipantPage />);

    const logo = screen.getByTestId('brand-logo');

    // Clicking logo 4 times shouldn't trigger the modal
    for (let i = 0; i < 4; i++) {
      await user.click(logo);
    }
    expect(screen.queryByText('เข้าสู่ระบบผู้นำเสนอ')).not.toBeInTheDocument();

    // 5th click triggers it
    await user.click(logo);
    expect(screen.getByText('เข้าสู่ระบบผู้นำเสนอ')).toBeInTheDocument();
  });
});
