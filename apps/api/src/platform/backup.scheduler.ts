import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { PlatformService } from './platform.service';

/**
 * Backups programados de todos los clientes activos.
 *
 * Se activa con `BACKUP_SCHEDULER_ENABLED=true` (por defecto solo en
 * producción) y corre cada `BACKUP_INTERVAL_HOURS` (24 por defecto). En
 * despliegues con varias instancias de la API, habilitarlo en una sola.
 */
@Injectable()
export class BackupScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackupScheduler.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly platform: PlatformService) {}

  onModuleInit(): void {
    const enabled =
      (process.env.BACKUP_SCHEDULER_ENABLED ??
        (process.env.NODE_ENV === 'production' ? 'true' : 'false')) === 'true';
    if (!enabled || process.env.NODE_ENV === 'test') return;

    const hours = Math.max(1, Number(process.env.BACKUP_INTERVAL_HOURS ?? 24));
    this.timer = setInterval(() => void this.run(), hours * 60 * 60 * 1_000);
    this.logger.log(`Backups programados cada ${hours}h`);
  }

  /** Ejecuta el respaldo de todos los clientes (también usable desde tests/CLI). */
  async run(): Promise<void> {
    if (this.running) {
      this.logger.warn('Backup programado omitido: la ejecución anterior sigue en curso');
      return;
    }

    this.running = true;
    try {
      const results = await this.platform.backupAll();
      const failed = results.filter((result) => !result.ok);
      this.logger.log(
        `Backups programados: ${results.length - failed.length}/${results.length} ok` +
          (failed.length > 0 ? ` — fallaron: ${failed.map((result) => result.slug).join(', ')}` : ''),
      );
    } catch (error) {
      this.logger.error(`Backups programados fallaron: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
