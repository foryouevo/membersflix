import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import LoginIntroOverlay from '@/components/LoginIntroOverlay';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import ThemeProvider from '@/components/ThemeProvider';

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

// Desabilita pinch-to-zoom no mobile (pedido explícito). Next 14 App Router:
// viewport é um export à parte de `metadata` (não uma <meta> manual em
// <head> — o Next já gera essa tag sozinho a partir daqui, e uma <meta
// name="viewport"> escrita à mão seria duplicada/ignorada). Trade-off
// sabido e aceito: maximumScale 1 + userScalable false também bloqueiam o
// zoom de acessibilidade pra quem tem baixa visão, em qualquer página do
// site (não tem como restringir isso por rota — viewport é sempre por
// documento inteiro).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning (só neste elemento, não propaga pros
    // filhos): o next-themes injeta um script bloqueante que já escreve
    // class="dark"/"light" no <html> ANTES do primeiro paint (evita o
    // "flash" de tema errado) — isso sempre diverge do HTML gerado no
    // servidor (que não sabe qual tema o navegador tem salvo), o que o
    // React acusaria como erro de hidratação sem esse aviso suprimido.
    <html lang="pt-BR" className={poppins.variable} suppressHydrationWarning>
      {/* Sem bg-background aqui de propósito: essa classe Tailwind (seletor
          de classe) venceria o `background-color`/`background-image` do
          `body {}` de app/globals.css (seletor de elemento, menos
          específico) na cascata, mesmo essa regra vindo depois no CSS —
          especificidade de classe sempre bate especificidade de elemento,
          independente de ordem. O fundo (gradiente + cor) fica só no CSS
          global agora, então esse conflito não existe mais. */}
      <body className="min-h-screen text-on-surface antialiased">
        {/* ThemeProvider (next-themes) envolve TODO o app, mas só tem
            efeito visual onde algum elemento usa o prefixo `dark:`
            (Tailwind, ver darkMode:'class' em tailwind.config.ts) — hoje
            só a landing institucional (/, deslogado). O resto do site
            (login, área de membros, admin) é tema escuro fixo via cores
            próprias (bg-background, bg-card etc.), nunca usa `dark:`, e
            continua exatamente igual independente do tema selecionado.
            defaultTheme="dark" + enableSystem={false}: a marca é
            escura por padrão — só muda se a pessoa trocar explicitamente
            na landing (fica salvo em localStorage, ver ThemeProvider.tsx). */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="membersflix-theme">
          {children}
          {/* Fica fora da árvore de /login de propósito — precisa sobreviver
              à troca de rota /login -> /membros pra não "flashar" a tela de
              login durante a transição. Ver comentário grande em
              components/LoginIntroOverlay.tsx. Invisível/sem custo em
              qualquer outra página (só existe algo na tela quando o próprio
              fluxo de login chama preload()/play() via lib/loginIntro.ts). */}
          <LoginIntroOverlay />
          {/* Fixo, fora da árvore de qualquer página — vale pra QUALQUER
              rota (/, /login, /inicio, /cursos, /perfil, /suporte, área de
              admin, etc.), pedido explícito. Só aparece antes de uma
              resposta salva (ver localStorage dentro do componente). */}
          <CookieConsentBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
