import { Icon } from './icon';

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  indeterminate?: boolean;
  label?: string;
  disabled?: boolean;
}

export function Checkbox({ checked, onChange, indeterminate = false, label, disabled = false }: CheckboxProps) {
  const active = checked || indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
        active ? 'border-primary bg-primary text-on-primary' : 'border-outline/70 bg-surface-container-lowest'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      {indeterminate ? (
        <span className="h-0.5 w-2 rounded bg-white" />
      ) : checked ? (
        <Icon name="check" className="text-[12px]" />
      ) : null}
    </button>
  );
}
