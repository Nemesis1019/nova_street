import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private readonly configService: ConfigService) {}

  async runBackup(): Promise<{ filename: string; path: string }> {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not configured');
    }

    const backupDir = this.configService.get<string>('BACKUP_DIR') ?? './backups';
    await fs.mkdir(backupDir, { recursive: true });

    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sql.gz`;
    const filepath = `${backupDir}/${filename}`;

    await execAsync(`pg_dump --dbname="${databaseUrl}" | gzip > "${filepath}"`);

    await this.cleanupOldBackups(backupDir);

    this.logger.log(`Backup created: ${filepath}`);
    return { filename, path: filepath };
  }

  private async cleanupOldBackups(backupDir: string): Promise<void> {
    const retentionDays = Number(this.configService.get<string>('BACKUP_RETENTION_DAYS') ?? '7');
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const files = await fs.readdir(backupDir);
    for (const file of files) {
      if (!file.startsWith('backup-')) continue;
      const fullPath = `${backupDir}/${file}`;
      const stat = await fs.stat(fullPath);
      if (stat.mtimeMs < cutoff) {
        await fs.unlink(fullPath);
        this.logger.log(`Deleted old backup: ${fullPath}`);
      }
    }
  }
}
