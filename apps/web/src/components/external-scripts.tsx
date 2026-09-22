'use client';

import { useEffect } from 'react';

import { parseStorefrontConfig } from '../lib/storefront-config';
import type { StoreConfig } from '../providers/config-provider';

interface ExternalScriptsProps {
  config: StoreConfig;
}

function injectScriptFragment(parent: Element, code: string, markerId: string) {
  if (document.getElementById(markerId)) return null;

  const container = document.createElement('span');
  container.id = markerId;
  container.style.display = 'none';
  container.innerHTML = code;

  const scripts = container.querySelectorAll('script');
  scripts.forEach((oldScript) => {
    const newScript = document.createElement('script');
    Array.from(oldScript.attributes).forEach((attr) => {
      newScript.setAttribute(attr.name, attr.value);
    });
    newScript.textContent = oldScript.textContent;
    oldScript.replaceWith(newScript);
  });

  parent.appendChild(container);
  return container;
}

export function ExternalScripts({ config }: ExternalScriptsProps) {
  const storefront = parseStorefrontConfig(config.storefrontConfig);
  const scripts = storefront.externalScripts;

  useEffect(() => {
    if (scripts.length === 0) return;

    const createdElements: HTMLElement[] = [];

    scripts.forEach((script) => {
      if (!script.code) return;
      const markerId = `external-script-${script.id}`;
      const parent = script.placement === 'head' ? document.head : document.body;
      const injected = injectScriptFragment(parent, script.code, markerId);
      if (injected) createdElements.push(injected);
    });

    return () => {
      createdElements.forEach((el) => el.remove());
    };
  }, [scripts]);

  return null;
}
