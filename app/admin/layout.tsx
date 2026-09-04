import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, avatar_url, tipo')
    .eq('id', user.id)
.maybeSingle() as { data: any };

  if (!profile || profile.tipo !== 'admin') redirect('/membros/vitrine');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
