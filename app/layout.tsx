import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import LoginIntroOverlay from '@/components/LoginIntroOverlay';

// next/font: fonte auto-hospedada (o Next baixa os arquivos no build e
// serve pelo próprio domínio) em vez de um <link>/@import pro Google Fonts
// — sem requisição externa bloqueando o primeiro render, sem layout shift
// de fonte. `variable` expõe isso como uma custom property CSS
// (--font-poppins) em vez de aplicar a fonte só via className aqui —
// assim tailwind.config.ts (fontFamily.sans) e app/globals.css (a regra
// `body`) podem apontar pro MESMO Poppins carregado aqui, sem duplicar o
// import nem correr risco de dessincronizar os dois. weight: os pesos
// realmente usados no projeto hoje (400/500/600/700 — mesmos que o Inter
// anterior importava).
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'MembersFlix',
  description: 'Área de membros para cursos gravados.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={poppins.variable}>
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
