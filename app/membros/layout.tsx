import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MembrosSidebar from '@/components/membros/MembrosSidebar';

export default async function MembrosLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: config }] = await Promise.all([
    supabase.from('profiles').select('nome, email, avatar_url, tipo').eq('id', user.id).maybeSingle(),
    supabase.from('configuracoes').select('numero_whatsapp').eq('id', 1).maybeSingle(),
  ]);

  if (!profile || profile.tipo !== 'aluno') redirect('/admin/dashboard');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <MembrosSidebar profile={profile} numeroWhatsapp={config?.numero_whatsapp ?? null} />
      {/* pb-24 só no mobile: espaço pra bottom nav flutuante (fixed,
          ~h-11 de ícone + padding + bottom-4 de respiro) não cobrir o fim do
          conteúdo ao rolar até o fim da página. md:pb-0 porque lá o menu é
          o <aside> lateral (MembrosSidebar), sem nada fixo por cima do
          conteúdo. */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0">{children}</main>
    </div>
  );
}
