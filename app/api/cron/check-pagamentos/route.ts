import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Fallback ao pg_cron (ver supabase/schema.sql). Configurado em vercel.json
// para rodar a cada 5 minutos. Aplica a Regra 1: pendente há mais de 30min
// (trial) vira bloqueado.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const trintaMinAtras = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from('profiles')
    .update({ bloqueado: true })
    .eq('status_pagamento', 'pendente')
    .eq('bloqueado', false)
    .lt('liberado_em', trintaMinAtras)
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bloqueados: data?.length ?? 0 });
}
