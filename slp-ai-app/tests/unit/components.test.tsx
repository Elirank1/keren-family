import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { ensureSeeded } from '@/db/seed';
import ProfileSelection from '@/features/profile-selection/ProfileSelection';
import ParentUnlock from '@/features/parent/ParentUnlock';
import { AudioRecorder } from '@/components/AudioRecorder';
import { ModelPlayback } from '@/components/ModelPlayback';
import { RatingPicker, NIV_RATINGS } from '@/components/RatingPicker';
import { isParentUnlocked } from '@/features/parent/parentAuth';

beforeEach(async () => {
  await db.delete();
  await db.open();
  await ensureSeeded();
  sessionStorage.clear();
});

describe('ProfileSelection', () => {
  it('renders RTL with three profile choices and a parent entrance', () => {
    render(
      <MemoryRouter>
        <ProfileSelection />
      </MemoryRouter>,
    );
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('dir', 'rtl');
    expect(screen.getByTestId('select-lavi')).toBeInTheDocument();
    expect(screen.getByTestId('select-niv')).toBeInTheDocument();
    expect(screen.getByTestId('select-siblings')).toBeInTheDocument();
    expect(screen.getByTestId('open-parent')).toBeInTheDocument();
  });
});

describe('AudioRecorder', () => {
  it('shows a Hebrew unsupported message when MediaRecorder is unavailable', () => {
    // jsdom has neither getUserMedia nor MediaRecorder.
    render(<AudioRecorder promptType="word" onSave={() => {}} />);
    expect(screen.getByTestId('recorder-unsupported')).toBeInTheDocument();
  });
});

describe('ModelPlayback', () => {
  it('renders the "no example yet" fallback when no model audio exists', async () => {
    render(<ModelPlayback sound="s" promptType="word" wordId="s_sus" />);
    await waitFor(() =>
      expect(screen.getByTestId('model-audio-missing')).toBeInTheDocument(),
    );
    expect(screen.getByText('עוד לא הוקלטה דוגמה')).toBeInTheDocument();
  });
});

describe('Niv feedback rules', () => {
  it('never offers negative feedback words in ratings', () => {
    const banned = ['טעית', 'לא נכון', 'נכשלת'];
    for (const r of NIV_RATINGS) {
      for (const b of banned) expect(r.label).not.toContain(b);
    }
  });

  it('rating selection toggles aria-checked', () => {
    const onChange = vi.fn();
    render(<RatingPicker options={NIV_RATINGS} value="participated" onChange={onChange} theme="garden" />);
    const participated = screen.getByTestId('rating-participated');
    expect(participated).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByTestId('rating-imitated'));
    expect(onChange).toHaveBeenCalledWith('imitated');
  });
});

describe('ParentUnlock', () => {
  it('rejects a wrong PIN and does not unlock', async () => {
    render(
      <MemoryRouter initialEntries={['/parent/unlock']}>
        <ParentUnlock />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByTestId('pin-input'), { target: { value: '0000' } });
    fireEvent.click(screen.getByTestId('pin-submit'));
    await waitFor(() => expect(screen.getByTestId('pin-error')).toBeInTheDocument());
    expect(isParentUnlocked()).toBe(false);
  });

  it('accepts the correct default PIN and unlocks', async () => {
    render(
      <MemoryRouter initialEntries={['/parent/unlock']}>
        <ParentUnlock />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByTestId('pin-input'), { target: { value: '2468' } });
    fireEvent.click(screen.getByTestId('pin-submit'));
    await waitFor(() => expect(isParentUnlocked()).toBe(true));
  });
});
