import { type StorefrontConfig,StorefrontConfigSchema } from '@ecommerce/shared';

export function parseStorefrontConfig(value: unknown): StorefrontConfig {
  const parsed = StorefrontConfigSchema.safeParse(value ?? {});
  if (!parsed.success) {
    // Return defaults silently on schema mismatch
    return StorefrontConfigSchema.parse({});
  }
  return parsed.data;
}
