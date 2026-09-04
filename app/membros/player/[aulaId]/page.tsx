import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PlayerPageClient from '@/components/membros/PlayerPageClient';

export default async function PlayerPage({ params }: { params: { aulaId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS garante que só retorna a aula se o aluno tiver acesso liberado ao curso.
  const { data: aula } = (await supabase
    .from('aulas')
    .select('*, documentos(*), modulo:modulos(*, curso:cursos(*))')
    .eq('id', params.aulaId)
    .maybeSingle()) as { data: any };

  if (!aula) notFound();

  const modulo = (aula as any).modulo;
  const curso = modulo?.curso;
  if (!modulo || !curso) notFound();

  const { data: todosModulos } = await supabase
    .from('modulos')
    .select('*, aulas(*)')
    .eq('curso_id', curso.id)
    .order('ordem');

  const { data: progresso } = await supabase.from('progresso_aulas').select('aula_id, concluida, segundo_atual').eq('aluno_id', user!.id);
  const progressoPorAula = new Map((progresso ?? []).map((p: any) => [p.aula_id, p]));

  // video_url nunca sai daqui pro client — nem o da aula atual, nem o das
  // outras aulas do curso (que também apareceriam na lista lateral se não
  // fossem removidos). O VideoPlayer busca a URL sob demanda via
  // /api/membros/aulas/[aulaId]/video só quando precisa tocar o vídeo.
  // Módulo "pai" (guarda-chuva) nunca tem aula própria — filtrado aqui pra
  // não contar como uma posição a mais em "Módulo X" no cabeçalho do player
  // (ver numeroModulo em PlayerPageClient) nem aparecer com uma lista de
  // aulas vazia em lugar nenhum.
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
  const indiceAtual = todasAulasOrdenadas.findIndex((a: any) => a.id === aula.id);
  if (indiceAtual === -1) redirect(`/membros/curso/${curso.id}`);

  const aulaAnteriorId = indiceAtual > 0 ? todasAulasOrdenadas[indiceAtual - 1].id : null;
  const proximaAulaId = indiceAtual < todasAulasOrdenadas.length - 1 ? todasAulasOrdenadas[indiceAtual + 1].id : null;
  const posicaoInicial = progressoPorAula.get(aula.id)?.segundo_atual ?? 0;
  const { video_url: _videoUrl, ...aulaSemVideoUrl } = aula as any;

  return (
    <PlayerPageClient
      curso={curso}
      modulo={modulo}
      aula={aulaSemVideoUrl}
      documentos={(aula as any).documentos ?? []}
      modulos={modulosComStatus as any}
      aulaAnteriorId={aulaAnteriorId}
      proximaAulaId={proximaAulaId}
      posicaoInicial={posicaoInicial}
    />
  );
}
