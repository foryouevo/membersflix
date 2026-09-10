import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  GraduationCap,
  TrendingUp,
  CheckCircle2,
  Flame,
  MessageCircle,
  UserRound,
  LogOut,
  PlayCircle,
  Play,
  ListVideo,
  type LucideIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { initials, buildSupportWhatsappLink, formatTitulo } from '@/lib/utils';
import { calcularContinuarAssistindo } from '@/lib/membros/continuar-assistindo';
import AlterarSenhaButton from '@/components/membros/AlterarSenhaButton';
import EditarPerfilModal from '@/components/membros/EditarPerfilModal';
import CursosRecomendados from '@/components/membros/CursosRecomendados';
import MeusCursosCard, { type MeuCursoItem } from '@/components/membros/MeusCursosCard';
import LogoutButton from '@/components/LogoutButton';
import type { Curso } from '@/types';

// mm:ss simples (sem o corte de "1h 05min" que formatDuration usa acima de
// 1h) — pro par "14:20 / 38:00", os dois lados precisam do MESMO formato
// pra fazer sentido lado a lado, mesmo que a aula passe de 1h (minutos
// continuam contando, ex: "75:30").
function formatMMSS(totalSegundos: number) {
  const m = Math.floor(totalSegundos / 60);
  const s = Math.floor(totalSegundos % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default async function PerfilPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = (await supabase
    .from('profiles')
    .select('nome, email, telefone, avatar_url, status_pagamento, created_at, liberado_em')
    .eq('id', user.id)
    .maybeSingle()) as {
    data: {
      nome: string;
      email: string;
      telefone: string | null;
      avatar_url: string | null;
      status_pagamento: string;
      created_at: string;
      liberado_em: string;
    } | null;
  };

  if (!profile) redirect('/membros/vitrine');

  // curso:cursos(*, categoria:categorias(nome)): mesmo padrão de embed já
  // usado em app/membros/meus-cursos/page.tsx, com a categoria a mais
  // (nome real da categoria, usado nas abas de "Meu(s) Curso(s)" e nos
  // tags de "Cursos Recomendados") — tudo numa única query, sem N+1.
  // `curso` vem `null` se o RLS de `cursos` esconder a linha (status
  // 'inactive' e o aluno não é admin — ver cursos_select em
  // supabase/schema.sql); filtrado abaixo, mesma defesa que
  // meus-cursos/page.tsx já usa.
  const [{ data: acessosRaw }, { data: progresso }, { count: totalCursosAtivos }] = (await Promise.all([
    supabase.from('acessos_curso').select('curso_id, bloqueado, curso:cursos(*, categoria:categorias(nome))').eq('aluno_id', user.id),
    supabase.from('progresso_aulas').select('curso_id, concluida, atualizado_em, segundo_atual').eq('aluno_id', user.id),
    supabase.from('cursos').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ])) as [
    { data: { curso_id: string; bloqueado: boolean; curso: (Curso & { categoria: { nome: string } | null }) | null }[] | null },
    { data: { curso_id: string; concluida: boolean; atualizado_em: string; segundo_atual: number }[] | null },
    { count: number | null },
  ];

  const acessos = acessosRaw ?? [];
  // "Meus Cursos": TODOS os cursos que o aluno tem uma linha de acesso,
  // liberado ou não — cada um com seu próprio status. Importante:
  // `acessos_curso` NÃO tem uma coluna de "pago"/"pendente" por curso (só
  // `bloqueado`, booleano) — quem tem status_pagamento 'pago'/'pendente' é
  // o ALUNO como um todo, em `profiles` (já exibido no card de destaque).
  // Por isso o status exibido no grid é "Liberado"/"Bloqueado" (o que
  // existe de verdade na tabela), não "Pago"/"Pendente" por curso (esse
  // dado não existe no banco — ver aviso no relatório final).
  const meusCursosComStatus = acessos
    .filter((a) => a.curso)
    .map((a) => ({ curso: a.curso as Curso & { categoria: { nome: string } | null }, bloqueado: a.bloqueado }));
  const meusCursoIds = meusCursosComStatus.filter((a) => !a.bloqueado).map((a) => a.curso.id);
  const todosMeusCursoIdsIncluindoBloqueados = meusCursosComStatus.map((a) => a.curso.id);
  const imagemPorCursoId = new Map(meusCursosComStatus.map((a) => [a.curso.id, a.curso.thumbnail_url || a.curso.capa_url]));
  const cursoPorId = new Map(meusCursosComStatus.map((a) => [a.curso.id, a.curso]));

  // Módulos/aulas de TODOS os cursos que o aluno possui (liberados ou
  // bloqueados) — abrange tanto a métrica agregada (só liberados, ver
  // totalAulasDosMeusCursos abaixo) quanto o grid de "Meu(s) Curso(s)"
  // (item 4 do pedido: cada card mostra "categoria • X aulas" e o
  // progresso individual, mesmo pros bloqueados — que naturalmente ficam
  // em 0%, já que RLS não libera as aulas deles).
  const { data: modulosComAulas } =
    todosMeusCursoIdsIncluindoBloqueados.length > 0
      ? ((await supabase.from('modulos').select('curso_id, aulas(id)').in('curso_id', todosMeusCursoIdsIncluindoBloqueados)) as {
          data: { curso_id: string; aulas: { id: string }[] }[] | null;
        })
      : { data: [] as { curso_id: string; aulas: { id: string }[] }[] };

  const totalAulasPorCurso = new Map<string, number>();
  for (const m of modulosComAulas ?? []) {
    totalAulasPorCurso.set(m.curso_id, (totalAulasPorCurso.get(m.curso_id) ?? 0) + (m.aulas ?? []).length);
  }
  // Agregado das métricas do topo: só cursos com acesso liberado (mesmo
  // critério de sempre) — soma explícita sobre meusCursoIds, não sobre
  // todo o mapa (que agora também tem entradas de cursos bloqueados, por
  // causa do grid — ver comentário acima).
  const totalAulasDosMeusCursos = meusCursoIds.reduce((soma, id) => soma + (totalAulasPorCurso.get(id) ?? 0), 0);

  const progressoRows = progresso ?? [];
  const aulasConcluidas = progressoRows.filter((p) => p.concluida).length;
  const progressoGeralPct = totalAulasDosMeusCursos > 0 ? Math.round((aulasConcluidas / totalAulasDosMeusCursos) * 100) : 0;
  const progressoGeralStatus = progressoGeralPct >= 100 ? 'Concluído' : progressoGeralPct > 0 ? 'Em andamento' : 'Não iniciado';

  const concluidasPorCurso = new Map<string, number>();
  for (const p of progressoRows) {
    if (p.concluida) concluidasPorCurso.set(p.curso_id, (concluidasPorCurso.get(p.curso_id) ?? 0) + 1);
  }

  const meusCursosParaCard: MeuCursoItem[] = meusCursosComStatus.map(({ curso, bloqueado }) => {
    const total = totalAulasPorCurso.get(curso.id) ?? 0;
    const concluidas = concluidasPorCurso.get(curso.id) ?? 0;
    return {
      id: curso.id,
      titulo: curso.titulo,
      thumbnail_url: curso.thumbnail_url,
      capa_url: curso.capa_url,
      instrutor_nome: curso.instrutor_nome,
      categoriaNome: curso.categoria?.nome ?? null,
      bloqueado,
      totalAulas: total,
      progressoPct: total > 0 ? Math.round((concluidas / total) * 100) : 0,
    };
  });

  // "Cursos Matriculados" — extras:
  // - "em andamento": progresso do curso > 0% e < 100% (nem começou, nem já
  //   terminou tudo).
  // - "na biblioteca": cursos ativos que o aluno ainda NÃO tem acesso
  //   liberado (todo o catálogo ativo, menos os que já estão em
  //   meusCursoIds) — inclui cursos nunca adquiridos e cursos bloqueados.
  const cursosEmAndamento = meusCursoIds.filter((id) => {
    const total = totalAulasPorCurso.get(id) ?? 0;
    const concluidas = concluidasPorCurso.get(id) ?? 0;
    return total > 0 && concluidas > 0 && concluidas < total;
  }).length;
  const cursosNaBiblioteca = Math.max(0, (totalCursosAtivos ?? 0) - meusCursoIds.length);

  // "Aprox. X horas assistidas": soma de `segundo_atual` (posição
  // alcançada em cada aula) de todas as linhas de progresso do aluno. Dado
  // REAL (não inventado) — é o mesmo campo que já alimenta "retomar de
  // onde parou" no player — mas é uma ESTIMATIVA, não um log de tempo
  // assistido de verdade: reflete até onde o aluno chegou em cada aula,
  // não quanto tempo de vídeo passou na tela.
  const totalSegundosAssistidos = progressoRows.reduce((soma, p) => soma + (p.segundo_atual || 0), 0);
  const horasAssistidas = Math.round((totalSegundosAssistidos / 3600) * 10) / 10;

  // Sequência de dias: quantos dias SEGUIDOS (terminando hoje ou ontem) o
  // aluno concluiu pelo menos uma aula. Usa só a data de `atualizado_em`
  // das linhas já concluídas — dado que já existe na tabela.
  //
  // "Recorde pessoal" (pedido em tarefa anterior) continua NÃO implementado
  // — `atualizado_em` é sobrescrito a cada novo toque na MESMA aula
  // (unique(aluno_id, aula_id): 1 linha por aula, sem histórico), então não
  // dá pra reconstruir com confiança qual foi a MAIOR sequência já
  // alcançada; precisaria de uma tabela de log de atividade diária, que
  // não existe. O badge "Inativo"/"No ritmo!" e o texto de incentivo
  // "Inicie hoje sua sequência!" (pedidos NESTA tarefa) são diferentes —
  // só olham pro valor ATUAL de sequenciaDias (0 ou não), que já é real —
  // por isso esses dois eu implementei.
  function calcularSequenciaDias(diasComAtividade: Set<string>): number {
    const chaveISO = (d: Date) => d.toISOString().slice(0, 10);
    const cursor = new Date();
    if (!diasComAtividade.has(chaveISO(cursor))) cursor.setDate(cursor.getDate() - 1);
    let sequencia = 0;
    while (diasComAtividade.has(chaveISO(cursor))) {
      sequencia++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return sequencia;
  }
  const diasComAtividade = new Set(
    progressoRows.filter((p) => p.concluida && p.atualizado_em).map((p) => new Date(p.atualizado_em).toISOString().slice(0, 10))
  );
  const sequenciaDias = calcularSequenciaDias(diasComAtividade);

  // "Continuar Assistindo": mesma lógica de "retomar de onde parou" já
  // usada no banner da Home — reaproveitada, não duplicada (ver
  // lib/membros/continuar-assistindo.ts, que ganhou campos extras nesta
  // tarefa: descrição real da aula, número do módulo/aula, duração e
  // segundo atual pra montar "MM:SS / MM:SS").
  const continuarAssistindo = await calcularContinuarAssistindo(supabase, user.id, meusCursoIds);
  const imagemContinuar = continuarAssistindo.cursoId ? imagemPorCursoId.get(continuarAssistindo.cursoId) : null;
  const cursoContinuar = continuarAssistindo.cursoId ? cursoPorId.get(continuarAssistindo.cursoId) : null;

  // "Cursos Recomendados": outros cursos ativos na(s) MESMA(S) categoria(s)
  // dos cursos que o aluno já tem acesso liberado, excluindo qualquer curso
  // que ele já possua (mesmo bloqueado). Categoria é o agrupamento que já
  // existe e é usado em toda a plataforma (Home, busca) — com o nome da
  // categoria embutido (categoria:categorias(nome)) pra exibir na lista
  // (ver CursosRecomendados.tsx).
  const categoriaIdsDosMeusCursos = Array.from(
    new Set(
      meusCursosComStatus
        .filter((a) => !a.bloqueado)
        .map((a) => a.curso.categoria_id)
        .filter((id): id is string => !!id)
    )
  );
  const { data: cursosMesmaCategoria } =
    categoriaIdsDosMeusCursos.length > 0
      ? ((await supabase
          .from('cursos')
          .select('*, categoria:categorias(nome)')
          .eq('status', 'active')
          .in('categoria_id', categoriaIdsDosMeusCursos)
          .order('ordem')) as { data: Curso[] | null })
      : { data: [] as Curso[] };
  const cursosRecomendados = (cursosMesmaCategoria ?? []).filter((c) => !todosMeusCursoIdsIncluindoBloqueados.includes(c.id));

  // numero_whatsapp isolado com checagem de erro (mesmo padrão já usado em
  // app/login/page.tsx e app/membros/vitrine/page.tsx) — sem suporte
  // configurado, os botões de WhatsApp só ficam desabilitados, nunca
  // quebram a página.
  let numeroWhatsapp: string | null = null;
  try {
    const { data: config, error } = (await supabase.from('configuracoes').select('numero_whatsapp').eq('id', 1).maybeSingle()) as {
      data: { numero_whatsapp: string | null } | null;
      error: any;
    };
    if (error) console.error('[perfil] Falha ao buscar numero_whatsapp:', error.message);
    else numeroWhatsapp = config?.numero_whatsapp ?? null;
  } catch (err) {
    console.error('[perfil] Erro inesperado ao buscar numero_whatsapp:', err);
  }

  const suporteLink = numeroWhatsapp ? buildSupportWhatsappLink(numeroWhatsapp, 'Olá, preciso de suporte com minha conta.') : null;

  const botaoSuporte = suporteLink ? (
    <a
      href={suporteLink}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-secondary flex w-full items-center justify-center gap-2 md:w-auto"
    >
      <MessageCircle size={16} />
      Falar com o Suporte
    </a>
  ) : (
    <span
      title="Número de suporte não configurado pelo admin"
      className="btn-secondary flex w-full cursor-not-allowed items-center justify-center gap-2 opacity-60 md:w-auto"
    >
      <MessageCircle size={16} />
      Falar com o Suporte
    </span>
  );

  return (
    // lg:-mt-20 + lg:pt-24 (cancela a folga aproximada de 5rem que <main>
    // reserva pro Header — md:pt-20, app/membros/layout.tsx — e repõe com o
    // valor real dele em desktop, md:h-24/6rem, ver Header.tsx) + lg:h-screen
    // lg:overflow-hidden lg:flex lg:flex-col: PRIORIDADE MÁXIMA desta
    // tarefa — página inteira cabendo na viewport em desktop, sem scroll.
    // Como box-sizing é border-box, h-screen + este padding já resultam em
    // "100vh menos a altura do Header", sem precisar de h-[calc(...)]
    // (mesma técnica já validada em PlayerPageClient.tsx). Só a partir de
    // lg — abaixo disso (mobile/tablet) nada muda, a página continua
    // rolando normalmente (pedido explícito).
    <div className="px-4 py-6 md:px-6 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden lg:px-16 lg:pb-6 lg:pt-24 lg:-mt-20">
      <h1 className="mb-6 shrink-0 text-2xl font-bold text-white">Meu Perfil</h1>

      {/* GRID PRINCIPAL — 2 colunas: esquerda mais larga (~63%) com Perfil
          + Métricas + Meu(s) Curso(s); direita mais estreita (~37%) com
          Continuar Assistindo + Informações da Conta + Cursos
          Recomendados. Uma coluna só (empilhado, esquerda primeiro,
          scroll normal da página) até lg. lg:min-h-0 lg:flex-1: ocupa o
          resto da altura do viewport (dentro do wrapper h-screen acima).

          Alinhamento de altura (as duas colunas terminam na MESMA altura,
          dentro do mesmo teto de viewport — pedido desta tarefa): as duas
          colunas usam lg:h-full (a mesma altura, vinda do grid principal
          já limitado pelo h-screen); dentro de cada uma, o ÚLTIMO bloco
          (Meu(s) Curso(s) à esquerda; Cursos Recomendados à direita) é
          lg:flex-1 lg:min-h-0 e absorve qualquer diferença — com scroll
          próprio por dentro se o conteúdo for maior que o espaço
          disponível (nunca estoura a página), e só um respiro interno
          (não vão vazio solto) se for menor. Os demais blocos (Perfil,
          Métricas, Continuar Assistindo, Informações da Conta) ficam
          shrink-0, compactados o bastante nesta tarefa pra normalmente não
          precisar desse scroll de reserva. */}
      <div className="grid grid-cols-1 gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[1.7fr_1fr]">
        {/* ═══ COLUNA ESQUERDA (~63%) ═══ */}
        <div className="space-y-6 lg:flex lg:h-full lg:flex-col lg:gap-6 lg:space-y-0">
          {/* 1. CARD DE PERFIL — foto, nome, badge de status (Pago/Pendente
              — dado real de profiles.status_pagamento), e-mail e "Membro
              desde" à esquerda; "Editar Perfil"/"Falar com o Suporte" à
              direita. */}
          <div className="shrink-0 rounded-lg bg-card p-5">
            <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col items-center gap-3 text-center md:flex-row md:items-center md:gap-4 md:text-left">
                {profile.avatar_url ? (
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-4 ring-primary/70 ring-offset-4 ring-offset-card">
                    <Image src={profile.avatar_url} alt={profile.nome} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xl font-semibold text-primary ring-4 ring-primary/70 ring-offset-4 ring-offset-card">
                    {initials(profile.nome)}
                  </div>
                )}

                <div>
                  <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                    <p className="text-lg font-semibold text-white">{profile.nome}</p>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                        profile.status_pagamento === 'pago' ? 'bg-primary text-white' : 'bg-secondary-container text-secondary'
                      }`}
                    >
                      {profile.status_pagamento === 'pago' ? 'Membro Pago' : 'Pendente'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-on-variant">{profile.email}</p>
                  <p className="mt-1.5 text-xs text-on-variant">
                    Membro desde {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row">
                <EditarPerfilModal
                  nomeAtual={profile.nome}
                  telefoneAtual={profile.telefone ?? ''}
                  avatarAtual={profile.avatar_url}
                  triggerLabel="Editar Perfil"
                  variant="primary"
                  className="w-full md:w-auto"
                />
                {botaoSuporte}
              </div>
            </div>
          </div>

          {/* 2. GRID DE MÉTRICAS — 4 cards. */}
          <div className="grid shrink-0 grid-cols-2 items-start gap-4 lg:grid-cols-4">
            <CardMetrica
              icon={GraduationCap}
              label="Cursos Matriculados"
              valor={meusCursoIds.length}
              corValor="text-white"
              extra={
                <>
                  {cursosEmAndamento} em andamento · {cursosNaBiblioteca} na biblioteca
                </>
              }
            />
            <CardMetrica
              icon={TrendingUp}
              label="Progresso Geral"
              valor={`${progressoGeralPct}%`}
              corValor="text-primary"
              extra={
                <>
                  <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-high">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressoGeralPct}%` }} />
                  </div>
                  {progressoGeralStatus}
                </>
              }
            />
            <CardMetrica
              icon={CheckCircle2}
              label="Aulas Concluídas"
              valor={aulasConcluidas}
              corValor="text-white"
              extra={
                <>
                  de {totalAulasDosMeusCursos} · Aprox. {horasAssistidas}h assistidas
                </>
              }
            />
            <CardMetrica
              icon={Flame}
              label="Sequência de Dias"
              valor={sequenciaDias}
              corValor="text-primary"
              badge={
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
                    sequenciaDias > 0 ? 'bg-primary/15 text-primary' : 'bg-surface-high text-on-variant'
                  }`}
                >
                  {sequenciaDias > 0 ? 'No ritmo!' : 'Inativo'}
                </span>
              }
              extra={sequenciaDias === 0 ? 'Inicie hoje sua sequência!' : undefined}
            />
          </div>

          {/* 3. MEU(S) CURSO(S) — ocupa o resto da altura da coluna
              esquerda (lg:flex-1 lg:min-h-0; ver comentário no topo do
              grid principal, acima, e em MeusCursosCard.tsx). */}
          <div className="lg:min-h-0 lg:flex-1">
            <MeusCursosCard cursos={meusCursosParaCard} />
          </div>
        </div>

        {/* ═══ COLUNA DIREITA (~37%) ═══ lg:h-full (era lg:self-start): as
            duas colunas agora têm a MESMA altura, vinda do teto de
            viewport do grid principal — ver comentário lá em cima. Cursos
            Recomendados (mais abaixo) é o bloco lg:flex-1 que absorve a
            diferença dentro desta coluna. */}
        <div className="space-y-6 lg:flex lg:h-full lg:flex-col lg:gap-6 lg:space-y-0">
          {/* 4. CONTINUAR ASSISTINDO — grid 60/40 (pedido explícito desta
              tarefa): thumbnail na coluna esquerda, detalhes na direita,
              lado a lado a partir de lg — empilha em telas menores. */}
          <div className="rounded-lg bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-white">
              <PlayCircle size={18} className="text-primary" />
              <h2 className="font-semibold">Continuar Assistindo</h2>
            </div>

            {continuarAssistindo.cursoId && continuarAssistindo.aulaId && cursoContinuar ? (
              // grid 60/40 (pedido explícito desta tarefa, em vez do
              // empilhado de uma tarefa anterior): thumbnail na coluna
              // esquerda (3fr = 60%), detalhes+botões na direita (2fr =
              // 40%), lado a lado a partir de lg — empilha em telas
              // menores (grid-cols-1 default). items-start: a coluna de
              // detalhes não precisa esticar pra acompanhar a altura da
              // thumbnail (evita vão vazio dentro dela).
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[3fr_2fr]">
                <Link href={continuarAssistindo.href} className="group relative block">
                  <div className="relative aspect-video overflow-hidden rounded-lg bg-surface-high">
                    {imagemContinuar ? (
                      <Image
                        src={imagemContinuar}
                        alt={cursoContinuar.titulo}
                        fill
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                        sizes="240px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-on-variant">
                        <Play size={20} />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                        <Play size={16} className="ml-0.5 fill-white" />
                      </span>
                    </div>
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-white">
                      Última Visualização
                    </span>
                  </div>
                </Link>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-on-variant">
                    Módulo {continuarAssistindo.numeroModulo}
                    {continuarAssistindo.moduloTitulo && ` · ${formatTitulo(continuarAssistindo.moduloTitulo)}`}
                    {continuarAssistindo.totalAulasNoModulo > 0 &&
                      ` · Aula ${String(continuarAssistindo.numeroAulaNoModulo).padStart(2, '0')} de ${continuarAssistindo.totalAulasNoModulo}`}
                  </p>
                  <p className="mt-0.5 text-base font-bold text-white">{formatTitulo(cursoContinuar.titulo)}</p>

                  {/* Descrição real da AULA (aulas.descricao) — só aparece
                      se cadastrada; sem isso, a linha some (não inventamos
                      texto). Escondida em telas pequenas (lg:block): nos
                      40% da coluna direita já é bastante texto pra caber
                      sem esticar o card verticalmente. */}
                  {continuarAssistindo.aulaDescricao && (
                    <p className="mt-1 hidden text-xs text-on-variant lg:line-clamp-2 lg:block">{continuarAssistindo.aulaDescricao}</p>
                  )}

                  <div className="mt-2 flex items-center justify-between gap-2 text-[0.7rem] text-on-variant">
                    <span>
                      <span className="font-semibold text-primary">{continuarAssistindo.progressoPct}%</span> concluído
                    </span>
                    <span>
                      {formatMMSS(continuarAssistindo.segundoAtual)} / {formatMMSS(continuarAssistindo.duracaoSegundos)} min
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-high">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${continuarAssistindo.progressoPct}%` }} />
                  </div>

                  {/* Botões empilhados (não lado a lado): nos 40% da coluna
                      direita, "Continuar Aula"/"Ver Grade de Aulas" lado a
                      lado ficariam apertados demais pro texto de cada um —
                      empilhados é o que "couber melhor", como a tarefa
                      deixou em aberto. */}
                  <div className="mt-3 flex flex-col gap-2">
                    <Link href={continuarAssistindo.href} className="btn-primary flex items-center justify-center gap-2 py-2 text-sm">
                      <Play size={14} className="fill-white" />
                      Continuar Aula
                    </Link>
                    <Link
                      href={`/membros/curso/${continuarAssistindo.cursoId}`}
                      className="btn-secondary flex items-center justify-center gap-2 py-2 text-sm"
                    >
                      <ListVideo size={14} />
                      Ver Grade de Aulas
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-on-variant">Você ainda não começou nenhuma aula.</p>
                <Link href="/membros/vitrine" className="btn-primary">
                  Explorar cursos
                </Link>
              </div>
            )}
          </div>

          {/* 5. INFORMAÇÕES DA CONTA — 2 colunas, botões lado a lado no
              rodapé. p-5 (era p-6) + espaçamentos internos reduzidos:
              compactação geral desta tarefa (item 4, prioridade máxima). */}
          <div className="rounded-lg bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-white">
              <UserRound size={18} className="text-primary" />
              <h2 className="font-semibold">Informações da Conta</h2>
            </div>

            {/* 2 colunas: esquerda Nome+Telefone, direita E-mail+Cursos —
                empilha em 1 coluna abaixo de sm (mobile). */}
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-on-variant">Nome completo</dt>
                  <dd className="mt-1 text-sm text-white">{profile.nome}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-on-variant">Telefone</dt>
                  <dd className="mt-1 text-sm text-white">{profile.telefone || '—'}</dd>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-on-variant">E-mail cadastrado</dt>
                  <dd className="mt-1 break-words text-sm text-white">{profile.email}</dd>
                </div>

                {/* "Cursos" (pedido desta tarefa: "quantidade/lista resumida
                    de cursos... ou o dado equivalente já existente") — é o
                    mesmo bloco "Cursos liberados" já implementado (dado
                    real de acessos_curso.bloqueado; ver comentário
                    original abaixo sobre por que não é "Status do Plano"),
                    só reposicionado pra esta coluna. */}
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-on-variant">Cursos liberados</dt>
                  <dd className="mt-1 flex items-center justify-between text-sm text-white">
                    <span>
                      {meusCursoIds.length} de {todosMeusCursoIdsIncluindoBloqueados.length}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        profile.status_pagamento === 'pago' ? 'bg-primary/15 text-primary' : 'bg-secondary-container text-secondary'
                      }`}
                    >
                      {profile.status_pagamento === 'pago' ? 'Ativo' : 'Pendente'}
                    </span>
                  </dd>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-row flex-wrap gap-3 border-t border-border/60 pt-4">
              <AlterarSenhaButton className="flex-1" />
              <EditarPerfilModal
                nomeAtual={profile.nome}
                telefoneAtual={profile.telefone ?? ''}
                avatarAtual={profile.avatar_url}
                className="flex-1"
              />
            </div>
          </div>

          {/* 6. CURSOS RECOMENDADOS — carrossel (grayscale + cadeado, ver
              CursosRecomendados.tsx). lg:flex-1 lg:min-h-0: é o bloco que
              absorve a diferença de altura nesta coluna (ver comentário no
              topo do grid principal) — com scroll próprio (o carrossel
              não precisa, mas o wrapper garante que nunca estoure a
              página se um dia precisar). */}
          <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <CursosRecomendados cursos={cursosRecomendados} numeroWhatsapp={numeroWhatsapp} />
          </div>
        </div>
      </div>

      {/* Sair — só no mobile (md:hidden). Em qualquer largura o "Sair" já
          está sempre acessível no dropdown do ícone de perfil do Header. */}
      <LogoutButton className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-card px-4 py-3 text-sm font-medium text-error hover:bg-surface-container md:hidden">
        <LogOut size={18} /> Sair da conta
      </LogoutButton>
    </div>
  );
}

// Card de métrica do grid (item 2) — ícone num círculo, label em caixa
// alta, valor grande embaixo. `badge` (novo): pílula ao lado do valor (ex:
// "No ritmo!"/"Inativo"). `extra`: conteúdo secundário abaixo do valor
// (texto ou elemento, ex: a barrinha de progresso).
function CardMetrica({
  icon: Icon,
  label,
  valor,
  corValor,
  badge,
  extra,
}: {
  icon: LucideIcon;
  label: string;
  valor: string | number;
  corValor: string;
  badge?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <div className="h-full min-w-0 rounded-lg bg-card p-4">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Icon size={18} />
      </div>
      <p className="truncate text-xs font-semibold uppercase tracking-wide text-on-variant">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className={`text-3xl font-bold ${corValor}`}>{valor}</p>
        {badge}
      </div>
      {extra && <div className="mt-2 text-xs text-on-variant">{extra}</div>}
    </div>
  );
}
