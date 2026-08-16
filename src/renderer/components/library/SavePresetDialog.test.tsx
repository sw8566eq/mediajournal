// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SavePresetDialog } from './SavePresetDialog';

afterEach(() => {
  cleanup();
});

// Smoke coverage for the refactor to a thin TextPromptDialog wrapper (see
// TextPromptDialog.test.tsx for the underlying behavior - re-seeding, Enter/Escape, disabled-until
// non-empty, etc.) - just confirming this wrapper's own external contract (open/onSave/onCancel,
// no initialValue - a preset always starts blank) still holds.
describe('SavePresetDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<SavePresetDialog open={false} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the preset-specific title and an empty field when open', () => {
    render(<SavePresetDialog open onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Save current filters as a preset')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('calls onSave with the trimmed name', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SavePresetDialog open onSave={onSave} onCancel={vi.fn()} />);
    await user.type(screen.getByRole('textbox'), '  My Preset  ');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith('My Preset');
  });
});
