'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

// Reexport client-only: NextThemesProvider usa contexto React/hooks —
// app/layout.tsx é Server Component, não pode importar/usar isso direto.
// Wrapper fino, sem lógica própria, só pra cruzar a fronteira client.
export default function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
