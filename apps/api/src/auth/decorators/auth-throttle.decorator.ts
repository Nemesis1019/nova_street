import { Throttle } from '@nestjs/throttler';

/**
 * Límite para endpoints sensibles de auth (anti fuerza bruta).
 * En producción: 10 req/min. En desarrollo: 60 req/min para no bloquear pruebas manuales.
 */
export function AuthThrottle() {
  const isProduction = process.env.NODE_ENV === 'production';
  return Throttle({ default: { limit: isProduction ? 10 : 60, ttl: 60_000 } });
}
