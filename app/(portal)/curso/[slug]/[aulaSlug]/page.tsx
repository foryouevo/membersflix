import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PlayerPageClient from '@/components/membros/PlayerPageClient';
import { carregarPlayerDados } from '@/lib/membros/player-dados';

// Rota NOVA (/curso/[slug]/[slug-da-aula], pedido explícito — abre a AULA,
// confirmado: o exemplo do pedido era nome de aula, não de módulo) — mesma
// página/lógica de app/membros/player/[aulaId]/page.tsx (que continua
// existindo, agora só por id), reaproveitando o MESMO PlayerPageClient e a
// MESMA busca de módulos/progresso (lib/membros/player-dados.ts); a única
// diferença real é resolver a aula por `slug` (com o `slug` do curso na
// própria URL conferido contra o curso de verdade da aula, por segurança —
// aulas.slug é único GLOBALMENTE, então o slug do curso na URL não é
// necessário pra achar a aula, mas evita uma URL tipo
// /curso/curso-errado/aula-de-outro-curso "funcionar" por acidente) e
// passar hrefsPorAula/hrefCurso (novas props de PlayerPageClient) pra
// tudo dentro do player continuar nesta mesma família de URLs.
export default async function PlayerSlugPage({ params }: { params: { slug: string; aulaSlug: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS garante que só retorna a aula se o aluno tiver acesso liberado ao curso.
  const { data: aula } = (await supabase
    .from('aulas')
    .select('*, documentos(*), modulo:modulos(*, curso:cursos(*))')
    .eq('slug', params.aulaSlug)
    .maybeSingle()) as { data: any };

  if (!aula) notFound();

  const modulo = (aula as any).modulo;
  const curso = modulo?.curso;
  if (!modulo || !curso || curso.slug !== params.slug) notFound();

  const { modulosComStatus, indiceAtual, aulaAnterior, proximaAula, posicaoInicial } = await carregarPlayerDados(
    supabase,
    user!.id,
    curso.id,
    aula.id
  );
  if (indiceAtual === -1) redirect(`/curso/${curso.slug}`);

  const { video_url: _videoUrl, ...aulaSemVideoUrl } = aula as any;

  // Dicionário aulaId -> href, montado AQUI (Server Component) — não uma
  // função passada como prop (PlayerPageClient é 'use client'; função não
  // atravessa essa fronteira). Cobre TODAS as aulas do curso (cada módulo
  // em modulosComStatus já vem com sua lista de aulas), incluindo
  // aulaAnterior/proximaAula (que são elementos dessa mesma lista). a.slug
  // || fallback: mesma proteção de app/(portal)/curso/[slug]/page.tsx —
  // aulas.slug pode não existir em produção mesmo com cursos.slug ok.
  const hrefsPorAula = Object.fromEntries(
    (modulosComStatus as any[])
      .flatMap((m) => m.aulas)
      .map((a: any) => [a.id, a.slug ? `/curso/${curso.slug}/${a.slug}` : `/membros/player/${a.id}`])
  );

  return (
    <PlayerPageClient
      curso={curso}
      modulo={modulo}
      aula={aulaSemVideoUrl}
      documentos={(aula as any).documentos ?? []}
      modulos={modulosComStatus as any}
      aulaAnterior={aulaAnterior ? { id: aulaAnterior.id, slug: aulaAnterior.slug } : null}
      proximaAula={proximaAula ? { id: proximaAula.id, slug: proximaAula.slug } : null}
      posicaoInicial={posicaoInicial}
      hrefsPorAula={hrefsPorAula}
      hrefCurso={`/curso/${curso.slug}`}
    />
  );
}
