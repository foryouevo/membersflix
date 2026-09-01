'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  PlaySquare,
  Search,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  LogOut,
} from 'lucide-react';
import { cn, buildSupportWhatsappLink } from '@/lib/utils';
import type { Profile } from '@/types';
import { createClient } from '@/lib/supabase/client';

const COLLAPSE_KEY = 'membros_sidebar_collapsed';

export default function MembrosSidebar({
  profile,
  numeroWhatsapp,
}: {
  profile: Pick<Profile, 'nome' | 'avatar_url'>;
  numeroWhatsapp: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Começa expandida no server (evita mismatch de hidratação); lê a preferência
  // salva assim que monta no client.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === '1') setCollapsed(true);
    } catch {
      // localStorage indisponível (modo privado etc.) — mantém expandida.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        // idem
      }
      return next;
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  const suporteLink = numeroWhatsapp ? buildSupportWhatsappLink(numeroWhatsapp) : null;

  // Estilo compartilhado por todo item de navegação (expandido e recolhido):
  // hover em cinza mais claro que o fundo da sidebar, cantos arredondados,
  // transição suave (transition-colors já cobre background-color). O
  // border-l-4 existe sempre (mesmo inativo, só transparente) — assim o
  // ícone/texto não "pula" de posição quando o item vira o ativo. O item
  // ativo mantém fundo + borda vermelha sempre; o inativo só mostra os
  // dois enquanto o mouse está em cima (hover:border-l-primary junto com
  // hover:bg-surface-container) — puro CSS via Tailwind, some sozinho
  // quando o mouse sai, sem precisar de state/JS pra isso.
  function itemClasses(active: boolean) {
    return cn(
      'flex items-center gap-3 rounded border-l-4 px-3 py-2.5 text-sm font-medium transition-colors',
      active
        ? 'border-l-primary bg-surface-container text-white'
        : 'border-l-transparent text-on-variant hover:border-l-primary hover:bg-surface-container hover:text-white'
    );
  }
  function itemClassesCollapsed(active: boolean) {
    return cn(
      'flex h-9 w-9 items-center justify-center rounded border-l-4 transition-colors',
      active
        ? 'border-l-primary bg-surface-container text-white'
        : 'border-l-transparent text-on-variant hover:border-l-primary hover:bg-surface-container hover:text-white'
    );
  }
  // Item da bottom nav mobile (só ícone, sem border-l — não faz sentido numa
  // barra horizontal): ícone branco por padrão, vermelho do tema (currentColor
  // = text-primary, que já é #e50914) só quando ativo. Ativo também fica mais
  // largo (w-16 vs w-11) — um "pill" alongado ao redor do ícone em vez do
  // círculo padrão, se destacando mais que os demais itens. `transition-all`
  // (não só transition-colors) porque agora width também anima na troca.
  function itemClassesMobile(active: boolean) {
    return cn(
      'flex h-11 items-center justify-center rounded-full transition-all',
      active ? 'w-16 bg-primary/15 text-primary' : 'w-11 text-white hover:bg-surface-container'
    );
  }

  // Bottom nav flutuante, só ícones (Início/Meus Cursos/Buscar/Suporte/Meu
  // Perfil — sem logo, sem texto, sem o botão de colapsar) — visível só
  // abaixo do breakpoint md (768px) via `md:hidden`; o sidebar tradicional
  // abaixo (collapsed ou não) ganha `hidden md:flex` pra sumir nessa mesma
  // faixa. `fixed` escapa do `overflow-hidden`/h-screen do layout
  // normalmente (não há nenhum ancestral com transform criando um novo
  // containing block), então posiciona relativo à viewport mesmo estando
  // dentro da árvore do layout. `left-1/2 w-fit -translate-x-1/2` (em vez de
  // `inset-x-4`, que esticava de ponta a ponta): a barra encolhe pro
  // conteúdo (5 ícones + gap) e fica centralizada — também acompanha sozinha
  // quando o item ativo alarga (itemClassesMobile), sem sobrar vão nas
  // pontas. rounded-full: cápsula fechada nas pontas (rounded-2xl antes só
  // arredondava levemente). gap-3 (era gap-1) + px-5 (era px-3): mais
  // respiro entre os ícones e nas laterais — como a barra é `w-fit`, isso já
  // aumenta a largura total sozinho, sem precisar de um valor fixo.
  const mobileNav = (
    <nav
      aria-label="Navegação"
      className="fixed bottom-4 left-1/2 z-40 flex w-fit -translate-x-1/2 items-center gap-3 rounded-full border border-border/60 bg-surface-lowest/95 px-2 py-2 shadow-overlay backdrop-blur-sm sm:px-5 md:hidden"
    >
      <Link href="/membros/vitrine" title="Início" className={itemClassesMobile(pathname.startsWith('/membros/vitrine'))}>
        <Home size={20} />
      </Link>
      <Link
        href="/membros/meus-cursos"
        title="Meus Cursos"
        className={itemClassesMobile(pathname.startsWith('/membros/meus-cursos'))}
      >
        <PlaySquare size={20} />
      </Link>
      {/* Busca: só existe no mobile como esse ícone — leva pra tela dedicada
          (/membros/buscar), sem banner/hero nem "Meus Cursos", só busca +
          filtro sempre visíveis + "Todos os Cursos" filtrado. No
          desktop/tablet a busca já fica flutuando sobre o banner da Home
          (VitrinePageClient), então não tem item equivalente no sidebar
          lateral — só faz sentido aqui, onde não sobra espaço pra flutuar
          nada sobre o banner. */}
      <Link href="/membros/buscar" title="Buscar" className={itemClassesMobile(pathname.startsWith('/membros/buscar'))}>
        <Search size={20} />
      </Link>
      {suporteLink ? (
        <a href={suporteLink} target="_blank" rel="noopener noreferrer" title="Suporte" className={itemClassesMobile(false)}>
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
      <Link href="/membros/perfil" title="Meu Perfil" className={itemClassesMobile(pathname.startsWith('/membros/perfil'))}>
        <UserIcon size={20} />
      </Link>
    </nav>
  );

  if (collapsed) {
    return (
      <>
        <aside className="hidden h-screen w-14 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-border/60 bg-surface-lowest py-4 md:flex">
          <button
            onClick={toggleCollapsed}
            title="Expandir menu"
            className="flex h-9 w-9 items-center justify-center rounded text-on-variant hover:bg-surface-container hover:text-white"
          >
            <ChevronRight size={18} />
          </button>
          <div className="my-2 h-px w-8 bg-border/60" />
          <Link href="/membros/vitrine" title="Início" className={itemClassesCollapsed(pathname.startsWith('/membros/vitrine'))}>
            <Home size={18} />
          </Link>
          <Link
            href="/membros/meus-cursos"
            title="Meus Cursos"
            className={itemClassesCollapsed(pathname.startsWith('/membros/meus-cursos'))}
          >
            <PlaySquare size={18} />
          </Link>
          <Link
            href="/membros/perfil"
            title="Meu Perfil"
            className={itemClassesCollapsed(pathname.startsWith('/membros/perfil'))}
          >
            <UserIcon size={18} />
          </Link>
          {suporteLink ? (
            <a
              href={suporteLink}
              target="_blank"
              rel="noopener noreferrer"
              title="Suporte"
              className={itemClassesCollapsed(false)}
            >
              <MessageCircle size={18} />
            </a>
          ) : (
            <span
              title="Número de suporte não configurado pelo admin"
              className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded border-l-4 border-l-transparent text-on-variant/50"
            >
              <MessageCircle size={18} />
            </span>
          )}
        </aside>
        {mobileNav}
      </>
    );
  }

  return (
    <>
      <aside className="hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-border/60 bg-surface-lowest md:flex">
        <div className="flex items-center justify-between px-6 py-6">
          <Link href="/membros/vitrine" className="shrink-0">
            <Image src="/logo.png" alt="MembersFlix" width={140} height={28} priority className="h-8 w-auto object-contain" />
          </Link>
          <button
            onClick={toggleCollapsed}
            title="Recolher menu"
            className="text-on-variant hover:text-white"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
        <div className="border-t border-border/60" />

        <nav className="flex-1 space-y-1 px-4 py-4">
          <Link href="/membros/vitrine" className={itemClasses(pathname.startsWith('/membros/vitrine'))}>
            <Home size={18} />
            Início
          </Link>

          <Link href="/membros/meus-cursos" className={itemClasses(pathname.startsWith('/membros/meus-cursos'))}>
            <PlaySquare size={18} />
            Meus Cursos
          </Link>

          <Link href="/membros/perfil" className={itemClasses(pathname.startsWith('/membros/perfil'))}>
            <UserIcon size={18} />
            Meu Perfil
          </Link>

          {suporteLink ? (
            <a
              href={suporteLink}
              target="_blank"
              rel="noopener noreferrer"
              className={itemClasses(false)}
            >
              <MessageCircle size={18} />
              Suporte
            </a>
          ) : (
            <span
              title="Número de suporte não configurado pelo admin"
              className="flex cursor-not-allowed items-center gap-3 rounded border-l-4 border-l-transparent px-3 py-2.5 text-sm font-medium text-on-variant/50"
            >
              <MessageCircle size={18} />
              Suporte
            </span>
          )}
        </nav>

        {/* Só "Sair", fixo — sem dropdown, sem avatar/nome do usuário aqui.
            "Meu Perfil" já existe como item próprio na navegação principal
            (acima); duplicar identidade do usuário aqui embaixo também era
            redundante. */}
        <div className="border-t border-border/60 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded px-2 py-2 text-left text-sm font-medium text-error hover:bg-surface-container"
          >
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>
      {mobileNav}
    </>
  );
}
