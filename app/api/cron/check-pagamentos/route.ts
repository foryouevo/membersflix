import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Fallback ao pg_cron (ver supabase/migrations/012_cadastro_publico.sql).
// Configurado em vercel.json — hoje roda 1x/dia (0 6 * * *): pra uma janela
// de trial de 30min isso só funciona como fallback grosseiro; a granularidade
// real vem do bloqueio em tempo real (lib/membros/trial.ts, chamado pelo
// middleware) e do pg_cron (a cada 5min direto no Postgres).
//
// Só bloqueio POR CURSO: trial vencido (liberado_em + 30min) de conta com
// pagamento pendente bloqueia aquele acesso (acessos_curso.bloqueado), nunca
// a conta inteira — a antiga regra de bloqueio de conta pós-trial foi
// removida (o aluno continua logando/navegando normalmente).
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const trintaMinAtras = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: contasPendentes, error: erroBusca } = await admin.from('profiles').select('id').eq('status_pagamento', 'pendente');
  if (erroBusca) {
    return NextResponse.json({ error: erroBusca.message }, { status: 500 });
  }

  let acessosBloqueados = 0;
  const ids = (contasPendentes ?? []).map((p: { id: string }) => p.id);
  if (ids.length > 0) {
    const { data, error } = await admin
      .from('acessos_curso')
      .update({ bloqueado: true })
      .in('aluno_id', ids)
      .eq('bloqueado', false)
      .lt('liberado_em', trintaMinAtras)
      .select('id');
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    acessosBloqueados = data?.length ?? 0;
  }

  return NextResponse.json({ acessosCursoBloqueados: acessosBloqueados });
}
