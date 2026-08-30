'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Instagram,
  MessageCircle,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  LogOut,
} from 'lucide-react';
import { cn, initials, buildSupportWhatsappLink } from '@/lib/utils';
import type { Profile } from '@/types';
import { createClient } from '@/lib/supabase/client';

const INSTAGRAM_URL = 'https://www.instagram.com/pktoledoo/';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  const suporteLink = numeroWhatsapp ? buildSupportWhatsappLink(numeroWhatsapp) : null;

  if (collapsed) {
    return (
      <aside className="flex h-full w-14 shrink-0 flex-col items-center gap-1 border-r border-border/60 bg-surface-lowest py-4">
        <button
          onClick={toggleCollapsed}
          title="Expandir menu"
          className="flex h-9 w-9 items-center justify-center rounded text-on-variant hover:bg-surface-container hover:text-white"
        >
          <ChevronRight size={18} />
        </button>
        <div className="my-2 h-px w-8 bg-border/60" />
        <Link
          href="/membros/vitrine"
          title="Início"
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded',
            pathname.startsWith('/membros/vitrine')
              ? 'bg-surface-high text-white'
              : 'text-on-variant hover:bg-surface-container hover:text-white'
          )}
        >
          <Home size={18} />
        </Link>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border/60 bg-surface-lowest">
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
        <Link
          href="/membros/vitrine"
          className={cn(
            'flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors',
            pathname.startsWith('/membros/vitrine')
              ? 'bg-surface-high text-white'
              : 'text-on-variant hover:bg-surface-container hover:text-white'
          )}
        >
          <Home size={18} />
          Início
        </Link>

        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium text-on-variant transition-colors hover:bg-surface-container hover:text-white"
        >
          <Instagram size={18} />
          Instagram
        </a>

        {suporteLink ? (
          <a
            href={suporteLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium text-on-variant transition-colors hover:bg-surface-container hover:text-white"
          >
            <MessageCircle size={18} />
            Suporte
          </a>
        ) : (
          <span
            title="Número de suporte não configurado pelo admin"
            className="flex cursor-not-allowed items-center gap-3 rounded px-3 py-2.5 text-sm font-medium text-on-variant/50"
          >
            <MessageCircle size={18} />
            Suporte
          </span>
        )}
      </nav>

      <div ref={menuRef} className="relative border-t border-border/60 p-3">
        {menuOpen && (
          <div className="absolute inset-x-3 bottom-full z-10 mb-2 overflow-hidden rounded-lg bg-surface-high shadow-overlay">
            <Link
              href="/membros/perfil"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-on-surface hover:bg-surface-container"
            >
              <UserIcon size={16} /> Meu perfil
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-error hover:bg-surface-container"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        )}

        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex w-full items-center gap-3 rounded px-2 py-2 text-left hover:bg-surface-container"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
            {initials(profile.nome || 'Aluno')}
          </div>
          <span className="flex-1 truncate text-sm font-medium text-white">{profile.nome}</span>
          <ChevronUp size={16} className={cn('shrink-0 text-on-variant transition-transform', menuOpen && 'rotate-180')} />
        </button>
      </div>
    </aside>
  );
}
