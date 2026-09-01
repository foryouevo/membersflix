import type { Metadata } from 'next';
import './globals.css';
import LoginIntroOverlay from '@/components/LoginIntroOverlay';

export const metadata: Metadata = {
  title: 'MembersFlix',
  description: 'Área de membros para cursos gravados.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background text-on-surface antialiased">
        {children}
        {/* Fica fora da árvore de /login de propósito — precisa sobreviver
            à troca de rota /login -> /membros pra não "flashar" a tela de
            login durante a transição. Ver comentário grande em
            components/LoginIntroOverlay.tsx. Invisível/sem custo em
            qualquer outra página (só existe algo na tela quando o próprio
            fluxo de login chama preload()/play() via lib/loginIntro.ts). */}
        <LoginIntroOverlay />
      </body>
    </html>
  );
}
