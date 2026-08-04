'use client';

import { parseStorefrontConfig } from '../lib/storefront-config';
import { useStoreConfig } from '../providers/config-provider';

export function AnnouncementBar() {
  const config = useStoreConfig();
  const storefront = parseStorefrontConfig(config.storefrontConfig);
  const bar = storefront.announcementBar;

  if (!bar.enabled || !bar.text) {
    return null;
  }

  const content = (
    <div
      style={{
        backgroundColor: bar.backgroundColor,
        color: bar.textColor,
        padding: '10px 16px',
        textAlign: 'center',
        fontSize: '12px',
        fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {bar.text}
    </div>
  );

  if (bar.link) {
    return (
      <a href={bar.link} style={{ textDecoration: 'none', display: 'block' }}>
        {content}
      </a>
    );
  }

  return content;
}
