import type { createClient } from '@/lib/supabase/server';
import type { Curso } from '@/types';

/**
 * Todos os cursos ativos + acesso/progresso do aluno + WhatsApp — corpo
 * idêntico ao que app/membros/buscar/page.tsx já tinha, extraído aqui pra
 * ser reaproveitado também por app/(portal)/cursos/page.tsx (rota nova
 * /cursos, catálogo completo com busca/filtro — mesmo dado, só o link de
 * cada card muda, ver BuscarPageClient/TodosCursosPorCategoria).
 */
export async function carregarCatalogoCursos(supabase: ReturnType<typeof createClient>, userId: string) {
  const [{ data: cursos }, { data: acessosRaw }, { data: progresso }, { data: config }] = await Promise.all([
    supabase.from('cursos').select('*, categoria:categorias(*)').eq('status', 'active').order('ordem'),
    supabase.from('acessos_curso').select('curso_id, bloqueado').eq('aluno_id', userId),
    supabase.from('progresso_aulas').select('curso_id, concluida').eq('aluno_id', userId),
    supabase.from('configuracoes').select('numero_whatsapp').eq('id', 1).maybeSingle() as any,
  ]);

  const acessos = new Map<string, boolean>((acessosRaw ?? []).map((a: any) => [a.curso_id, !a.bloqueado]));
  const todosCursos = (cursos ?? []) as Curso[];

  // Mesmo raciocínio de app/membros/vitrine/page.tsx: CourseCard só mostra
  // progresso quando hasAccess é true, então o total de aulas só precisa
  // ser calculado pros cursos que o aluno tem acesso — filtra direto na
  // query (via `modulos`) em vez de buscar a tabela `aulas` inteira (mais
  // de 1200 linhas hoje) só pra descartar quase tudo depois.
  const meusCursoIds = todosCursos.filter((c) => acessos.get(c.id)).map((c) => c.id);
  const { data: modulosComAulas } =
    meusCursoIds.length > 0
      ? ((await supabase.from('modulos').select('curso_id, aulas(id)').in('curso_id', meusCursoIds)) as {
          data: { curso_id: string; aulas: { id: string }[] }[] | null;
        })
      : { data: [] as { curso_id: string; aulas: { id: string }[] }[] };

  const totalAulasPorCurso = new Map<string, number>();
  for (const m of modulosComAulas ?? []) {
    totalAulasPorCurso.set(m.curso_id, (totalAulasPorCurso.get(m.curso_id) ?? 0) + (m.aulas ?? []).length);
  }

  const concluidasPorCurso = new Map<string, number>();
  for (const p of (progresso ?? []) as any[]) {
    if (p.concluida) concluidasPorCurso.set(p.curso_id, (concluidasPorCurso.get(p.curso_id) ?? 0) + 1);
  }

  const progressoPorCurso = new Map<string, number>();
  for (const [cursoId, total] of totalAulasPorCurso) {
    const concluidas = concluidasPorCurso.get(cursoId) ?? 0;
    progressoPorCurso.set(cursoId, total > 0 ? Math.round((concluidas / total) * 100) : 0);
  }

  return {
    todosCursos,
    acessos: Object.fromEntries(acessos),
    progressoPorCurso: Object.fromEntries(progressoPorCurso),
    numeroWhatsapp: config?.numero_whatsapp ?? null,
  };
}
