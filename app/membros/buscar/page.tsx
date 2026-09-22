import { createClient } from '@/lib/supabase/server';
import BuscarPageClient from '@/components/membros/BuscarPageClient';
import { carregarCatalogoCursos } from '@/lib/membros/catalogo-cursos';

// Tela de busca dedicada — acessada pelo ícone de lupa do bottom nav mobile
// e pela busca/filtro do DesktopHeader. Busca (via lib/membros/
// catalogo-cursos.ts, reaproveitada também por app/(portal)/cursos/
// page.tsx — rota nova) os mesmos dados que a Home precisa pra render
// "Todos os Cursos" — cursos com categoria (join), acessos e progresso —
// mas sem o que só a Home usa (banner, meusCursos, continuarAssistindo).
// Não recebe mais busca/categoria/instrutor daqui — BuscarPageClient lê
// isso direto da URL via useSearchParams (reativo, sobrevive a navegação
// sem remontar) em vez de precisar de uma semente vinda do servidor.
export default async function BuscarPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { todosCursos, acessos, progressoPorCurso, numeroWhatsapp } = await carregarCatalogoCursos(supabase, user!.id);

  return (
    <BuscarPageClient todosCursos={todosCursos} acessos={acessos} progressoPorCurso={progressoPorCurso} numeroWhatsapp={numeroWhatsapp} />
  );
}
