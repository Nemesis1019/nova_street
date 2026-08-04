import Redis from 'ioredis';

const CATALOG_PREFIX = 'catalog:';

export class RedisCacheStore {
  private readonly client: Redis;

  constructor(url: string) {
    this.client = new Redis(url, { lazyConnect: true });
  }

  async get<T>(key: string): Promise<T | undefined> {
    const value = await this.client.get(key);
    if (value === null || value === undefined) {
      return undefined;
    }
    return value as unknown as T;
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttl !== undefined && ttl > 0) {
      await this.client.set(key, serialized, 'PX', ttl);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async delete(key: string): Promise<boolean> {
    await this.client.del(key);
    return true;
  }

  async clear(): Promise<void> {
    const stream = this.client.scanStream({ match: `${CATALOG_PREFIX}*`, count: 100 });
    const pipeline = this.client.pipeline();
    let keyCount = 0;

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (keys: string[]) => {
        if (keys.length) {
          keys.forEach((key) => {
            pipeline.del(key);
            keyCount++;
          });
        }
      });
      stream.on('end', () => {
        if (keyCount > 0) {
          pipeline.exec().then(() => resolve()).catch(reject);
        } else {
          resolve();
        }
      });
      stream.on('error', reject);
    });
  }

  async has(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}
