import { CSSProperties } from 'react';

interface IconProps {
  /** Nombre del icono de Material Symbols (ej. "inventory_2") */
  name: string;
  className?: string;
  filled?: boolean;
  style?: CSSProperties;
}

export function Icon({ name, className = 'text-[20px]', filled = false, style }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined select-none ${filled ? 'is-filled' : ''} ${className}`}
      style={style}
    >
      {name}
    </span>
  );
}
