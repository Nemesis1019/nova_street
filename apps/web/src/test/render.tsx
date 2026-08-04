import { MantineProvider } from '@mantine/core';
import { render as testingLibraryRender, type RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';

import { QueryProvider } from '../providers/query-provider';

export function render(ui: ReactNode): RenderResult {
  return testingLibraryRender(<>{ui}</>, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MantineProvider>
        <QueryProvider>{children}</QueryProvider>
      </MantineProvider>
    ),
  });
}
