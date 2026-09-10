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
 * Usada tanto no banner da Home (VitrinePageClient, só lê `cursoId`) quanto
 * no card "Continuar Assistindo" da tela de perfil (lê os campos extras
 * também) — extraída aqui pra não duplicar essa lógica de "qual é a
 * próxima aula" nos dois lugares.
 *
 * `moduloId`/`numeroModulo`/`numeroAulaNoModulo`/`totalAulasNoModulo`: este
 * helper não considera hierarquia de módulo-pai/filho (ver
 * modulo_pai_id, migrations/007_modulo_pai.sql) — a lista de módulos do
 * curso é tratada como uma fileira só, ordenada por `ordem`, igual já era
 * antes desta tarefa. "Módulo X" aqui é a posição NESSA fileira simples,
 * não necessariamente idêntica à numeração hierárquica que
 * PlayerPageClient.tsx mostra (que trata pai/filho separadamente) — mesma
 * simplificação que este helper já tinha pro título do módulo.
 */
export async function calcularContinuarAssistindo(
  supabase: ReturnType<typeof createClient>,
  alunoId: string,
  meusCursoIds: string[],
  fallbackHref = '/membros/vitrine'
): Promise<{
  href: string;
  temProgresso: boolean;
  cursoId: string | null;
  moduloId: string | null;
  aulaId: string | null;
  aulaTitulo: string | null;
  // Descrição real da AULA (aulas.descricao, coluna já existente no
  // schema) — null se a aula não tiver descrição cadastrada; quem exibe
  // decide o que fazer (perfil/page.tsx omite a linha nesse caso, não
  // inventa texto).
  aulaDescricao: string | null;
  moduloTitulo: string | null;
  numeroModulo: number;
  numeroAulaNoModulo: number;
  totalAulasNoModulo: number;
  duracaoSegundos: number;
  segundoAtual: number;
  // Progresso da AULA em si (segundo_atual/duracao_segundos), não o
  // progresso geral do curso — é o que o card "Continuar Assistindo" mostra
  // na própria barrinha da aula.
  progressoPct: number;
}> {
  const { data: progresso } = await supabase
    .from('progresso_aulas')
    .select('curso_id, aula_id, concluida, atualizado_em, segundo_atual')
    .eq('aluno_id', alunoId);

  type ProgressoRow = { curso_id: string; aula_id: string; concluida: boolean; atualizado_em: string; segundo_atual: number };
  const progressoRows = (progresso ?? []) as unknown as ProgressoRow[];
  const temProgresso = progressoRows.length > 0;

  const cursoMaisRecente = progressoRows.reduce<ProgressoRow | null>((mais, p) => {
    if (!mais || new Date(p.atualizado_em).getTime() > new Date(mais.atualizado_em).getTime()) return p;
    return mais;
  }, null);

  const cursoAlvoId = cursoMaisRecente?.curso_id ?? meusCursoIds[0] ?? null;
  const vazio = {
    href: fallbackHref,
    temProgresso,
    cursoId: null,
    moduloId: null,
    aulaId: null,
    aulaTitulo: null,
    aulaDescricao: null,
    moduloTitulo: null,
    numeroModulo: 0,
    numeroAulaNoModulo: 0,
    totalAulasNoModulo: 0,
    duracaoSegundos: 0,
    segundoAtual: 0,
    progressoPct: 0,
  };
  if (!cursoAlvoId) return vazio;

  const { data: modulosAlvo } = await supabase
    .from('modulos')
    .select('id, ordem, titulo, aulas(id, ordem, titulo, descricao, duracao_segundos)')
    .eq('curso_id', cursoAlvoId)
    .order('ordem');

  const concluidaPorAula = new Map(progressoRows.map((p) => [p.aula_id, p.concluida]));
  const todasAulasDoCursoAlvo = (modulosAlvo ?? [])
    .flatMap((m: any) => (m.aulas ?? []).map((a: any) => ({ ...a, moduloId: m.id, moduloOrdem: m.ordem, moduloTitulo: m.titulo })))
    .sort((a: any, b: any) => a.moduloOrdem - b.moduloOrdem || a.ordem - b.ordem);
  const proximaAula = todasAulasDoCursoAlvo.find((a: any) => !concluidaPorAula.get(a.id)) ?? todasAulasDoCursoAlvo[0] ?? null;

  if (!proximaAula) return { ...vazio, cursoId: cursoAlvoId };

  const aulasDoMesmoModulo = todasAulasDoCursoAlvo.filter((a: any) => a.moduloId === proximaAula.moduloId);
  const numeroModulo = (modulosAlvo ?? []).findIndex((m: any) => m.id === proximaAula.moduloId) + 1;
  const numeroAulaNoModulo = aulasDoMesmoModulo.findIndex((a: any) => a.id === proximaAula.id) + 1;

  const progressoDaAula = progressoRows.find((p) => p.aula_id === proximaAula.id);
  const segundoAtual = progressoDaAula?.segundo_atual ?? 0;
  const progressoPct = proximaAula.duracao_segundos > 0 ? Math.min(100, Math.round((segundoAtual / proximaAula.duracao_segundos) * 100)) : 0;

  return {
    href: `/membros/player/${proximaAula.id}`,
    temProgresso,
    cursoId: cursoAlvoId,
    moduloId: proximaAula.moduloId,
    aulaId: proximaAula.id,
    aulaTitulo: proximaAula.titulo,
    aulaDescricao: proximaAula.descricao ?? null,
    moduloTitulo: proximaAula.moduloTitulo,
    numeroModulo,
    numeroAulaNoModulo,
    totalAulasNoModulo: aulasDoMesmoModulo.length,
    duracaoSegundos: proximaAula.duracao_segundos ?? 0,
    segundoAtual,
    progressoPct,
  };
}
