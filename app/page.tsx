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

  // /inicio (era /membros/vitrine — pedido explícito): LoginPageClient.tsx
  // faz router.replace('/') logo após o login, que cai bem aqui — este é
  // o ponto real que decide pra onde o aluno vai depois de logar.
  // /membros/vitrine continua existindo (mesma página, só outra URL — ver
  // app/(portal)/inicio/page.tsx), não precisa mudar mais nada além do
  // destino do redirect.
  redirect(profile?.tipo === 'admin' ? '/admin/dashboard' : '/inicio');
}
