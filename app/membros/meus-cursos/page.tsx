import { createClient } from '@/lib/supabase/server';
import MeusCursosClient from '@/components/membros/MeusCursosClient';
import type { Curso } from '@/types';

export default async function MeusCursosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: acessos }, { data: aulas }, { data: progresso }, { data: config }] = (await Promise.all([
    supabase.from('acessos_curso').select('curso_id, bloqueado, curso:cursos(*)').eq('aluno_id', user!.id),
    supabase.from('aulas').select('id, modulo:modulos(curso_id)'),
    supabase.from('progresso_aulas').select('curso_id, concluida').eq('aluno_id', user!.id),
    supabase.from('configuracoes').select('numero_whatsapp').eq('id', 1).maybeSingle(),
  ])) as [{ data: any[] | null }, { data: any[] | null }, { data: any[] | null }, { data: { numero_whatsapp: string | null } | null }];

  const totalPorCurso = new Map<string, number>();
  for (const a of aulas ?? []) {
    const cursoId = (a as any).modulo?.curso_id;
    if (!cursoId) continue;
    totalPorCurso.set(cursoId, (totalPorCurso.get(cursoId) ?? 0) + 1);
  }
  const concluidasPorCurso = new Map<string, number>();
  for (const p of (progresso ?? []) as any[]) {
    if (p.concluida) concluidasPorCurso.set(p.curso_id, (concluidasPorCurso.get(p.curso_id) ?? 0) + 1);
  }

  const cursos: Curso[] = [];
  const progressoPorCurso: Record<string, number> = {};
  const bloqueados: Record<string, boolean> = {};

  for (const a of (acessos ?? []) as any[]) {
    const curso = (a as any).curso as Curso | null;
    if (!curso) continue;
    cursos.push(curso);
    bloqueados[curso.id] = a.bloqueado;
    const total = totalPorCurso.get(curso.id) ?? 0;
    const concluidas = concluidasPorCurso.get(curso.id) ?? 0;
    progressoPorCurso[curso.id] = total > 0 ? Math.round((concluidas / total) * 100) : 0;
  }

  return (
    <MeusCursosClient
      cursos={cursos}
      bloqueados={bloqueados}
      progressoPorCurso={progressoPorCurso}
      numeroWhatsapp={config?.numero_whatsapp ?? null}
    />
  );
}
