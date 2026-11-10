import { expect, test, type Page } from '@playwright/test';

/**
 * Matriz mínima de regresión visual por tenant/preset.
 *
 * Corre contra los servidores locales ya levantados:
 *   API 4000, web 3000.
 *
 * Chrome se ejecuta con reducedMotion para que reveal, parallax, zoom,
 * marquee y page transition no introduzcan diferencias entre corridas.
 */

interface StorefrontCase {
  name: string;
  url: string;
  mobile?: boolean;
}

const CASES: StorefrontCase[] = [
  { name: 'demo-home-desktop', url: 'http://demo.localhost:3000/' },
  { name: 'demo-home-mobile', url: 'http://demo.localhost:3000/', mobile: true },
  { name: 'demo-historia-desktop', url: 'http://demo.localhost:3000/pagina/nuestra-historia' },
  { name: 'demo-producto-desktop', url: 'http://demo.localhost:3000/producto/suscripcion-origen' },
  { name: 'demo-catalogo-desktop', url: 'http://demo.localhost:3000/catalogo' },
  { name: 'nova-home-desktop', url: 'http://localhost:3000/' },
  { name: 'nova-home-mobile', url: 'http://localhost:3000/', mobile: true },
  { name: 'nova-producto-desktop', url: 'http://localhost:3000/producto/campera-bomber-midnight' },
  { name: 'nova-catalogo-desktop', url: 'http://localhost:3000/catalogo' },
  { name: 'marketplace-temas-desktop', url: 'http://demo.localhost:3000/temas' },
];

async function waitForStableStorefront(page: Page) {
  await page.waitForLoadState('load');
  await page.evaluate(async () => {
    await document.fonts.ready;

    const images = Array.from(document.images);
    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete) {
              image.decode?.().catch(() => undefined).finally(() => resolve());
              return;
            }
            const done = () => resolve();
            image.addEventListener('load', done, { once: true });
            image.addEventListener('error', done, { once: true });
            window.setTimeout(done, 4_000);
          }),
      ),
    );
  });

  // Quita sólo capas de desarrollo/consentimiento que no forman parte del layout.
  await page.addStyleTag({
    content: `
      [role="dialog"],
      .mantine-Modal-root,
      .mantine-Modal-overlay,
      nextjs-portal {
        display: none !important;
      }
    `,
  });

  await page.waitForTimeout(300);
}

test.describe.configure({ mode: 'serial' });

for (const item of CASES) {
  test(item.name, async ({ page }, testInfo) => {
    const isMobileCase = item.mobile === true;
    if (isMobileCase !== (testInfo.project.name === 'mobile')) {
      test.skip();
      return;
    }

    await page.goto(item.url, { waitUntil: 'load' });
    await waitForStableStorefront(page);
    await expect(page).toHaveScreenshot(`${item.name}.png`, {
      fullPage: false,
      timeout: 20_000,
    });
  });
}
