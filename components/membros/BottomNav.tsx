'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlaySquare, Search, MessageCircle, User as UserIcon } from 'lucide-react';
import { cn, buildSupportWhatsappLink } from '@/lib/utils';

/**
 * Bottom nav flutuante mobile — antes vivia dentro de MembrosSidebar.tsx
 * (junto da sidebar lateral de desktop, que existia como um `<aside>`
 * colapsável no mesmo componente); a sidebar saiu de vez (substituída pelo
 * DesktopHeader, o menu horizontal fixo no topo — ver app/membros/
 * layout.tsx), então este arquivo agora só tem o que sempre foi
 * mobile-only: Início/Meus Cursos/Buscar/Suporte/Meu Perfil, só ícones,
 * `md:hidden`.
 */
export default function BottomNav({ numeroWhatsapp }: { numeroWhatsapp: string | null }) {
  const pathname = usePathname();
  const suporteLink = numeroWhatsapp ? buildSupportWhatsappLink(numeroWhatsapp) : null;

  // Ícone branco por padrão, vermelho do tema (currentColor = text-primary,
  // que já é #e50914) só quando ativo. Ativo também fica mais largo (w-16
  // vs w-11) — um "pill" alongado ao redor do ícone em vez do círculo
  // padrão, se destacando mais que os demais itens. `transition-all` (não
  // só transition-colors) porque agora width também anima na troca.
  function itemClasses(active: boolean) {
    return cn(
      'flex h-11 items-center justify-center rounded-full transition-all',
      active ? 'w-16 bg-primary/15 text-primary' : 'w-11 text-white hover:bg-surface-container'
    );
  }

  // `fixed` escapa do `overflow-hidden`/h-screen do layout normalmente (não
  // há nenhum ancestral com transform criando um novo containing block),
  // então posiciona relativo à viewport mesmo estando dentro da árvore do
  // layout. `left-1/2 w-fit -translate-x-1/2` (em vez de `inset-x-4`, que
  // esticava de ponta a ponta): a barra encolhe pro conteúdo (5 ícones +
  // gap) e fica centralizada — também acompanha sozinha quando o item ativo
  // alarga (itemClasses), sem sobrar vão nas pontas. rounded-full: cápsula
  // fechada nas pontas.
  return (
    <nav
      aria-label="Navegação"
      className="fixed bottom-4 left-1/2 z-40 flex w-fit -translate-x-1/2 items-center gap-3 rounded-full border border-border/60 bg-surface-lowest/95 px-2 py-2 shadow-overlay backdrop-blur-sm sm:px-5 md:hidden"
    >
      <Link href="/membros/vitrine" title="Início" className={itemClasses(pathname.startsWith('/membros/vitrine'))}>
        <Home size={20} />
      </Link>
      <Link href="/membros/meus-cursos" title="Meus Cursos" className={itemClasses(pathname.startsWith('/membros/meus-cursos'))}>
        <PlaySquare size={20} />
      </Link>
      {/* Busca: só existe no mobile como esse ícone — leva pra tela dedicada
          (/membros/buscar), sem banner/hero nem "Meus Cursos", só busca +
          filtro sempre visíveis + "Todos os Cursos" filtrado. No
          desktop/tablet a busca já fica no DesktopHeader (barra fixa no
          topo), então não tem item equivalente aqui — só faz sentido no
          mobile, onde não sobra espaço pra um input+filtro inteiros no
          header. */}
      <Link href="/membros/buscar" title="Buscar" className={itemClasses(pathname.startsWith('/membros/buscar'))}>
        <Search size={20} />
      </Link>
      {suporteLink ? (
        <a href={suporteLink} target="_blank" rel="noopener noreferrer" title="Suporte" className={itemClasses(false)}>
          <MessageCircle size={20} />
        </a>
      ) : (
        <span
          title="Número de suporte não configurado pelo admin"
          className="flex h-11 w-11 cursor-not-allowed items-center justify-center rounded-full text-white/40"
        >
          <MessageCircle size={20} />
        </span>
      )}
      {/* Meu Perfil por último de propósito — ordem final: Início, Meus
          Cursos, Buscar, Suporte, Meu Perfil. */}
      <Link href="/membros/perfil" title="Meu Perfil" className={itemClasses(pathname.startsWith('/membros/perfil'))}>
        <UserIcon size={20} />
      </Link>
    </nav>
  );
}
