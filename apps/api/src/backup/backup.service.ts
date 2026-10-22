import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

import { getCurrentTenant } from '../tenant/tenant-runtime';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Respalda la BD del tenant actual (`getCurrentTenant()`); fuera de un
   * request usa `DATABASE_URL` como fallback (scripts/tests).
   * Los archivos quedan en `BACKUP_DIR/<slug>/<slug>-<fecha>.sql.gz`.
   */
  async runBackup(): Promise<{ tenant: string; filename: string; path: string }> {
    const tenant = getCurrentTenant();
    const databaseUrl = tenant?.databaseUrl ?? this.configService.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not configured');
    }

    const slug = tenant?.slug ?? 'default';
    const rootDir = this.configService.get<string>('BACKUP_DIR') ?? './backups';
    const backupDir = join(rootDir, slug);
    await fs.mkdir(backupDir, { recursive: true });

    const filename = `${slug}-${new Date().toISOString().replace(/[:.]/g, '-')}.sql.gz`;
    const filepath = join(backupDir, filename);

    // Los parámetros `?schema=public` de Prisma no son válidos para pg_dump.
    const url = new URL(databaseUrl);
    url.search = '';

    const container = this.configService.get<string>('BACKUP_DOCKER_CONTAINER');
    if (container) {
      // Dev/instalaciones sin pg_dump en el host: se ejecuta dentro del contenedor Postgres.
      url.hostname = 'localhost';
      url.port = '5432';
      await execAsync(`docker exec "${container}" pg_dump --dbname="${url.toString()}" | gzip > "${filepath}"`);
    } else {
      await execAsync(`pg_dump --dbname="${url.toString()}" | gzip > "${filepath}"`);
    }

    await this.cleanupOldBackups(backupDir);

    this.logger.log(`Backup created for tenant "${slug}": ${filepath}`);
    return { tenant: slug, filename, path: filepath };
  }

  private async cleanupOldBackups(backupDir: string): Promise<void> {
    const retentionDays = Number(this.configService.get<string>('BACKUP_RETENTION_DAYS') ?? '7');
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const files = await fs.readdir(backupDir);
    for (const file of files) {
      if (!file.endsWith('.sql.gz')) continue;
      const fullPath = join(backupDir, file);
      const stat = await fs.stat(fullPath);
      if (stat.mtimeMs < cutoff) {
        await fs.unlink(fullPath);
        this.logger.log(`Deleted old backup: ${fullPath}`);
      }
    }
  }
}
