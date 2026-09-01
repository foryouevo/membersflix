'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
 * Logo "M" é sempre um link pra Home (/membros/vitrine), em qualquer
 * página — não tem mais seta de voltar separada; o próprio logo faz esse
 * papel (era assim antes o botão de voltar em CursoDetalheClient, removido
 * de lá quando esse header virou global). Na Home, "Início" continua ao
 * lado do logo; nas demais páginas, só o logo mesmo. Clicar no logo estando
 * já na Home não causa reload nem nada estranho — é um <Link> normal do
 * Next pra rota atual, o App Router simplesmente não faz nada.
 *
 * Fundo transparente no topo (deixa a página por trás aparecer atrás do
 * logo) / sólido preto com um brilho vermelho radial sutil ao rolar —
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
        {/* Logo "M" sempre visível E sempre clicável, em qualquer página —
            leva pra Home. "Início" ao lado só na própria Home (nas demais,
            só o logo). */}
        <Link href="/membros/vitrine" aria-label="Início" className="flex items-center gap-2">
          <Image src="/imagens/logohome.png" alt="" width={32} height={32} className="h-7 w-auto object-contain" />
          {isHome && <span className="text-base font-bold text-white">Início</span>}
        </Link>

        <UserAvatarMenu profile={profile} />
      </div>
    </div>
  );
}
