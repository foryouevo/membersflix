import { cn } from '@/lib/utils';

// Container padrão da landing institucional — MESMO max-width/padding
// lateral que o header (LandingHeader.tsx) já usava, extraído aqui pra
// virar a fonte única (pedido explícito: "margens alinhadas ao longo de
// toda a página") — usado no header, em cada seção (LandingPageClient.tsx)
// e no footer (LandingFooter.tsx). max-w-6xl: mesmo valor de sempre,
// nunca mudou; só deixou de estar duplicado em 3 arquivos diferentes.
export default function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}
