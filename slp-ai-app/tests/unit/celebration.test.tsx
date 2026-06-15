import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { Celebration } from '@/features/celebration/Celebration';

afterEach(cleanup);

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes('reduce') ? reduce : false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe('Celebration — reduced motion', () => {
  it('renders the static climax pose (no Remotion player) when motion is reduced', async () => {
    mockReducedMotion(true);
    render(<Celebration kind="garden" emoji="⭐" />);
    // The reward emoji is shown in the static pose…
    expect(await screen.findByText('⭐')).toBeTruthy();
    // …and no Remotion player/canvas is mounted.
    await waitFor(() => {
      expect(document.querySelector('canvas')).toBeNull();
    });
  });

  it('always shows the emoji on first paint (static-by-default, never blocks)', () => {
    mockReducedMotion(false);
    // Before effects flip motion on, the safe static pose paints immediately.
    render(<Celebration kind="arena" emoji="⚡" soundColor="#22d3ee" />);
    expect(screen.getByText('⚡')).toBeTruthy();
  });
});
