// Skeleton.test.jsx · Iter 28 · J9 closure · snapshot test for Skeleton + SkeletonRow.
// Vitest + React Testing Library. Run: npx vitest run

import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import Skeleton, { SkeletonRow } from '../Skeleton';

describe('Skeleton', () => {
  it('renders default skeleton with aria-hidden on box', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toBeInTheDocument();
    const ariaHiddenBoxes = container.querySelectorAll('[aria-hidden="true"]');
    expect(ariaHiddenBoxes.length).toBeGreaterThanOrEqual(1);
  });

  it('renders count={3} skeleton boxes', () => {
    const { container } = render(<Skeleton count={3} />);
    const ariaHiddenBoxes = container.querySelectorAll('[aria-hidden="true"]');
    expect(ariaHiddenBoxes.length).toBe(3);
  });

  it('matches snapshot for default props', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

describe('SkeletonRow', () => {
  it('renders role=status + aria-label', () => {
    const { container } = render(<SkeletonRow cols={4} rows={2} />);
    const status = container.querySelector('[role="status"]');
    expect(status).toBeInTheDocument();
    expect(status.getAttribute('aria-label')).toBe('Loading…');
  });

  it('renders cols * rows skeleton boxes', () => {
    const { container } = render(<SkeletonRow cols={4} rows={2} />);
    const ariaHiddenBoxes = container.querySelectorAll('[aria-hidden="true"]');
    expect(ariaHiddenBoxes.length).toBe(8);
  });

  it('matches snapshot for 5x3', () => {
    const { container } = render(<SkeletonRow cols={5} rows={3} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
