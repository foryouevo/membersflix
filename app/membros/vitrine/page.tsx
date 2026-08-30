import { createClient } from '@/lib/supabase/server';
import VitrinePageClient from '@/components/membros/VitrinePageClient';

export default async function VitrinePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: cursos }, { data: acessosRaw }, { data: aulas }, { data: progresso }, { data: config }] = await Promise.all([
    supabase.from('cursos').select('*').eq('status', 'active').order('ordem'),
    supabase.from('acessos_curso').select('curso_id, bloqueado').eq('aluno_id', user!.id),
    supabase.from('aulas').select('id, modulo:modulos(curso_id)'),
    supabase.from('progresso_aulas').select('curso_id, concluida').eq('aluno_id', user!.id),
    supabase.from('configuracoes').select('numero_whatsapp, banner_plataforma_url').eq('id', 1).maybeSingle(),
  ]);

  const acessos = new Map<string, boolean>((acessosRaw ?? []).map((a) => [a.curso_id, !a.bloqueado]));

  const totalAulasPorCurso = new Map<string, number>();
  for (const a of aulas ?? []) {
    const cursoId = (a as any).modulo?.curso_id;
    if (!cursoId) continue;
    totalAulasPorCurso.set(cursoId, (totalAulasPorCurso.get(cursoId) ?? 0) + 1);
  }

  const concluidasPorCurso = new Map<string, number>();
  for (const p of progresso ?? []) {
    if (p.concluida) concluidasPorCurso.set(p.curso_id, (concluidasPorCurso.get(p.curso_id) ?? 0) + 1);
  }

  const progressoPorCurso = new Map<string, number>();
  for (const [cursoId, total] of totalAulasPorCurso) {
    const concluidas = concluidasPorCurso.get(cursoId) ?? 0;
    progressoPorCurso.set(cursoId, total > 0 ? Math.round((concluidas / total) * 100) : 0);
  }

  const todosCursos = cursos ?? [];
  const meusCursos = todosCursos.filter((c) => acessos.get(c.id));

  return (
    <VitrinePageClient
      meusCursos={meusCursos}
      todosCursos={todosCursos}
      acessos={Object.fromEntries(acessos)}
      progressoPorCurso={Object.fromEntries(progressoPorCurso)}
      numeroWhatsapp={config?.numero_whatsapp ?? null}
      bannerPlataformaUrl={config?.banner_plataforma_url ?? null}
    />
  );
}
