'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { initials } from '@/lib/utils';
import type { Profile } from '@/types';

// Avatar do usuário + dropdown ("Meu Perfil"/"Sair") — extraído do
// MobileHeader original pra ser reaproveitado também no DesktopHeader (o
// header horizontal fixo que substituiu a sidebar lateral). Mesmo padrão de
// dropdown com click-outside já usado em outros menus da plataforma
// (menuRef + listener de mousedown).
export default function UserAvatarMenu({
  profile,
  sizeClassName = 'h-8 w-8',
  sizePx = 32,
}: {
  // null quando a query de profile falha — nesse caso não renderiza nada,
  // sem quebrar o resto do header.
  profile: Pick<Profile, 'nome' | 'avatar_url'> | null;
  // Classe Tailwind ESTÁTICA (não dá pra montar "h-${n}" em runtime — o
  // compilador só gera CSS pra classes que aparecem como texto literal no
  // código-fonte) — padrão é o tamanho do header mobile (32px); o desktop
  // passa uma um pouco maior.
  sizeClassName?: string;
  // Mesmo tamanho em px, só pro width/height do next/image (cálculo de
  // layout/otimização da imagem — independente da classe CSS acima).
  sizePx?: number;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAberto(false);
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

  if (!profile) return null;

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setMenuAberto((v) => !v)}
        aria-label="Menu do usuário"
        aria-expanded={menuAberto}
        className={`block ${sizeClassName} overflow-hidden rounded-full ring-1 ring-white/25 transition-opacity hover:opacity-80`}
      >
        {profile.avatar_url ? (
          <Image src={profile.avatar_url} alt={profile.nome} width={sizePx} height={sizePx} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-primary/20 text-[0.7rem] font-semibold text-primary">
            {initials(profile.nome || 'Aluno')}
          </span>
        )}
      </button>

      {menuAberto && (
        <div className="absolute right-0 top-full z-10 mt-2 w-44 overflow-hidden rounded-lg bg-surface-high shadow-overlay">
          <Link
            href="/membros/perfil"
            onClick={() => setMenuAberto(false)}
            className="flex items-center gap-2 px-4 py-3 text-sm text-on-surface hover:bg-surface-container"
          >
            <UserIcon size={16} /> Meu Perfil
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-error hover:bg-surface-container"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      )}
    </div>
  );
}
