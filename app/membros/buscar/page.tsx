import { createClient } from '@/lib/supabase/server';
import BuscarPageClient from '@/components/membros/BuscarPageClient';

// Tela de busca dedicada — acessada pelo ícone de lupa do bottom nav mobile
// e pela busca/filtro do DesktopHeader. Busca os mesmos dados que a Home
// (app/membros/vitrine/page.tsx) precisa pra render "Todos os Cursos" —
// cursos com categoria (join), acessos e progresso — mas sem o que só a
// Home usa (banner, meusCursos, continuarAssistindo): aqui não tem hero nem
// "Meus Cursos", só a lista completa pra filtrar. Não recebe mais
// busca/categoria/instrutor daqui — BuscarPageClient lê isso direto da URL
// via useSearchParams (reativo, sobrevive a navegação sem remontar) em vez
// de precisar de uma semente vinda do servidor.
export default async function BuscarPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: cursos }, { data: acessosRaw }, { data: progresso }, { data: config }] = await Promise.all([
    supabase.from('cursos').select('*, categoria:categorias(*)').eq('status', 'active').order('ordem'),
    supabase.from('acessos_curso').select('curso_id, bloqueado').eq('aluno_id', user!.id),
    supabase.from('progresso_aulas').select('curso_id, concluida').eq('aluno_id', user!.id),
   supabase.from('configuracoes').select('numero_whatsapp').eq('id', 1).maybeSingle() as any,
  ]);

   const acessos = new Map<string, boolean>((acessosRaw ?? []).map((a: any) => [a.curso_id, !a.bloqueado]));
  const todosCursos = (cursos ?? []) as any[];

  // Mesmo raciocínio de app/membros/vitrine/page.tsx: CourseCard só mostra
  // progresso quando hasAccess é true, então o total de aulas só precisa
  // ser calculado pros cursos que o aluno tem acesso — filtra direto na
  // query (via `modulos`) em vez de buscar a tabela `aulas` inteira (mais
  // de 1200 linhas hoje) só pra descartar quase tudo depois.
  const meusCursoIds = todosCursos.filter((c) => acessos.get(c.id)).map((c) => c.id);
  const { data: modulosComAulas } =
    meusCursoIds.length > 0
      ? ((await supabase.from('modulos').select('curso_id, aulas(id)').in('curso_id', meusCursoIds)) as {
          data: { curso_id: string; aulas: { id: string }[] }[] | null;
        })
      : { data: [] as { curso_id: string; aulas: { id: string }[] }[] };

  const totalAulasPorCurso = new Map<string, number>();
  for (const m of modulosComAulas ?? []) {
    totalAulasPorCurso.set(m.curso_id, (totalAulasPorCurso.get(m.curso_id) ?? 0) + (m.aulas ?? []).length);
  }

  const concluidasPorCurso = new Map<string, number>();
   for (const p of (progresso ?? []) as any[]) {
    if (p.concluida) concluidasPorCurso.set(p.curso_id, (concluidasPorCurso.get(p.curso_id) ?? 0) + 1);
  }

  const progressoPorCurso = new Map<string, number>();
  for (const [cursoId, total] of totalAulasPorCurso) {
    const concluidas = concluidasPorCurso.get(cursoId) ?? 0;
    progressoPorCurso.set(cursoId, total > 0 ? Math.round((concluidas / total) * 100) : 0);
  }

  return (
    <BuscarPageClient
      todosCursos={todosCursos}
      acessos={Object.fromEntries(acessos)}
      progressoPorCurso={Object.fromEntries(progressoPorCurso)}
      numeroWhatsapp={config?.numero_whatsapp ?? null}
    />
  );
}
