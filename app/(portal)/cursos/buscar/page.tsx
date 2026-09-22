import { createClient } from '@/lib/supabase/server';
import BuscarPageClient from '@/components/membros/BuscarPageClient';
import { carregarCatalogoCursos } from '@/lib/membros/catalogo-cursos';

// Rota NOVA (/cursos/buscar, pedido explícito) — é pra cá que o ícone de
// lupa/painel de filtro do Header (Header.tsx, irParaBusca) navega agora,
// no lugar de /membros/buscar (que continua existindo, mas sem nada mais
// apontando pra lá). MESMO BuscarPageClient e MESMA busca de dados
// (lib/membros/catalogo-cursos.ts) de app/membros/buscar/page.tsx e de
// app/(portal)/cursos/page.tsx — só o caminho da URL muda; a lógica de
// busca/filtro em si (useSearchParams dentro de BuscarPageClient) é
// idêntica nos três.
export default async function CursosBuscarPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { todosCursos, acessos, progressoPorCurso, numeroWhatsapp } = await carregarCatalogoCursos(supabase, user!.id);

  return (
    <BuscarPageClient todosCursos={todosCursos} acessos={acessos} progressoPorCurso={progressoPorCurso} numeroWhatsapp={numeroWhatsapp} />
  );
}
