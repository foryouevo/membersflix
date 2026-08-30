import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from '@/components/LogoutButton';

export default async function BloqueadoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('status_pagamento, bloqueado')
    .eq('id', user.id)
    .maybeSingle();

  const pendente = profile?.status_pagamento === 'pendente';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <Image src="/logo.png" alt="MembersFlix" width={180} height={36} priority className="mb-8 h-8 w-auto object-contain" />

      <div className="w-full max-w-md rounded-lg border-t-2 border-t-primary bg-card p-8 shadow-overlay">
        <h1 className="mb-3 text-2xl font-bold text-white">
          {pendente ? 'Acesso pendente' : 'Acesso bloqueado'}
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-on-variant">
          {pendente
            ? 'Seu pagamento ainda não foi confirmado e o prazo de liberação temporária expirou. Entre em contato com o suporte para regularizar seu acesso.'
            : 'Sua conta está temporariamente bloqueada. Entre em contato com o suporte para mais informações.'}
        </p>
        <LogoutButton className="btn-secondary w-full" />
      </div>
    </div>
  );
}
