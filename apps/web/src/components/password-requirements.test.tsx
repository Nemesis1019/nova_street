import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PasswordMatchHint, PasswordRequirements } from './password-requirements';

describe('PasswordRequirements', () => {
  it('marca en vivo las reglas cumplidas y pendientes', () => {
    // "Abc1": cumple mayúscula, minúscula y número; falta el mínimo de 8.
    const { container } = render(<PasswordRequirements value="Abc1" />);

    expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
    expect(container.querySelectorAll('.tabler-icon-check')).toHaveLength(3);
    expect(container.querySelectorAll('.tabler-icon-x')).toHaveLength(1);
  });

  it('muestra todas cumplidas con una contraseña válida', () => {
    const { container } = render(<PasswordRequirements value="Abc12345" />);

    expect(container.querySelectorAll('.tabler-icon-x')).toHaveLength(0);
    expect(container.querySelectorAll('.tabler-icon-check')).toHaveLength(4);
  });

  it('no muestra la regla de longitud máxima', () => {
    render(<PasswordRequirements value="Abc12345" />);

    expect(screen.queryByText(/Máximo/i)).not.toBeInTheDocument();
  });

  it('con onlyPending oculta las reglas ya cumplidas', () => {
    render(<PasswordRequirements value="abc" onlyPending />);

    // Falta mayúscula, número y mínimo; minúscula ya está.
    expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Una mayúscula')).toBeInTheDocument();
    expect(screen.getByText('Un número')).toBeInTheDocument();
    expect(screen.queryByText('Una minúscula')).not.toBeInTheDocument();
  });
});

describe('PasswordMatchHint', () => {
  it('no se muestra mientras la confirmación está vacía', () => {
    const { container } = render(<PasswordMatchHint password="Abc12345" confirmValue="" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('indica cuando coinciden', () => {
    render(<PasswordMatchHint password="Abc12345" confirmValue="Abc12345" />);

    expect(screen.getByText('Las contraseñas coinciden')).toBeInTheDocument();
  });

  it('indica cuando no coinciden', () => {
    render(<PasswordMatchHint password="Abc12345" confirmValue="Abc1234" />);

    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
  });
});
