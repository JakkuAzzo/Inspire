import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { RelevanceSlider } from '../RelevanceSlider';
import type { RelevanceFilter } from '../../types';

describe('RelevanceSlider', () => {
  const baseFilter: RelevanceFilter = { timeframe: 'fresh', tone: 'funny', semantic: 'tight' };

  test('highlights the active chips and forwards selection changes', () => {
    const onChange = vi.fn();
    const ControlledSlider = () => {
      const [filter, setFilter] = useState(baseFilter);
      return <RelevanceSlider value={filter} onChange={(next) => { setFilter(next); onChange(next); }} />;
    };

    render(<ControlledSlider />);

    expect(screen.getByText('Fresh').closest('button')).toHaveClass('active');
    expect(screen.getByText('Playful').closest('button')).toHaveClass('active');
    expect(screen.getByText('Tight').closest('button')).toHaveClass('active');

    fireEvent.click(screen.getByText('Recent'));
    expect(onChange).toHaveBeenLastCalledWith({ ...baseFilter, timeframe: 'recent' });

    fireEvent.click(screen.getByText('Dark'));
    expect(onChange).toHaveBeenLastCalledWith({ ...baseFilter, timeframe: 'recent', tone: 'dark' });

    fireEvent.click(screen.getByText('Wild'));
    expect(onChange).toHaveBeenLastCalledWith({ ...baseFilter, timeframe: 'recent', tone: 'dark', semantic: 'wild' });
  });
});
