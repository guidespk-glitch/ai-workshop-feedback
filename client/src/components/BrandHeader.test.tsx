// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandHeader } from './BrandHeader';

describe('BrandHeader', () => {
  it('includes the approved learning-themed star and device decorations', () => {
    render(<BrandHeader />);

    const decorations = screen.getByTestId('learning-doodles');
    expect(decorations).toHaveAttribute('aria-hidden', 'true');
    expect(decorations.querySelectorAll('svg')).toHaveLength(2);
  });
});
