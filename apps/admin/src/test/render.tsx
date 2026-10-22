import { MantineProvider } from '@mantine/core';
import { render as testingLibraryRender, type RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';

import { I18nProvider } from '../providers/i18n-provider';
import { QueryProvider } from '../providers/query-provider';

export function render(ui: ReactNode): RenderResult {
  return testingLibraryRender(<>{ui}</>, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MantineProvider>
        <I18nProvider>
          <QueryProvider>{children}</QueryProvider>
        </I18nProvider>
      </MantineProvider>
    ),
  });
}
