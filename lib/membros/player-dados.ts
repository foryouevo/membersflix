import type { createClient } from '@/lib/supabase/server';

/**
 * Módulos/progresso/aula-anterior/próxima-aula de uma aula já resolvida
 * (por id ou por slug — quem chama já fez essa parte e já validou que a
 * aula pertence ao curso certo, ver app/membros/player/[aulaId]/page.tsx e
 * app/(portal)/curso/[slug]/[aulaSlug]/page.tsx) — corpo idêntico ao que a
 * página clássica já tinha, extraído aqui pra não duplicar quando a rota
 * nova precisou do mesmíssimo cálculo.
 */
export async function carregarPlayerDados(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  cursoId: string,
  aulaAtualId: string
) {
  const { data: todosModulos } = await supabase.from('modulos').select('*, aulas(*)').eq('curso_id', cursoId).order('ordem');

  const { data: progresso } = await supabase.from('progresso_aulas').select('aula_id, concluida, segundo_atual').eq('aluno_id', userId);
  const progressoPorAula = new Map((progresso ?? []).map((p: any) => [p.aula_id, p]));

  // video_url nunca sai daqui pro client — nem o da aula atual, nem o das
  // outras aulas do curso (que também apareceriam na lista lateral se não
  // fossem removidos). O VideoPlayer busca a URL sob demanda via
  // /api/membros/aulas/[aulaId]/video só quando precisa tocar o vídeo.
  // Módulo "pai" (guarda-chuva) nunca tem aula própria — filtrado aqui pra
  // não contar como uma posição a mais em "Módulo X" no cabeçalho do
  // player (ver numeroModulo em PlayerPageClient) nem aparecer com uma
  // lista de aulas vazia em lugar nenhum.
  const idsComFilho = new Set((todosModulos ?? []).map((m: any) => m.modulo_pai_id).filter(Boolean));
  const modulosComStatus = (todosModulos ?? [])
    .filter((m: any) => !idsComFilho.has(m.id))
    .map((m: any) => ({
      ...m,
      aulas: (m.aulas ?? [])
        .sort((a: any, b: any) => a.ordem - b.ordem)
        .map(({ video_url, ...a }: any) => ({ ...a, concluida: progressoPorAula.get(a.id)?.concluida ?? false })),
    }));

  const todasAulasOrdenadas = modulosComStatus.flatMap((m: any) => m.aulas);
  const indiceAtual = todasAulasOrdenadas.findIndex((a: any) => a.id === aulaAtualId);

  const aulaAnterior = indiceAtual > 0 ? todasAulasOrdenadas[indiceAtual - 1] : null;
  const proximaAula = indiceAtual >= 0 && indiceAtual < todasAulasOrdenadas.length - 1 ? todasAulasOrdenadas[indiceAtual + 1] : null;
  const posicaoInicial = progressoPorAula.get(aulaAtualId)?.segundo_atual ?? 0;

  return { modulosComStatus, indiceAtual, aulaAnterior, proximaAula, posicaoInicial };
}
