import { EventEmitter } from 'node:events';

import { Logger } from '@nestjs/common';
import Redis from 'ioredis';
import type { KeyvStoreAdapter, StoredData } from 'keyv';

import { getCurrentTenantSlug } from '../tenant/tenant-runtime';

/**
 * Store de caché sobre Redis para cache-manager v6 / Keyv.
 *
 * Nest envuelve el store en un `Keyv`, que serializa el valor (string JSON) y
 * nos pasa el TTL en milisegundos. `get` devuelve ese string crudo y Keyv lo
 * deserializa. Si Redis no está disponible, las operaciones degradan a no-op
 * (la app sigue funcionando contra la BD) en lugar de romper los requests.
 *
 * Las claves ya incluyen el prefijo del tenant (`t:<slug>:...`), armado en los
 * servicios (ver `CatalogService.cacheKey`). `clear()` borra solo las claves
 * del tenant actual.
 */
export class RedisCacheStore extends EventEmitter implements KeyvStoreAdapter {
  opts: Record<string, unknown> = {};
  namespace?: string;

  private readonly logger = new Logger(RedisCacheStore.name);
  private readonly client: Redis;
  private ready = false;
  private warned = false;

  constructor(url: string) {
    super();
    this.client = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 3_000,
      retryStrategy: (times) => Math.min(times * 1_000, 30_000),
    });

    this.client.on('ready', () => {
      this.ready = true;
      this.warned = false;
    });
    this.client.on('error', (error: Error) => {
      this.ready = false;
      if (!this.warned) {
        this.warned = true;
        this.logger.warn(`Redis no disponible (${error.message}); el caché usa la BD hasta reconectar.`);
      }
    });

    void this.client.connect().catch(() => undefined);
  }

  async get<Value>(key: string): Promise<StoredData<Value> | undefined> {
    if (!this.ready) return undefined;
    try {
      const value = await this.client.get(key);
      return (value ?? undefined) as StoredData<Value> | undefined;
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
    if (!this.ready) return false;
    const serialized =
      typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value);
    try {
      if (typeof ttl === 'number' && ttl > 0) {
        await this.client.set(key, serialized, 'PX', ttl);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.ready) return false;
    try {
      return (await this.client.del(key)) > 0;
    } catch {
      return false;
    }
  }

  /** Invalida las claves del tenant actual (`t:<slug>:*`). */
  async clear(): Promise<void> {
    if (!this.ready) return;
    const slug = getCurrentTenantSlug();
    const pattern = slug ? `t:${slug}:*` : '*';
    try {
      let cursor = '0';
      do {
        const [next, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
        cursor = next;
        if (keys.length > 0) await this.client.del(...keys);
      } while (cursor !== '0');
    } catch (error) {
      this.logger.warn(`No se pudo limpiar el caché: ${(error as Error).message}`);
    }
  }

  async has(key: string): Promise<boolean> {
    if (!this.ready) return false;
    try {
      return (await this.client.exists(key)) === 1;
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
