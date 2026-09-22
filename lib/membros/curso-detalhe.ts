import type { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Aula, Documento, Modulo } from '@/types';

export type ModuloComAulas = Modulo & { aulas: (Aula & { documentos: Documento[]; concluida: boolean })[] };

export type CursoDetalheDados = {
  hasAccess: boolean;
  modulos: ModuloComAulas[];
  trialModuloUnicoId: string | null;
  totalAulas: number;
  concluidas: number;
  jaComecou: boolean;
  proximaAula: { id: string; slug: string } | null;
};

/**
 * Busca módulos/aulas/progresso/trial de um curso já resolvido (por id ou
 * por slug — quem chama já fez essa parte, ver app/membros/curso/[id]/
 * page.tsx e app/(portal)/curso/[slug]/page.tsx) — corpo idêntico ao que
 * cada uma dessas duas páginas tinha antes, extraído aqui pra não duplicar
 * (a única coisa que muda entre as duas rotas é COMO o `cursoId` é
 * descoberto a partir da URL, não o que fazer depois de tê-lo).
 */
export async function carregarCursoDetalhe(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  cursoId: string
): Promise<CursoDetalheDados> {
  const { data: acesso } = (await supabase
    .from('acessos_curso')
    .select('bloqueado')
    .eq('aluno_id', userId)
    .eq('curso_id', cursoId)
    .maybeSingle()) as { data: any };

  const hasAccess = !!acesso && !acesso.bloqueado;

  let modulos: any[] = [];
  let jaComecou = false;
  // Durante o trial de 30min (status_pagamento = 'pendente'), só o módulo de
  // menor `ordem` fica acessível — calculado aqui só pro cadeado visual dos
  // outros módulos. A trava de verdade é a RLS de `aulas`/`documentos` (ver
  // supabase/migrations/004_trial_30min_modulo1.sql): mesmo que o aluno
  // acesse a URL de uma aula de outro módulo direto, a query volta vazia.
  let trialModuloUnicoId: string | null = null;

  if (hasAccess) {
    const [{ data }, { data: progresso }, { data: profileTrial }] = (await Promise.all([
      supabase.from('modulos').select('*, aulas(*, documentos(*))').eq('curso_id', cursoId).order('ordem'),
      supabase.from('progresso_aulas').select('aula_id, concluida').eq('aluno_id', userId).eq('curso_id', cursoId),
      supabase.from('profiles').select('status_pagamento').eq('id', userId).maybeSingle(),
    ])) as [{ data: any[] | null }, { data: any[] | null }, { data: { status_pagamento: string } | null }];
    modulos = data ?? [];

    const concluidaPorAula = new Map((progresso ?? []).map((p: any) => [p.aula_id, p.concluida]));
    jaComecou = (progresso?.length ?? 0) > 0;

    modulos = modulos.map((m) => ({
      ...m,
      aulas: (m.aulas ?? [])
        .sort((a: any, b: any) => a.ordem - b.ordem)
        .map((a: any) => ({ ...a, concluida: concluidaPorAula.get(a.id) ?? false })),
    }));

    // Módulo "pai" (guarda-chuva) nunca tem aula própria — não faz sentido
    // como "o Módulo 1 liberado" do trial.
    if (profileTrial?.status_pagamento === 'pendente') {
      const idsComFilho = new Set(modulos.map((m) => m.modulo_pai_id).filter(Boolean));
      const folhas = modulos.filter((m) => !idsComFilho.has(m.id));
      if (folhas.length > 0) {
        trialModuloUnicoId = folhas.reduce((min: any, m: any) => (m.ordem < min.ordem ? m : min), folhas[0]).id;
      }
    }
  } else {
    // Estrutura só com títulos (sem video_url/documentos) para exibir o índice mesmo sem acesso.
    const admin = createAdminClient();
    const { data } = await admin
      .from('modulos')
      .select('id, curso_id, titulo, capa_url, ordem, modulo_pai_id, aulas(id, slug, titulo, ordem, duracao_segundos)')
      .eq('curso_id', cursoId)
      .order('ordem');
    modulos = (data ?? []).map((m: any) => ({
      ...m,
      aulas: (m.aulas ?? [])
        .sort((a: any, b: any) => a.ordem - b.ordem)
        .map((a: any) => ({ ...a, documentos: [], concluida: false })),
    }));
  }

  const todasAulas = modulos.flatMap((m) => m.aulas);
  const totalAulas = todasAulas.length;
  const concluidas = todasAulas.filter((a: any) => a.concluida).length;
  const proximaAulaRow = todasAulas.find((a: any) => !a.concluida) ?? todasAulas[0] ?? null;

  return {
    hasAccess,
    modulos: modulos as ModuloComAulas[],
    trialModuloUnicoId,
    totalAulas,
    concluidas,
    jaComecou,
    proximaAula: proximaAulaRow ? { id: proximaAulaRow.id, slug: proximaAulaRow.slug } : null,
  };
}
