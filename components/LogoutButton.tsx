'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export default function LogoutButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <button onClick={handleLogout} className={cn(className)}>
      {children ?? 'Sair'}
    </button>
  );
}
