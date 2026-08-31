import { createClient } from '@/lib/supabase/server';
import VitrinePageClient from '@/components/membros/VitrinePageClient';
import { calcularContinuarAssistindo } from '@/lib/membros/continuar-assistindo';

type BannerConfig = {
  numero_whatsapp: string | null;
  banner_capa_url: string | null;
  banner_badge: string | null;
  banner_resumo: string | null;
};

// Isolada (com try/catch + checagem de `error` explícita) igual ao mesmo
// padrão já usado em app/login/page.tsx: se a migration das colunas do
// banner (banner_capa_url/banner_badge/banner_resumo) ainda não rodou no
// banco, ou a query falhar por qualquer outro motivo, a Home não pode
// quebrar por causa de um banner — cai num fallback vazio e loga o erro no
// servidor (visível no terminal do `npm run dev`), em vez de silenciosamente
// virar `null` sem explicação, que é o que fazia o badge/resumo sumirem sem
// deixar rastro nenhum.
async function buscarBannerConfig(supabase: ReturnType<typeof createClient>): Promise<BannerConfig> {
  const vazio: BannerConfig = {
    numero_whatsapp: null,
    banner_capa_url: null,
    banner_badge: null,
    banner_resumo: null,
  };

  try {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('numero_whatsapp, banner_capa_url, banner_badge, banner_resumo')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error('[vitrine] Falha ao buscar banner de configuracoes (seguindo com fallback vazio):', error.message);
      return vazio;
    }

    return {
      numero_whatsapp: data?.numero_whatsapp ?? null,
      banner_capa_url: data?.banner_capa_url ?? null,
      banner_badge: data?.banner_badge ?? null,
      banner_resumo: data?.banner_resumo ?? null,
    };
  } catch (err) {
    console.error('[vitrine] Erro inesperado ao buscar banner de configuracoes (seguindo com fallback vazio):', err);
    return vazio;
  }
}

export default async function VitrinePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: cursos }, { data: acessosRaw }, { data: aulas }, { data: progresso }, config] = await Promise.all([
    // categoria:categorias(*) — mesmo padrão de join já usado em
    // app/membros/curso/[id]/page.tsx e app/admin/cursos/page.tsx. Sem isso
    // curso.categoria vem undefined (só categoria_id, o uuid cru) e não dá
    // pra agrupar "Todos os Cursos" por categoria na Home.
    supabase.from('cursos').select('*, categoria:categorias(*)').eq('status', 'active').order('ordem'),
    supabase.from('acessos_curso').select('curso_id, bloqueado').eq('aluno_id', user!.id),
    supabase.from('aulas').select('id, modulo:modulos(curso_id)'),
    // aula_id/atualizado_em a mais (antes só curso_id/concluida): usados
    // pra achar em qual aula o aluno estava mais recentemente, pro botão
    // "Continuar assistindo" do banner — ver bloco abaixo.
    supabase.from('progresso_aulas').select('curso_id, aula_id, concluida, atualizado_em').eq('aluno_id', user!.id),
    buscarBannerConfig(supabase),
  ]);

  const acessos = new Map<string, boolean>((acessosRaw ?? []).map((a) => [a.curso_id, !a.bloqueado]));

  const totalAulasPorCurso = new Map<string, number>();
  for (const a of aulas ?? []) {
    const cursoId = (a as any).modulo?.curso_id;
    if (!cursoId) continue;
    totalAulasPorCurso.set(cursoId, (totalAulasPorCurso.get(cursoId) ?? 0) + 1);
  }

  const concluidasPorCurso = new Map<string, number>();
  for (const p of progresso ?? []) {
    if (p.concluida) concluidasPorCurso.set(p.curso_id, (concluidasPorCurso.get(p.curso_id) ?? 0) + 1);
  }

  const progressoPorCurso = new Map<string, number>();
  for (const [cursoId, total] of totalAulasPorCurso) {
    const concluidas = concluidasPorCurso.get(cursoId) ?? 0;
    progressoPorCurso.set(cursoId, total > 0 ? Math.round((concluidas / total) * 100) : 0);
  }

  const todosCursos = cursos ?? [];
  const meusCursos = todosCursos.filter((c) => acessos.get(c.id));

  // Botão "Continuar assistindo" do banner — lógica extraída pra
  // lib/membros/continuar-assistindo.ts (mesma função usada na tela de
  // perfil, pra não duplicar isso nos dois lugares).
  const { href: continuarAssistindoHref, temProgresso } = await calcularContinuarAssistindo(
    supabase,
    user!.id,
    meusCursos.map((c) => c.id)
  );

  return (
    <VitrinePageClient
      meusCursos={meusCursos}
      todosCursos={todosCursos}
      acessos={Object.fromEntries(acessos)}
      progressoPorCurso={Object.fromEntries(progressoPorCurso)}
      numeroWhatsapp={config?.numero_whatsapp ?? null}
      bannerCapaUrl={config?.banner_capa_url ?? null}
      bannerBadge={config?.banner_badge ?? null}
      bannerResumo={config?.banner_resumo ?? null}
      continuarAssistindoHref={continuarAssistindoHref}
      temProgresso={temProgresso}
    />
  );
}
