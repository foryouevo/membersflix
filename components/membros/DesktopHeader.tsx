'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import HomeSearchFilter from '@/components/membros/HomeSearchFilter';
import UserAvatarMenu from '@/components/membros/UserAvatarMenu';
import { useHeaderScrolled } from '@/hooks/useHeaderScrolled';
import { buildSupportWhatsappLink, cn } from '@/lib/utils';
import type { Profile } from '@/types';

/**
 * Header horizontal fixo no topo, estilo Netflix — substitui a sidebar
 * lateral em desktop/tablet (`hidden md:flex`; abaixo de 768px continua o
 * MobileHeader + bottom nav de sempre, ver app/membros/layout.tsx). Logo à
 * esquerda, itens de navegação em linha (destaque vermelho no ativo, mesmo
 * critério de rota que a bottom nav mobile já usa), busca + filtro
 * (HomeSearchFilter, mesmo componente da Home/tela de busca) e avatar
 * (UserAvatarMenu, mesmo componente do MobileHeader) à direita.
 *
 * Sem background no topo (transparente) e sempre fixo — igual em espírito
 * ao MobileHeader, inclusive no estado de scroll: rolou a página (useHeaderScrolled
 * — hooks/useHeaderScrolled.ts, mesmo hook do MobileHeader), o fundo vira
 * preto semi-transparente (bg-black/95 = rgb(0 0 0 / 0.95), sem o brilho
 * vermelho radial que o mobile soma — aqui é só o preto liso), com
 * transição suave; no topo volta a ficar transparente. Páginas com hero de
 * tela cheia (Home, detalhes
 * do curso) cancelam a folga de <main> (md:-mt-16 no wrapper do hero, em vez
 * de md:mt-0) pra imagem/gradiente do banner "sangrarem" por trás do
 * header, mesmo efeito que o mobile já tinha; o conteúdo de texto/card dentro
 * do hero repõe a folga (md:pt-16) pra não ficar coberto. Páginas sem hero
 * (busca, perfil, meus-cursos, categorias) não têm nada pra sangrar atrás
 * do header — continuam só com a folga padrão de <main> (md:pt-16), sem
 * cancelamento nenhum. drop-shadow nos itens de texto/logo/ícone: sem
 * fundo, esse é o jeito de manter contraste em cima de qualquer coisa que
 * role por trás (imagem clara, capa de curso etc.).
 *
 * Busca/filtro aqui são só um ATALHO pra tela de busca dedicada
 * (/membros/buscar) — não filtram a página atual em tempo real (esse
 * header existe em toda página, não só na Home, então não tem uma lista de
 * cursos "local" pra filtrar em todo lugar). Qualquer interação (digitar e
 * teclar Enter, ou marcar uma categoria/instrutor no painel) navega pra lá
 * já com os parâmetros na URL (?q=/categoria=/instrutor=), que
 * app/membros/buscar/page.tsx lê e usa pra semear o useCursoFiltro de lá —
 * mesmo resultado final de "buscar e ver filtrado", só que centralizado na
 * tela que já sabe filtrar cursos de verdade.
 */
