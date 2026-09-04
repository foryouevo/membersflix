import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = (await supabase.from('profiles').select('tipo').eq('id', user.id).maybeSingle()) as {
    data: { tipo: string } | null;
  };

  redirect(profile?.tipo === 'admin' ? '/admin/dashboard' : '/membros/vitrine');
}
