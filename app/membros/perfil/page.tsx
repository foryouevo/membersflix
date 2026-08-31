import { redirect } from 'next/navigation';
import Image from 'next/image';
import { GraduationCap, PlayCircle, TrendingUp, MessageCircle, UserRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { initials, buildSupportWhatsappLink } from '@/lib/utils';
import AlterarSenhaButton from '@/components/membros/AlterarSenhaButton';
import EditarPerfilModal from '@/components/membros/EditarPerfilModal';

export default async function PerfilPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, email, telefone, avatar_url, status_pagamento, created_at, liberado_em')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) redirect('/membros/vitrine');

  const [{ data: acessosRaw }, { data: aulas }, { data: progresso }] = await Promise.all([
    supabase.from('acessos_curso').select('curso_id, bloqueado').eq('aluno_id', user.id),
    supabase.from('aulas').select('id, modulo:modulos(curso_id)'),
    // atualizado_em a mais (antes só concluida): usado pra calcular "aulas
    // concluídas este mês", o badge do card de estatísticas — ver abaixo.
    supabase.from('progresso_aulas').select('concluida, atualizado_em').eq('aluno_id', user.id),
  ]);

  const meusCursoIds = (acessosRaw ?? []).filter((a) => !a.bloqueado).map((a) => a.curso_id);
  const meusCursoIdsSet = new Set(meusCursoIds);

  // Progresso geral: aulas concluídas / total de aulas somando só os cursos
  // que o aluno de fato tem acesso hoje (não conta aulas de cursos que ele
  // nunca teve ou que foram bloqueados).
  let totalAulasDosMeusCursos = 0;
  for (const a of aulas ?? []) {
    const cursoId = (a as any).modulo?.curso_id;
    if (cursoId && meusCursoIdsSet.has(cursoId)) totalAulasDosMeusCursos++;
  }
  const progressoRows = progresso ?? [];
  const aulasConcluidas = progressoRows.filter((p) => p.concluida).length;
  const progressoGeralPct = totalAulasDosMeusCursos > 0 ? Math.round((aulasConcluidas / totalAulasDosMeusCursos) * 100) : 0;

  // Badge "+N este mês" no card de aulas concluídas — real, calculado a
  // partir de atualizado_em (não fabricado). Os outros dois cards não têm
  // um "delta" que dê pra calcular de verdade sem guardar um histórico que
  // não existe hoje (nº de cursos e % geral são "estado atual", não um
  // total acumulado ao longo do tempo), por isso ficam sem badge.
  const inicioDoMes = new Date();
  inicioDoMes.setDate(1);
  inicioDoMes.setHours(0, 0, 0, 0);
  const aulasConcluidasEsteMes = progressoRows.filter((p) => p.concluida && new Date(p.atualizado_em) >= inicioDoMes).length;

  // numero_whatsapp isolado com checagem de erro (mesmo padrão já usado em
  // app/login/page.tsx e app/membros/vitrine/page.tsx) — sem suporte
  // configurado, o botão "Falar com o suporte" só fica desabilitado, nunca
  // quebra a página.
  let numeroWhatsapp: string | null = null;
  try {
    const { data: config, error } = await supabase.from('configuracoes').select('numero_whatsapp').eq('id', 1).maybeSingle();
    if (error) console.error('[perfil] Falha ao buscar numero_whatsapp:', error.message);
    else numeroWhatsapp = config?.numero_whatsapp ?? null;
  } catch (err) {
    console.error('[perfil] Erro inesperado ao buscar numero_whatsapp:', err);
  }

  // Trial: só existe prazo de "vencimento" pra quem está pendente (30min a
  // partir de liberado_em — mesma regra do middleware.ts). Pra quem já está
  // "pago" não existe campo nenhum de data de renovação/assinatura recorrente
  // no sistema hoje (não é um modelo de cobrança automática) — por isso só
  // mostramos essa linha condicionalmente, sem inventar uma data.
  const trialExpiraEm =
    profile.status_pagamento === 'pendente' ? new Date(new Date(profile.liberado_em).getTime() + 30 * 60 * 1000) : null;

  const suporteLink = numeroWhatsapp ? buildSupportWhatsappLink(numeroWhatsapp, 'Olá, preciso de suporte com minha conta.') : null;

  return (
    <div className="p-4 sm:p-16">
      <h1 className="mb-6 text-2xl font-bold text-white">Meu Perfil</h1>

      <div className="mx-auto max-w-5xl space-y-6">
        {/* Perfil + Informações da Conta lado a lado em telas médias/grandes,
            empilhados no mobile — grid estica os dois pra mesma altura por
            padrão. */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Card Perfil: fundo neutro igual aos outros cards — só o anel
              vermelho ao redor do avatar como destaque (sem gradiente de
              fundo). */}
          <div className="flex flex-col items-center justify-center rounded-lg bg-card p-6 text-center">
            {profile.avatar_url ? (
              <div className="relative h-20 w-20 overflow-hidden rounded-full ring-4 ring-primary/70 ring-offset-4 ring-offset-card">
                <Image src={profile.avatar_url} alt={profile.nome} fill className="object-cover" />
              </div>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 text-xl font-semibold text-primary ring-4 ring-primary/70 ring-offset-4 ring-offset-card">
                {initials(profile.nome)}
              </div>
            )}

            <p className="mt-4 text-lg font-semibold text-white">{profile.nome}</p>

            <span
              className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                profile.status_pagamento === 'pago' ? 'bg-primary text-white' : 'bg-secondary-container text-secondary'
              }`}
            >
              {profile.status_pagamento === 'pago' ? 'Pago' : 'Pendente'}
            </span>

            {/* Progresso geral: soma de todos os cursos que o aluno possui.
                Só aparece se ele tiver pelo menos 1 curso com aula
                cadastrada — sem isso, "0%" seria enganoso (não é que ele não
                progrediu, é que não tem o que progredir ainda). */}
            {totalAulasDosMeusCursos > 0 && (
              <div className="mt-5 w-full">
                <div className="mb-1.5 flex items-center justify-between text-xs text-on-variant">
                  <span>Progresso geral</span>
                  <span className="font-semibold text-primary">{progressoGeralPct}% concluído</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-high">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressoGeralPct}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Card Informações da Conta */}
          <div className="rounded-lg bg-card p-6">
            <div className="mb-4 flex items-center gap-2 text-white">
              <UserRound size={18} className="text-primary" />
              <h2 className="font-semibold">Informações da Conta</h2>
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
              {trialExpiraEm && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-on-variant">Trial expira em</dt>
                  <dd className="mt-0.5 text-sm text-white">
                    {trialExpiraEm.toLocaleDateString('pt-BR')} às{' '}
                    {trialExpiraEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-border/60 pt-5">
              <AlterarSenhaButton />
              <EditarPerfilModal nomeAtual={profile.nome} telefoneAtual={profile.telefone ?? ''} avatarAtual={profile.avatar_url} />
              {suporteLink ? (
                <a href={suporteLink} target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-2">
                  <MessageCircle size={16} />
                  Falar com o suporte
                </a>
              ) : (
                <span
                  title="Número de suporte não configurado pelo admin"
                  className="btn-secondary flex cursor-not-allowed items-center gap-2 opacity-60"
                >
                  <MessageCircle size={16} />
                  Falar com o suporte
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Estatísticas: ícone num círculo vermelho translúcido, badge
            opcional ao lado, label em maiúsculas, número grande embaixo. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-card p-5">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
              <GraduationCap size={22} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-on-variant">Cursos</p>
            <p className="mt-1 text-3xl font-bold text-white">{meusCursoIds.length}</p>
          </div>

          <div className="rounded-lg bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
                <PlayCircle size={22} />
              </div>
              {aulasConcluidasEsteMes > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[0.65rem] font-semibold text-primary">
                  +{aulasConcluidasEsteMes} este mês
                </span>
              )}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-on-variant">Aulas Concluídas</p>
            <p className="mt-1 text-3xl font-bold text-white">{aulasConcluidas}</p>
          </div>

          <div className="rounded-lg bg-card p-5">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
              <TrendingUp size={22} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-on-variant">Progresso Geral</p>
            <p className="mt-1 text-3xl font-bold text-primary">{progressoGeralPct}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
