import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Fallback ao pg_cron (ver supabase/schema.sql). Configurado em vercel.json
// — hoje roda 1x/dia (0 6 * * *), não a cada 5min: pra uma janela de trial
// de 30min, isso só funciona de verdade como um fallback grosseiro; quem
// garante a granularidade real é o pg_cron (supabase/schema.sql +
// supabase/migrations/012_cadastro_publico.sql), que roda a cada 5min
// direto no Postgres.
//
// Duas regras, mesma origem-dependente que as funções SQL equivalentes
// (ver migration 012): Regra 1 bloqueia a CONTA INTEIRA (cadastro_publico
// = false — alunos criados pelo admin); Regra 3 (nova) bloqueia só o
// ACESSO AO CURSO (cadastro_publico = true — cadastro público na tela de
// login), sem afetar login/navegação dessas contas.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const trintaMinAtras = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  // Regra 1: conta inteira, só pra quem NÃO é de cadastro público (mesmo
  // comportamento de sempre — só ganhou o filtro extra). `as any`:
  // types/database.types.ts (gerado) ainda não conhece `cadastro_publico`
  // (migration 012) — mesmo cast usado em todo lugar que lida com coluna
  // de migration pendente neste projeto (ver `slug`).
  const { data: contasBloqueadas, error: erroContas } = await (admin.from('profiles') as any)
    .update({ bloqueado: true })
    .eq('status_pagamento', 'pendente')
    .eq('bloqueado', false)
    .eq('cadastro_publico', false)
    .lt('liberado_em', trintaMinAtras)
    .select('id');

  if (erroContas) {
    return NextResponse.json({ error: erroContas.message }, { status: 500 });
  }

  // Regra 3 (nova): só o curso, só pra cadastro público. Precisa dos ids
  // dessas contas primeiro (não dá pra fazer update+join direto via
  // PostgREST) — poucas linhas esperadas, sem preocupação de escala aqui.
  const { data: contasPendentesPublicas, error: erroBusca } = await (admin.from('profiles') as any)
    .select('id')
    .eq('status_pagamento', 'pendente')
    .eq('cadastro_publico', true);

  if (erroBusca) {
    return NextResponse.json({ error: erroBusca.message }, { status: 500 });
  }

  let acessosBloqueados: { id: string }[] | null = [];
  const idsPendentesPublicos = (contasPendentesPublicas ?? []).map((p: { id: string }) => p.id);
  if (idsPendentesPublicos.length > 0) {
    const { data, error: erroAcessos } = await admin
      .from('acessos_curso')
      .update({ bloqueado: true })
      .in('aluno_id', idsPendentesPublicos)
      .eq('bloqueado', false)
      .lt('liberado_em', trintaMinAtras)
      .select('id');

    if (erroAcessos) {
      return NextResponse.json({ error: erroAcessos.message }, { status: 500 });
    }
    acessosBloqueados = data;
  }

  return NextResponse.json({
    contasBloqueadas: contasBloqueadas?.length ?? 0,
    acessosCursoBloqueados: acessosBloqueados?.length ?? 0,
  });
}
