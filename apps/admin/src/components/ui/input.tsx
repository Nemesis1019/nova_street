import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

import { HelpTooltip } from './help-tooltip';
import { Icon } from './icon';

type ControlVariant = 'outline' | 'filled';

const CONTROL_BASE =
  'w-full rounded-lg font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 transition-colors';

const CONTROL_VARIANTS: Record<ControlVariant, string> = {
  /** Input de formularios: blanco con borde visible (como en el diseño). */
  outline: 'border border-outline/70 bg-surface-container-lowest focus:border-primary',
  /** Input de filtros/búsquedas: fondo tintado sin borde; al enfocar pasa a blanco (como en el diseño). */
  filled: 'bg-surface-container-low focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary',
};

const CONTROL_CLASS = `${CONTROL_BASE} ${CONTROL_VARIANTS.outline}`;

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: string;
  inputClassName?: string;
  variant?: ControlVariant;
}

export function Input({ icon, variant = 'outline', className = '', inputClassName = '', ...props }: InputProps) {
  const control = `${CONTROL_BASE} ${CONTROL_VARIANTS[variant]}`;
  if (!icon) {
    return <input className={`${control} px-3 py-2 ${inputClassName} ${className}`} {...props} />;
  }
  return (
    <div className={`relative flex items-center ${className}`}>
      <Icon name={icon} className="pointer-events-none absolute left-3 text-[18px] text-on-surface-variant" />
      <input className={`${control} py-2 pl-9 pr-3 ${inputClassName}`} {...props} />
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  inputClassName?: string;
}

export function Textarea({ className = '', inputClassName = '', ...props }: TextareaProps) {
  return <textarea className={`${CONTROL_CLASS} px-3 py-2 ${inputClassName} ${className}`} {...props} />;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  inputClassName?: string;
  icon?: string;
}

export function Select({ icon, className = '', inputClassName = '', children, ...props }: SelectProps) {
  return (
    <div className={`relative flex items-center ${className}`}>
      {icon && <Icon name={icon} className="pointer-events-none absolute left-3 text-[18px] text-on-surface-variant" />}
      <select
        className={`${CONTROL_CLASS} cursor-pointer appearance-none py-2 pr-8 ${icon ? 'pl-9' : 'pl-3'} ${inputClassName}`}
        {...props}
      >
        {children}
      </select>
      <Icon
        name="keyboard_arrow_down"
        className="pointer-events-none absolute right-2.5 text-[18px] text-on-surface-variant"
      />
    </div>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  /** Leyenda de ayuda que aparece al pasar el mouse o enfocar el icono "?". */
  tooltip?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, required, hint, tooltip, children, className = '' }: FieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="flex items-center gap-1.5 font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
        {label}
        {required && <span className="text-error">*</span>}
        {tooltip && <HelpTooltip text={tooltip} />}
      </label>
      {children}
      {hint && <span className="font-label-sm text-label-sm text-on-surface-variant/80">{hint}</span>}
    </div>
  );
}
