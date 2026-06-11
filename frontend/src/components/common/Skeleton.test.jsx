// Skeleton.test.jsx · Iter 66 · §102.9 (component testing)

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SkeletonText, SkeletonCard, SkeletonTable } from './Skeleton';

describe('Skeleton components', () => {
  it('SkeletonText renders the expected number of lines', () => {
    const { container } = render(<SkeletonText lines={4} />);
    expect(container.querySelectorAll('div > div').length).toBe(4);
  });

  it('SkeletonCard renders multiple cards', () => {
    const { container } = render(<SkeletonCard count={3} />);
    expect(container.querySelectorAll('div > div').length).toBe(3);
  });

  it('SkeletonTable renders header + N rows × M cols', () => {
    const { container } = render(<SkeletonTable rows={3} cols={4} />);
    // 1 header row + 3 data rows = 4 grid rows · each with 4 cells
    const cells = container.querySelectorAll('div > div > div');
    expect(cells.length).toBe(16);
  });
});
