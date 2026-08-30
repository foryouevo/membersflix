import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MembersFlix',
  description: 'Área de membros para cursos gravados.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background text-on-surface antialiased">{children}</body>
    </html>
  );
}
