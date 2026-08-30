import { redirect } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { initials } from '@/lib/utils';

export default async function PerfilPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, email, telefone, avatar_url, status_pagamento, created_at')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) redirect('/membros/vitrine');

  return (
    <div className="p-4 sm:p-16">
      <h1 className="mb-6 text-2xl font-bold text-white">Meu Perfil</h1>

      <div className="max-w-lg rounded-lg bg-card p-6">
        <div className="mb-6 flex items-center gap-4">
          {profile.avatar_url ? (
            <div className="relative h-16 w-16 overflow-hidden rounded-full">
              <Image src={profile.avatar_url} alt={profile.nome} fill className="object-cover" />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-lg font-semibold text-primary">
              {initials(profile.nome)}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold text-white">{profile.nome}</p>
            <span
              className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                profile.status_pagamento === 'pago' ? 'bg-primary/20 text-primary' : 'bg-secondary-container text-secondary'
              }`}
            >
              {profile.status_pagamento === 'pago' ? 'Pago' : 'Pendente'}
            </span>
          </div>
        </div>

        <dl className="space-y-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-on-variant">Email</dt>
            <dd className="mt-0.5 text-sm text-white">{profile.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-on-variant">Telefone</dt>
            <dd className="mt-0.5 text-sm text-white">{profile.telefone || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-on-variant">Membro desde</dt>
            <dd className="mt-0.5 text-sm text-white">{new Date(profile.created_at).toLocaleDateString('pt-BR')}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
