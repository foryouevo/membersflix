'use client';

import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import UserAvatarMenu from '@/components/membros/UserAvatarMenu';
import { useHeaderScrolled } from '@/hooks/useHeaderScrolled';
import type { Profile } from '@/types';

// Altura real do header (px-4 py-3 + maior conteúdo da linha, o avatar de
// 32px) — 12+12+32 = 56px = exatamente `pt-14` do Tailwind, o valor que
// <main> (app/membros/layout.tsx) reserva por padrão pra todo mundo no
// mobile. Páginas com hero de tela cheia (VitrinePageClient,
// CursoDetalheClient) cancelam esse `pt-14` (via `-mt-14` no wrapper do
// hero) e repõem sua própria folga, porque o header flutua TRANSPARENTE por
// cima da imagem — não empurra o hero pra baixo, só o conteúdo de texto
// dentro dele precisa dessa folga, não a imagem em si.
export const MOBILE_HEADER_HEIGHT_PX = 56;

/**
 * Header compacto global do app mobile (logo "M" + avatar do usuário, com
 * dropdown de "Meu Perfil"/"Sair") — `fixed` no topo, presente em toda
 * página sob app/membros/layout.tsx (md:hidden — a partir daí quem navega é
 * o DesktopHeader, a barra horizontal fixa que substituiu a sidebar
 * lateral). Except: página do player (/membros/player/[id]) — ela já tem
 * seu próprio botão de voltar flutuando sobre o vídeo (PlayerPageClient) e
 * gerencia a própria altura de tela (h-screen próprio, sem depender do
 * scroll do <main>); duplicar chrome de navegação ali brigaria com os
 * controles do vídeo, então o header simplesmente não renderiza nessa rota
 * (o DesktopHeader faz o mesmo, pelo mesmo motivo).
 *
 * Conteúdo da linha principal depende da rota:
 * - Home (/membros/vitrine): logo "M" + texto "Início", como sempre foi.
 * - Qualquer outra página: seta de voltar (mesmo componente/estilo/lógica
 *   — router.back() — que já existia solto em CursoDetalheClient antes
 *   desse header virar global; removido de lá pra não duplicar o mesmo
 *   botão duas vezes na mesma tela).
 *
 * Fundo transparente no topo (deixa a página por trás aparecer atrás do
 * logo/seta) / sólido preto com um brilho vermelho radial sutil ao rolar —
 * mesma técnica usada no glow do login (LoginPageClient.tsx). Estado de
 * scroll vem de useHeaderScrolled (hooks/useHeaderScrolled.ts — extraído
 * daqui, reaproveitado também pelo DesktopHeader).
 */
export default function MobileHeader({
  profile,
}: {
  // null quando a query de profile falha (ver app/membros/layout.tsx) —
  // nesse caso o avatar simplesmente não renderiza, sem quebrar o resto do
  // header.
  profile: Pick<Profile, 'nome' | 'avatar_url'> | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const scrolled = useHeaderScrolled();

  if (pathname.startsWith('/membros/player')) return null;

  const isHome = pathname.startsWith('/membros/vitrine');

  return (
    <div
      className={`fixed inset-x-0 top-0 z-30 border-b transition-colors duration-[250ms] ease-out md:hidden ${
        scrolled ? 'border-white/[0.08]' : 'border-transparent bg-transparent'
      }`}
      // Preto sólido (background-color) por baixo do gradiente (background-image)
      // — mesma técnica do glow do login (LoginPageClient.tsx), inline porque é
      // um radial-gradient com percentuais que não valem a pena virar classe
      // Tailwind arbitrária. Só aplicado no estado "rolado": no topo a barra
      // continua transparente (bg-transparent via className acima).
      style={
        scrolled
          ? {
              backgroundColor: '#000',
              backgroundImage: 'radial-gradient(ellipse 60% 300% at 100% 50%, rgba(229, 9, 20, 0.35), transparent 75%)',
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        {/* Logo "M" sempre visível, em qualquer página — só o que vem ao
            lado dele muda: "Início" na Home, seta de voltar nas demais. */}
        <div className="flex items-center gap-2">
          <Image src="/imagens/logohome.png" alt="" width={32} height={32} className="h-7 w-auto object-contain" />
          {isHome ? (
            <span className="text-base font-bold text-white">Início</span>
          ) : (
            // Mesmo padrão visual/lógica do botão de voltar que já existia
            // em CursoDetalheClient (router.back() — volta pra de onde o
            // aluno realmente veio, já que várias telas levam pra cá).
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Voltar"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-high text-on-variant transition-colors hover:bg-primary hover:text-white"
            >
              <ChevronLeft size={20} strokeWidth={1.5} />
            </button>
          )}
        </div>

        <UserAvatarMenu profile={profile} />
      </div>
    </div>
  );
}
