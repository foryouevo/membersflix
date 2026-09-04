import { createClient } from '@/lib/supabase/server';
import VitrinePageClient from '@/components/membros/VitrinePageClient';
import { calcularContinuarAssistindo } from '@/lib/membros/continuar-assistindo';
import type { Curso } from '@/types';

type BannerConfig = {
  numero_whatsapp: string | null;
  banner_capa_url: string | null;
  // Fundo do hero em destaque (CursoDestaque) — campo próprio, isolado de
  // banner_capa_url (o banner acima, camada visual separada) e de
  // cursos.capa_url (capa de cada curso). Ver migração
  // 008_hero_destaque_home.sql.
  hero_destaque_url: string | null;
};

// Isolada (com try/catch + checagem de `error` explícita) igual ao mesmo
// padrão já usado em app/login/page.tsx: se a migration das colunas do
// banner (banner_capa_url) ainda não rodou no banco, ou a query falhar por
// qualquer outro motivo, a Home não pode quebrar por causa de um banner —
// cai num fallback vazio e loga o erro no servidor (visível no terminal do
// `npm run dev`), em vez de silenciosamente virar `null` sem explicação.
// banner_badge/banner_resumo saíram da query: eram só do banner antigo
// ("MEMBERSFLIX" + descrição), substituído pelo card de destaque
// (CursoDestaque) em qualquer largura de tela — ninguém mais lê essas duas
// colunas.
async function buscarBannerConfig(supabase: ReturnType<typeof createClient>): Promise<BannerConfig> {
  const vazio: BannerConfig = {
    numero_whatsapp: null,
    banner_capa_url: null,
    hero_destaque_url: null,
  };

  try {
    const { data, error } = (await supabase
      .from('configuracoes')
      .select('numero_whatsapp, banner_capa_url, hero_destaque_url')
      .eq('id', 1)
      .maybeSingle()) as { data: BannerConfig | null; error: any };

    if (error) {
      console.error('[vitrine] Falha ao buscar banner de configuracoes (seguindo com fallback vazio):', error.message);
      return vazio;
    }

    return {
      numero_whatsapp: data?.numero_whatsapp ?? null,
      banner_capa_url: data?.banner_capa_url ?? null,
      hero_destaque_url: data?.hero_destaque_url ?? null,
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

  const [{ data: cursos }, { data: acessosRaw }, { data: aulas }, { data: progresso }, config, { data: categorias }] =
    await Promise.all([
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
      // Tabela crua (não via join de cursos) — usada só pela fileira de
      // chips de categoria da Home mobile (CategoriaChipsMobile), pra
      // aparecer mesmo categoria sem nenhum curso vinculado ainda (ex:
      // "Idiomas"), o que o join acima nunca traria.
      supabase.from('categorias').select('*').order('ordem'),
    ]);

  const acessos = new Map<string, boolean>((acessosRaw ?? []).map((a: any) => [a.curso_id, !a.bloqueado]));

  const totalAulasPorCurso = new Map<string, number>();
  for (const a of aulas ?? []) {
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

  const todosCursos = (cursos ?? []) as Curso[];
  const meusCursos = todosCursos.filter((c) => acessos.get(c.id));

  // Curso em destaque do card hero (CursoDestaque, agora igual em qualquer
  // largura de tela): reaproveita a mesma lógica de "o que importa agora
  // pra esse aluno" já usada na tela de perfil — cursoId de
  // calcularContinuarAssistindo é o curso com atividade mais recente, ou o
  // primeiro de "Meus Cursos" sem nenhum progresso ainda (href/temProgresso,
  // que essa função também retorna, não são mais usados aqui — eram só do
  // botão "Continuar assistindo" do banner antigo). Sem curso nenhum
  // vinculado (aluno novo, ainda não comprou nada), cai no primeiro curso da
  // vitrine (mesma ordem de "Todos os Cursos") — sempre mostra algo pra
  // promover, nunca fica sem card.
  const { cursoId: cursoContinuarId } = await calcularContinuarAssistindo(supabase, user!.id, meusCursos.map((c) => c.id));
  const cursoDestaque = todosCursos.find((c) => c.id === cursoContinuarId) ?? todosCursos[0] ?? null;

  return (
    <VitrinePageClient
      meusCursos={meusCursos}
      todosCursos={todosCursos}
      acessos={Object.fromEntries(acessos)}
      progressoPorCurso={Object.fromEntries(progressoPorCurso)}
      numeroWhatsapp={config?.numero_whatsapp ?? null}
      bannerCapaUrl={config?.banner_capa_url ?? null}
      heroDestaqueUrl={config?.hero_destaque_url ?? null}
      todasCategorias={categorias ?? []}
      cursoDestaque={cursoDestaque}
    />
  );
}
