import { fireEvent, render, screen } from '@testing-library/react';
import { FocusModeOverlay } from '../FocusModeOverlay';

describe('FocusModeOverlay', () => {
  test('renders content when open and supports closing interactions', () => {
    const onClose = vi.fn();
    render(
      <FocusModeOverlay isOpen title="Word Explorer" onClose={onClose} ariaLabel="focus mode">
        <p>Exploration content</p>
      </FocusModeOverlay>
    );

    expect(screen.getByRole('dialog', { name: 'focus mode' })).toBeInTheDocument();
    expect(screen.getByText('Word Explorer')).toBeInTheDocument();
    expect(screen.getByText('Exploration content')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Close focus mode'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('closes on Escape and backdrop click', () => {
    const onClose = vi.fn();
    render(
      <FocusModeOverlay isOpen onClose={onClose}>
        <p>Focusable content</p>
      </FocusModeOverlay>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
