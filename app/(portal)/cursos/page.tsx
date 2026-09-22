import { createClient } from '@/lib/supabase/server';
import BuscarPageClient from '@/components/membros/BuscarPageClient';
import { carregarCatalogoCursos } from '@/lib/membros/catalogo-cursos';

// Rota NOVA (/cursos, pedido explícito) — "catálogo completo com
// busca/filtro de todos os cursos disponíveis na plataforma": é a MESMA
// tela de app/membros/buscar/page.tsx (que continua existindo em
// /membros/buscar), reaproveitando o MESMO BuscarPageClient e a MESMA
// busca de dados (lib/membros/catalogo-cursos.ts) — só o link de cada
// card muda, pra /curso/[slug] em vez de /membros/curso/[id].
//
// hrefsPorCurso: dicionário curso.id -> href, montado AQUI (Server
// Component) — não uma função passada como prop. BuscarPageClient tem
// 'use client' no topo, e função não é serializável através da fronteira
// Server->Client Component (Next.js só aceita dados simples nessa
// travessia); só a STRING final (o href já calculado) pode atravessar.
export default async function CursosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { todosCursos, acessos, progressoPorCurso, numeroWhatsapp } = await carregarCatalogoCursos(supabase, user!.id);
  // curso.slug || fallback pro id: CAUSA RAIZ do bug "/curso/undefined"
  // relatado — se `curso.slug` vier undefined (migration 011, coluna
  // `slug`, ainda não rodada em produção — não é bug de query/nome de
  // campo, a coluna não existe ainda no banco), o template literal
  // gerava a STRING "/curso/undefined" (definida, não undefined) — o
  // fallback do próprio CourseCard.tsx nunca entrava em ação porque só
  // dispara quando a prop chega literalmente `undefined`, não quando
  // chega uma string qualquer, mesmo que quebrada. Com o `? :` aqui,
  // esse dicionário passa a ter o href certo (por slug) OU a rota
  // clássica (por id) — nunca mais uma string com "undefined" dentro.
  const hrefsPorCurso = Object.fromEntries(
    todosCursos.map((curso) => [curso.id, curso.slug ? `/curso/${curso.slug}` : `/membros/curso/${curso.id}`])
  );

  return (
    <BuscarPageClient
      todosCursos={todosCursos}
      acessos={acessos}
      progressoPorCurso={progressoPorCurso}
      numeroWhatsapp={numeroWhatsapp}
      hrefsPorCurso={hrefsPorCurso}
    />
  );
}
