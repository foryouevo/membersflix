'use client';

import { Bell, Search } from 'lucide-react';
import { initials } from '@/lib/utils';
import type { Profile } from '@/types';

export default function AdminTopbar({
  profile,
  searchPlaceholder,
}: {
  profile: Pick<Profile, 'nome' | 'avatar_url'>;
  searchPlaceholder?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-4 border-b border-border/60 bg-surface-lowest px-8 py-4">
      {searchPlaceholder && (
        <div className="relative w-64">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-variant" />
          <input placeholder={searchPlaceholder} className="input-field py-2 pl-9 text-sm" />
        </div>
      )}
      <button className="text-on-variant hover:text-white">
        <Bell size={20} />
      </button>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
        {initials(profile.nome || 'Admin')}
      </div>
    </div>
  );
}
