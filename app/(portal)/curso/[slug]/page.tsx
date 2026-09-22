import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CursoDetalheClient from '@/components/membros/CursoDetalheClient';
import { carregarCursoDetalhe } from '@/lib/membros/curso-detalhe';

// Rota NOVA (/curso/[slug], pedido explícito) — mesma página/lógica de
// app/membros/curso/[id]/page.tsx (que continua existindo, agora só por
// id), reaproveitando o MESMO CursoDetalheClient e a MESMA busca de
// módulos/aulas (lib/membros/curso-detalhe.ts); a única diferença real é
// resolver o curso por `slug` em vez de `id`, e passar `hrefsPorAula`
// (nova prop de CursoDetalheClient) pra cada aula linkar pra
// /curso/[slug-do-curso]/[slug-da-aula] em vez de /membros/player/[id].
export default async function CursoDetalheSlugPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: curso }, { data: config }] = (await Promise.all([
    supabase.from('cursos').select('*, categoria:categorias(*)').eq('slug', params.slug).maybeSingle(),
    supabase.from('configuracoes').select('numero_whatsapp').eq('id', 1).maybeSingle(),
  ])) as [{ data: any }, { data: any }];

  if (!curso) notFound();

  const detalhe = await carregarCursoDetalhe(supabase, user!.id, curso.id);

  // Dicionário aulaId -> href, montado AQUI (Server Component) — não uma
  // função passada como prop (CursoDetalheClient é 'use client'; função
  // não atravessa essa fronteira). Cobre TODAS as aulas do curso (cada
  // módulo já vem com sua lista de aulas em detalhe.modulos). a.slug ||
  // fallback: se a migration 011 (coluna slug em AULAS) ainda não rodou
  // em produção, a.slug vem undefined mesmo com curso.slug ok (são
  // colunas/tabelas diferentes) — sem o fallback o link virava
  // "/curso/slug-certo/undefined" (404).
  const hrefsPorAula = Object.fromEntries(
    detalhe.modulos
      .flatMap((m) => m.aulas)
      .map((a) => [a.id, a.slug ? `/curso/${curso.slug}/${a.slug}` : `/membros/player/${a.id}`])
  );

  return (
    <CursoDetalheClient curso={curso} numeroWhatsapp={config?.numero_whatsapp ?? null} hrefsPorAula={hrefsPorAula} {...detalhe} />
  );
}
