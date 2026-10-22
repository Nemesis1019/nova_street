import { fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { render } from '../../test/render';
import { OtpInput } from './otp-input';

function Controlled({ onComplete }: { onComplete?: (value: string) => void }) {
  const [value, setValue] = useState('');
  return <OtpInput value={value} onChange={setValue} onComplete={onComplete} label="Código" />;
}

describe('OtpInput', () => {
  it('renders six boxes and a separator between the groups', () => {
    render(<Controlled />);

    expect(screen.getAllByRole('textbox')).toHaveLength(6);
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('accepts digits and calls onComplete when the code is filled', () => {
    const onComplete = vi.fn();
    render(<Controlled onComplete={onComplete} />);
    const boxes = screen.getAllByRole('textbox');

    ['1', '2', '3', '4', '5', '6'].forEach((digit, index) => {
      fireEvent.change(boxes[index], { target: { value: digit } });
    });

    expect((boxes[5] as HTMLInputElement).value).toBe('6');
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('moves focus to the next box while typing (regresión de auto-advance)', () => {
    render(<Controlled />);
    const boxes = screen.getAllByRole('textbox') as HTMLInputElement[];

    boxes[0].focus();
    fireEvent.change(boxes[0], { target: { value: '1' } });
    expect(document.activeElement).toBe(boxes[1]);

    fireEvent.change(boxes[1], { target: { value: '2' } });
    expect(boxes[0].value).toBe('1');
    expect(boxes[1].value).toBe('2');
    expect(document.activeElement).toBe(boxes[2]);
  });

  it('fills all boxes when a full code is pasted', () => {
    render(<Controlled />);
    const boxes = screen.getAllByRole('textbox');

    fireEvent.paste(boxes[0], { clipboardData: { getData: () => '12 34-56' } });

    expect((boxes[0] as HTMLInputElement).value).toBe('1');
    expect((boxes[5] as HTMLInputElement).value).toBe('6');
  });

  it('removes the last digit on backspace', () => {
    render(<Controlled />);
    const boxes = screen.getAllByRole('textbox');

    fireEvent.paste(boxes[0], { clipboardData: { getData: () => '123' } });
    fireEvent.keyDown(boxes[3], { key: 'Backspace' });

    expect((boxes[1] as HTMLInputElement).value).toBe('2');
    expect((boxes[2] as HTMLInputElement).value).toBe('');
    expect((boxes[3] as HTMLInputElement).value).toBe('');
  });
});
