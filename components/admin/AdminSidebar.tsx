'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, GraduationCap, Star, Settings, LogOut } from 'lucide-react';
import { cn, initials } from '@/lib/utils';
import type { Profile } from '@/types';
import { createClient } from '@/lib/supabase/client';

const NAV = [
  { href: '/admin/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/admin/alunos', label: 'Alunos', icon: Users },
  { href: '/admin/cursos', label: 'Cursos', icon: GraduationCap },
  { href: '/admin/vitrine', label: 'Vitrine', icon: Star },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
];

export default function AdminSidebar({ profile }: { profile: Pick<Profile, 'nome' | 'avatar_url'> }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border/60 bg-surface-lowest px-4 py-6">
      <div className="mb-8 px-2">
        <Image src="/logo.png" alt="MembersFlix" width={140} height={28} priority className="h-8 w-auto object-contain" />
      </div>

      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
          {initials(profile.nome || 'Admin')}
        </div>
        <div>
          <p className="text-sm font-semibold text-primary">Painel Admin</p>
          <p className="text-xs text-on-variant">Gerenciamento</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-surface-high text-white' : 'text-on-variant hover:bg-surface-container hover:text-white',
                active && 'border-l-4 border-primary pl-2'
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium text-on-variant transition-colors hover:bg-surface-container hover:text-white"
      >
        <LogOut size={18} />
        Sair
      </button>
    </aside>
  );
}
