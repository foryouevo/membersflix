import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PlayerPageClient from '@/components/membros/PlayerPageClient';
import { carregarPlayerDados } from '@/lib/membros/player-dados';

export default async function PlayerPage({ params }: { params: { aulaId: string } }) {
  // DIAGNÓSTICO TEMPORÁRIO (investigação de travamento na tela da aula,
  // remover depois de identificar a causa) — mantido aqui como já estava;
  // não fazia parte do escopo desta tarefa de rotas/slugs.
  const inicio = Date.now();
  console.log(`[PlayerPage] iniciando carregamento da página (aula ${params.aulaId})`);

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

  console.log(`[PlayerPage] aula resolvida em ${Date.now() - inicio}ms (aula ${params.aulaId}, encontrada=${!!aula})`);

  if (!aula) notFound();

  const modulo = (aula as any).modulo;
  const curso = modulo?.curso;
  if (!modulo || !curso) notFound();

  // Módulos/progresso/aula-anterior/próxima: lógica extraída pra
  // lib/membros/player-dados.ts, reaproveitada também por
  // app/(portal)/curso/[slug]/[aulaSlug]/page.tsx.
  const { modulosComStatus, indiceAtual, aulaAnterior, proximaAula, posicaoInicial } = await carregarPlayerDados(
    supabase,
    user!.id,
    curso.id,
    aula.id
  );
  // curso.slug || fallback pro id: mesma proteção usada em todo lugar que
  // monta link por slug — enquanto a migration 011 não rodar em produção.
  if (indiceAtual === -1) redirect(curso.slug ? `/curso/${curso.slug}` : `/membros/curso/${curso.id}`);

  const { video_url: _videoUrl, ...aulaSemVideoUrl } = aula as any;

  console.log(
    `[PlayerPage] dados completos em ${Date.now() - inicio}ms (aula ${params.aulaId}, módulos=${modulosComStatus.length}) — renderizando PlayerPageClient`
  );

  return (
    <PlayerPageClient
      curso={curso}
      modulo={modulo}
      aula={aulaSemVideoUrl}
      documentos={(aula as any).documentos ?? []}
      modulos={modulosComStatus as any}
      // Sem hrefsPorAula/hrefCurso: usa os defaults/fallback de
      // PlayerPageClient, que já apontam pra rota por slug
      // (/curso/[slug]/[slug-da-aula] e /curso/[slug]) — só a rota nova
      // (app/(portal)/curso/[slug]/[aulaSlug]/page.tsx) passa um
      // dicionário explícito em vez de depender do fallback.
      aulaAnterior={aulaAnterior ? { id: aulaAnterior.id, slug: aulaAnterior.slug } : null}
      proximaAula={proximaAula ? { id: proximaAula.id, slug: proximaAula.slug } : null}
      posicaoInicial={posicaoInicial}
    />
  );
}
