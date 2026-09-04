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

  const [{ data: cursos }, { data: acessosRaw }, { data: aulas }, { data: progresso }, { data: config }] = await Promise.all([
    supabase.from('cursos').select('*, categoria:categorias(*)').eq('status', 'active').order('ordem'),
    supabase.from('acessos_curso').select('curso_id, bloqueado').eq('aluno_id', user!.id),
    supabase.from('aulas').select('id, modulo:modulos(curso_id)'),
    supabase.from('progresso_aulas').select('curso_id, concluida').eq('aluno_id', user!.id),
   supabase.from('configuracoes').select('numero_whatsapp').eq('id', 1).maybeSingle() as any,
  ]);

   const acessos = new Map<string, boolean>((acessosRaw ?? []).map((a: any) => [a.curso_id, !a.bloqueado]));

  const totalAulasPorCurso = new Map<string, number>();
   for (const a of (aulas ?? []) as any[]) {
    const cursoId = (a as any).modulo?.curso_id;
    if (!cursoId) continue;
    totalAulasPorCurso.set(cursoId, (totalAulasPorCurso.get(cursoId) ?? 0) + 1);
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
      todosCursos={cursos ?? []}
      acessos={Object.fromEntries(acessos)}
      progressoPorCurso={Object.fromEntries(progressoPorCurso)}
      numeroWhatsapp={config?.numero_whatsapp ?? null}
    />
  );
}
