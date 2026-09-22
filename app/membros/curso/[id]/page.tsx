import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CursoDetalheClient from '@/components/membros/CursoDetalheClient';
import { carregarCursoDetalhe } from '@/lib/membros/curso-detalhe';

export default async function CursoDetalhePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: curso }, { data: config }] = (await Promise.all([
    supabase.from('cursos').select('*, categoria:categorias(*)').eq('id', params.id).maybeSingle(),
    supabase.from('configuracoes').select('numero_whatsapp').eq('id', 1).maybeSingle(),
  ])) as [{ data: any }, { data: any }];

  if (!curso) notFound();

  // Módulos/aulas/progresso/trial: lógica extraída pra
  // lib/membros/curso-detalhe.ts, reaproveitada também por
  // app/(portal)/curso/[slug]/page.tsx (mesma busca, só muda como o
  // cursoId é descoberto a partir da URL — por id aqui, por slug lá).
  const detalhe = await carregarCursoDetalhe(supabase, user!.id, curso.id);

  return (
    <CursoDetalheClient
      curso={curso}
      numeroWhatsapp={config?.numero_whatsapp ?? null}
      // Sem hrefsPorAula: cai no fallback de CursoDetalheClient, que já
      // aponta pra rota por slug (/curso/[slug-do-curso]/[slug-da-aula])
      // — só a rota nova (app/(portal)/curso/[slug]/page.tsx) passa um
      // dicionário explícito em vez de depender do fallback.
      {...detalhe}
    />
  );
}