export default function DesktopHeader({
  profile,
  numeroWhatsapp,
  categorias,
  instrutores,
}: {
  profile: Pick<Profile, 'nome' | 'avatar_url'> | null;
  numeroWhatsapp: string | null;
  categorias: { id: string; nome: string }[];
  instrutores: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const scrolled = useHeaderScrolled();
  const suporteLink = numeroWhatsapp ? buildSupportWhatsappLink(numeroWhatsapp) : null;

  // Estado só de "staging" pro input/painel — a filtragem de verdade
  // acontece na tela de busca, pra onde toda mudança aqui navega (ver
  // comentário do componente acima).
  const [busca, setBusca] = useState('');
  const [categoriaIds, setCategoriaIds] = useState<string[]>([]);
  const [instrutorNomes, setInstrutorNomes] = useState<string[]>([]);

  function irParaBusca(next: { busca?: string; categoriaIds?: string[]; instrutorNomes?: string[] }) {
    const alvoBusca = next.busca ?? busca;
    const alvoCategoriaIds = next.categoriaIds ?? categoriaIds;
    const alvoInstrutorNomes = next.instrutorNomes ?? instrutorNomes;

    const params = new URLSearchParams();
    if (alvoBusca.trim()) params.set('q', alvoBusca.trim());
    if (alvoCategoriaIds.length > 0) params.set('categoria', alvoCategoriaIds.join(','));
    if (alvoInstrutorNomes.length > 0) params.set('instrutor', alvoInstrutorNomes.join(','));

    const query = params.toString();
    router.push(`/membros/buscar${query ? `?${query}` : ''}`);
  }

  function toggleCategoria(id: string) {
    const next = categoriaIds.includes(id) ? categoriaIds.filter((x) => x !== id) : [...categoriaIds, id];
    setCategoriaIds(next);
    irParaBusca({ categoriaIds: next });
  }

  function toggleInstrutor(nome: string) {
    const next = instrutorNomes.includes(nome) ? instrutorNomes.filter((x) => x !== nome) : [...instrutorNomes, nome];
    setInstrutorNomes(next);
    irParaBusca({ instrutorNomes: next });
  }

  // Mesmo destaque vermelho de sempre (text-primary) pro item da rota
  // ativa — só cor de texto aqui (barra horizontal, sem borda lateral tipo
  // sidebar nem espaço pra "pill" de fundo tipo bottom nav mobile).
  // drop-shadow: sem background no header, o texto senta direto em cima do
  // que rolar por trás — a sombra mantém contraste mesmo sobre fundo claro.
  function itemClasses(active: boolean) {
    return cn(
      'text-sm font-medium drop-shadow-md transition-colors',
      active ? 'text-primary' : 'text-on-variant hover:text-white'
    );
  }

  // Mesmo motivo do MobileHeader: a página do player já tem seu próprio
  // botão de voltar flutuando sobre o vídeo e gerencia a própria altura de
  // tela — uma barra de navegação persistente por cima brigaria com a
  // experiência imersiva do player, então o header simplesmente não
  // renderiza nessa rota. Depois de todos os hooks (Rules of Hooks: um
  // `return null` condicional ANTES dos useState quebraria a ordem deles
  // entre renders, já que `pathname` pode mudar sem desmontar este
  // componente — ele vive no layout, não na página).
  if (pathname.startsWith('/membros/player')) return null;

  return (
    // fixed + z-30: sempre no topo, em toda página (mesma posição de
    // sempre). Transparente no topo (scroll = 0) / bg-black/95 rolado —
    // rgb(0 0 0 / 0.95), combina com o tom escuro do tema (bg-background é
    // #0f0f0f, quase preto puro) sem contrastar feio com o resto do app.
    // transition-colors + duration-[250ms] ease-out: mesma transição do
    // MobileHeader, pra troca não ficar abrupta.
    //
    // py-6 (1.5rem, topo/base) + pl-16/pr-16 (4rem, laterais) — lateral
    // maior que vertical de propósito (pedido explícito). h-20 (5rem/80px,
    // era h-24/96px — pedido explícito também): manter uma altura FIXA
    // (não deixar intrínseca) é o que garante que a folga reservada nas
    // outras páginas continue batendo com a altura de verdade do header —
    // ela também baixou pra 80px (HEADER_HEIGHT_PX em VitrinePageClient/
    // CursoDetalheClient/PlayerPageClient/app/membros/layout.tsx, todos os
    // md:pt-24/md:-mt-24 viraram md:pt-20/md:-mt-20). 80px é um pouco
    // apertado pro padding vertical (1.5rem × 2 = 48px) + o conteúdo mais
    // alto da linha (~38px, o input de busca) somarem ~86px — sem
    // overflow-hidden no header, isso não corta nada, só extrapola alguns
    // px pra fora da caixa sem quebrar o layout; items-center continua
    // centralizando logo/nav/busca/avatar dentro dela.
    <div
      className={cn(
        'fixed inset-x-0 top-0 z-30 hidden h-20 items-center gap-6 py-6 pl-16 pr-16 transition-colors duration-[250ms] ease-out md:flex',
        scrolled ? 'bg-black/95' : 'bg-transparent'
      )}
    >
      <Link href="/membros/vitrine" className="shrink-0 drop-shadow-md">
        <Image src="/logo.png" alt="MembersFlix" width={140} height={28} priority className="h-7 w-auto object-contain" />
      </Link>

      <nav className="flex shrink-0 items-center gap-6">
        <Link href="/membros/vitrine" className={itemClasses(pathname.startsWith('/membros/vitrine'))}>
          Início
        </Link>
        <Link href="/membros/meus-cursos" className={itemClasses(pathname.startsWith('/membros/meus-cursos'))}>
          Meus Cursos
        </Link>
        <Link href="/membros/perfil" className={itemClasses(pathname.startsWith('/membros/perfil'))}>
          Meu Perfil
        </Link>
        {suporteLink ? (
          <a href={suporteLink} target="_blank" rel="noopener noreferrer" className={itemClasses(false)}>
            Suporte
          </a>
        ) : (
          <span
            title="Número de suporte não configurado pelo admin"
            className="cursor-not-allowed text-sm font-medium text-on-variant/50 drop-shadow-md"
          >
            Suporte
          </span>
        )}
      </nav>

      <div className="flex flex-1 items-center justify-end gap-3">
        <HomeSearchFilter
          query={busca}
          onQueryChange={setBusca}
          categorias={categorias}
          categoriaIds={categoriaIds}
          onToggleCategoria={toggleCategoria}
          instrutores={instrutores}
          instrutorNomes={instrutorNomes}
          onToggleInstrutor={toggleInstrutor}
          onLimparFiltros={() => {
            setCategoriaIds([]);
            setInstrutorNomes([]);
          }}
          onSubmit={() => irParaBusca({})}
        />
        <UserAvatarMenu profile={profile} sizeClassName="h-9 w-9" sizePx={36} />
      </div>
    </div>
  );
}
