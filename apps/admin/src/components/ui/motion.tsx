'use client';

import {
  animate,
  motion,
  MotionConfig,
  type Transition,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Variants,
} from 'framer-motion';
import { ReactNode, useEffect } from 'react';

/** Curva y duración estándar del admin: rápida, sobria, sin rebotes. */
export const MOTION_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const MOTION_DURATION = 0.22;

/** Springs para elementos que se deslizan (indicadores activos, drawer). */
export const LAYOUT_SPRING: Transition = { type: 'spring', stiffness: 520, damping: 42, mass: 0.6 };
export const DRAWER_SPRING: Transition = { type: 'spring', stiffness: 420, damping: 40, mass: 0.8 };

/** Entrada estándar: aparece y sube 8px. */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: MOTION_DURATION, ease: MOTION_EASE } },
};

/** Contenedor para entradas escalonadas (KPIs, grids de cards, filas de tabla). */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

/** Contenedor para filas de tabla: escalonado más corto y sutil. */
export const tableRowsContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.02 } },
};

/** Dropdowns/popovers anclados: aparecen desde el trigger. */
export const popIn: Variants = {
  hidden: { opacity: 0, y: -4, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.16, ease: MOTION_EASE } },
  exit: { opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12, ease: MOTION_EASE } },
};

/** Respeta `prefers-reduced-motion` en todas las animaciones del admin. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

interface AnimatedNumberProps {
  value: number;
  /** Formateador del valor animado (ej. formatNumber o formatCurrency de la página). */
  format?: (value: number) => string;
  className?: string;
}

/** Número que cuenta desde el valor anterior hasta `value` (0.6s, sin saltos). */
export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const count = useMotionValue(reduceMotion ? value : 0);
  const text = useTransform(count, (latest) =>
    format ? format(latest) : String(Math.round(latest)),
  );

  useEffect(() => {
    if (reduceMotion) {
      count.jump(value);
      return;
    }
    const controls = animate(count, value, { duration: 0.6, ease: MOTION_EASE });
    return () => controls.stop();
  }, [value, count, reduceMotion]);

  return <motion.span className={className}>{text}</motion.span>;
}

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/** Aparece al entrar al viewport (una sola vez). Para pantallas largas. */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.3, ease: MOTION_EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
