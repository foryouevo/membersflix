import type { createClient } from '@/lib/supabase/server';

/**
 * "Retomar de onde parou", entre qualquer curso que o aluno tenha: acha o
 * curso com atividade mais recente (maior `atualizado_em` em
 * progresso_aulas) e, dentro dele, a primeira aula não concluída (ou a
 * primeira aula do curso, se nenhuma foi assistida ainda). Sem nenhum
 * progresso registrado, cai no primeiro curso de `meusCursoIds` (ordem já
 * definida por quem chama). Sem nenhum curso, não tem pra onde "continuar"
 * — cai no fallback informado por quem chama.
 *
 * Usada tanto no banner da Home (VitrinePageClient) quanto no atalho
 * "Continuar assistindo" da tela de perfil — extraída aqui pra não duplicar
 * essa lógica nos dois lugares.
 */
export async function calcularContinuarAssistindo(
  supabase: ReturnType<typeof createClient>,
  alunoId: string,
  meusCursoIds: string[],
  fallbackHref = '/membros/vitrine'
): Promise<{ href: string; temProgresso: boolean }> {
  const { data: progresso } = await supabase
    .from('progresso_aulas')
    .select('curso_id, aula_id, concluida, atualizado_em')
    .eq('aluno_id', alunoId);

  type ProgressoRow = { curso_id: string; aula_id: string; concluida: boolean; atualizado_em: string };
  const progressoRows = (progresso ?? []) as unknown as ProgressoRow[];
  const temProgresso = progressoRows.length > 0;

  const cursoMaisRecente = progressoRows.reduce<ProgressoRow | null>((mais, p) => {
    if (!mais || new Date(p.atualizado_em).getTime() > new Date(mais.atualizado_em).getTime()) return p;
    return mais;
  }, null);

  const cursoAlvoId = cursoMaisRecente?.curso_id ?? meusCursoIds[0] ?? null;
  if (!cursoAlvoId) return { href: fallbackHref, temProgresso };

  const { data: modulosAlvo } = await supabase
    .from('modulos')
    .select('id, ordem, aulas(id, ordem)')
    .eq('curso_id', cursoAlvoId)
    .order('ordem');

  const concluidaPorAula = new Map(progressoRows.map((p) => [p.aula_id, p.concluida]));
  const todasAulasDoCursoAlvo = (modulosAlvo ?? [])
    .flatMap((m: any) => (m.aulas ?? []).map((a: any) => ({ ...a, moduloOrdem: m.ordem })))
    .sort((a: any, b: any) => a.moduloOrdem - b.moduloOrdem || a.ordem - b.ordem);
  const proximaAula = todasAulasDoCursoAlvo.find((a: any) => !concluidaPorAula.get(a.id)) ?? todasAulasDoCursoAlvo[0] ?? null;

  return {
    href: proximaAula ? `/membros/player/${proximaAula.id}` : fallbackHref,
    temProgresso,
  };
}
