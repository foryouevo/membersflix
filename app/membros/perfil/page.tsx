import { redirect } from 'next/navigation';
import Image from 'next/image';
import { GraduationCap, TrendingUp, CheckCircle2, Flame, MessageCircle, UserRound, LogOut, type LucideIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { initials, buildSupportWhatsappLink } from '@/lib/utils';
import AlterarSenhaButton from '@/components/membros/AlterarSenhaButton';
import EditarPerfilModal from '@/components/membros/EditarPerfilModal';
import LogoutButton from '@/components/LogoutButton';

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

  const [{ data: acessosRaw }, { data: progresso }] = (await Promise.all([
    supabase.from('acessos_curso').select('curso_id, bloqueado').eq('aluno_id', user.id),
    // atualizado_em voltou a ser buscado: além de "concluida" (contagem de
    // aulas concluídas, card novo abaixo), agora também alimenta a
    // "Sequência de Dias" (dias seguidos com pelo menos uma aula concluída
    // — ver calcularSequenciaDias, mais abaixo). Reaproveita a mesma
    // query/tabela, sem round-trip extra.
    supabase.from('progresso_aulas').select('concluida, atualizado_em').eq('aluno_id', user.id),
  ])) as [{ data: any[] | null }, { data: any[] | null }];

  const meusCursoIds = (acessosRaw ?? []).filter((a) => !a.bloqueado).map((a) => a.curso_id);

  // Progresso geral: aulas concluídas / total de aulas somando só os cursos
  // que o aluno de fato tem acesso hoje (não conta aulas de cursos que ele
  // nunca teve ou que foram bloqueados). Filtra direto na query (via
  // `modulos`) em vez de buscar a tabela `aulas` inteira (mais de 1200
  // linhas hoje) e descartar tudo que não é de meusCursoIds depois.
  const { data: modulosComAulas } =
    meusCursoIds.length > 0
      ? ((await supabase.from('modulos').select('aulas(id)').in('curso_id', meusCursoIds)) as {
          data: { aulas: { id: string }[] }[] | null;
        })
      : { data: [] as { aulas: { id: string }[] }[] };
  const totalAulasDosMeusCursos = (modulosComAulas ?? []).reduce((soma, m) => soma + (m.aulas ?? []).length, 0);

  const progressoRows = progresso ?? [];
  const aulasConcluidas = progressoRows.filter((p) => p.concluida).length;
  const progressoGeralPct = totalAulasDosMeusCursos > 0 ? Math.round((aulasConcluidas / totalAulasDosMeusCursos) * 100) : 0;

  // Sequência de dias: quantos dias SEGUIDOS (terminando hoje ou ontem —
  // "seguidos" não quebra só porque o aluno ainda não assistiu nada HOJE,
  // o dia ainda não terminou) o aluno concluiu pelo menos uma aula. Usa só
  // a data (não o horário) de `atualizado_em` das linhas já concluídas —
  // dado que já existe na tabela, sem precisar de uma coluna nova.
  // Simplificação: data em UTC (toISOString), não no fuso do aluno — mesmo
  // nível de precisão que o resto da tela já usa pra datas (ex: "Membro
  // desde", "Trial expira em", só com toLocaleDateString pra EXIBIÇÃO, não
  // pra agrupar por dia).
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

  // numero_whatsapp isolado com checagem de erro (mesmo padrão já usado em
  // app/login/page.tsx e app/membros/vitrine/page.tsx) — sem suporte
  // configurado, o botão "Falar com o suporte" só fica desabilitado, nunca
  // quebra a página.
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

  // Trial: só existe prazo de "vencimento" pra quem está pendente (30min a
  // partir de liberado_em — mesma regra do middleware.ts). Pra quem já está
  // "pago" não existe campo nenhum de data de renovação/assinatura recorrente
  // no sistema hoje (não é um modelo de cobrança automática) — por isso só
  // mostramos essa linha condicionalmente, sem inventar uma data.
  const trialExpiraEm =
    profile.status_pagamento === 'pendente' ? new Date(new Date(profile.liberado_em).getTime() + 30 * 60 * 1000) : null;

  const suporteLink = numeroWhatsapp ? buildSupportWhatsappLink(numeroWhatsapp, 'Olá, preciso de suporte com minha conta.') : null;

  // Reaproveitado nos dois lugares onde o botão "Falar com o suporte"
  // aparece — na verdade só aparece uma vez agora (dentro do card de
  // cabeçalho), mas mantido como uma variável só pra não duplicar o
  // ternário de "sem número configurado" se algum dia precisar de novo em
  // outro lugar.
  const botaoSuporte = suporteLink ? (
    <a
      href={suporteLink}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-secondary flex w-full items-center justify-center gap-2 md:w-auto"
    >
      <MessageCircle size={16} />
      Falar com o suporte
    </a>
  ) : (
    <span
      title="Número de suporte não configurado pelo admin"
      className="btn-secondary flex w-full cursor-not-allowed items-center justify-center gap-2 opacity-60 md:w-auto"
    >
      <MessageCircle size={16} />
      Falar com o suporte
    </span>
  );

  return (
    // Padding lateral progressivo (item explícito): px-4 (mobile) ->
    // md:px-6 (tablet, 768px+) -> lg:px-12 (desktop, 1024px+). py fixo,
    // não faz parte do pedido (só o lateral precisa reduzir por
    // breakpoint).
    <div className="px-4 py-6 md:px-6 lg:px-12">
      <h1 className="mb-6 text-2xl font-bold text-white">Meu Perfil</h1>

      <div className="mx-auto max-w-5xl space-y-6">
        {/* 1. CARD DE CABEÇALHO — banner (faixa em degradê, h-16/64px — era
            h-24/96px, reduzido por pedido explícito: sobrava uma faixa
            vermelha vazia sem o avatar por cima) + avatar sobreposto
            (-mt-8/32px, era -mt-10/40px — ajustada proporcionalmente à
            nova altura do banner, continua cobrindo a metade superior do
            avatar de 80px sem deixar sobra abaixo dele) + nome/badge/
            "Membro desde" ao lado + botão de suporte. Empilhado e
            centralizado no mobile; a partir de md: vira uma linha só,
            avatar+texto à esquerda, botão de suporte empurrado pra
            direita (justify-between). Altura 100% por conteúdo em
            qualquer largura — nada de h-[Xvh]/h-[Xrem] fixo aqui. */}
        <div className="overflow-hidden rounded-lg bg-card">
          <div className="h-16 w-full bg-gradient-to-br from-primary/50 via-primary/15 to-surface-high" />

          <div className="px-6 pb-6">
            <div className="-mt-8 flex flex-col items-center gap-4 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col items-center gap-3 text-center md:flex-row md:items-end md:gap-4 md:text-left">
                {profile.avatar_url ? (
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-4 ring-primary/70 ring-offset-4 ring-offset-card">
                    <Image src={profile.avatar_url} alt={profile.nome} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xl font-semibold text-primary ring-4 ring-primary/70 ring-offset-4 ring-offset-card">
                    {initials(profile.nome)}
                  </div>
                )}

                <div className="md:pb-1">
                  <p className="text-lg font-semibold text-white">{profile.nome}</p>
                  <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                        profile.status_pagamento === 'pago' ? 'bg-primary text-white' : 'bg-secondary-container text-secondary'
                      }`}
                    >
                      {profile.status_pagamento === 'pago' ? 'Pago' : 'Pendente'}
                    </span>
                    <span className="text-xs text-on-variant">
                      Membro desde {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-auto md:pb-1">{botaoSuporte}</div>
            </div>
          </div>
        </div>

        {/* 2. GRID DE MÉTRICAS — 4 cards (Cursos/Progresso Geral já
            existiam; Aulas Concluídas e Sequência de Dias são novos, os
            dois a partir de dados que já eram buscados/já existiam na
            tabela — nada inventado). grid-cols-2 em qualquer largura até
            lg (mobile E tablet ficam com 2 colunas, pedido explícito —
            "mobile moderno cabe 2 cards lado a lado"), lg:grid-cols-4 no
            desktop. items-start (novo): sem isso, o grid esticava todo
            card da mesma linha pra altura do mais alto (ex: "Sequência de
            Dias" quebrando em 2 linhas fazia os outros 3 cards, com
            rótulo de 1 linha só, sobrarem vazios embaixo do número) — é
            essa a causa real do espaço vazio relatado, não o padding
            interno (ver CardMetrica, mais abaixo, onde reduzi ele também
            um pouco, mas isso sozinho não resolvia o problema). */}
        <div className="grid grid-cols-2 items-start gap-4 lg:grid-cols-4">
          <CardMetrica icon={GraduationCap} label="Cursos" valor={meusCursoIds.length} corValor="text-white" />
          <CardMetrica icon={TrendingUp} label="Progresso Geral" valor={`${progressoGeralPct}%`} corValor="text-primary" />
          <CardMetrica icon={CheckCircle2} label="Aulas Concluídas" valor={aulasConcluidas} corValor="text-white" />
          <CardMetrica icon={Flame} label="Sequência de Dias" valor={sequenciaDias} corValor="text-primary" />
        </div>

        {/* 3. BARRA DE PROGRESSO GERAL — card próprio, largura total,
            abaixo do grid (antes vivia dentro do card de perfil). Só
            aparece se o aluno tiver pelo menos 1 curso com aula
            cadastrada — sem isso "0%" seria enganoso (não é que ele não
            progrediu, é que não tem o que progredir ainda). */}
        {totalAulasDosMeusCursos > 0 && (
          <div className="rounded-lg bg-card p-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-on-variant">Progresso geral</span>
              <span className="font-semibold text-primary">{progressoGeralPct}% concluído</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-high">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressoGeralPct}%` }} />
            </div>
          </div>
        )}

        {/* 4. INFORMAÇÕES DA CONTA + AÇÕES — duas colunas só a partir de
            lg (desktop; tablet fica empilhado junto com o mobile, pedido
            explícito): dados de contato à esquerda, botões de ação
            (Alterar Senha/Alterar Informações — "Falar com o suporte"
            migrou pro card de cabeçalho, acima) à direita. items-start
            pra a coluna de botões não esticar pra acompanhar a altura da
            coluna de dados no desktop. */}
        <div className="rounded-lg bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-white">
            <UserRound size={18} className="text-primary" />
            <h2 className="font-semibold">Informações da Conta</h2>
          </div>

          {/* Opção A do pedido (não existe um 3º dado de conta no banco —
              profiles só tem nome/email/telefone/created_at/liberado_em,
              sem CPF/último acesso — então a Opção B não se aplica aqui).
              Era um grid 2 colunas IGUAIS (cada metade ocupando 50% da
              largura do card, mesmo com o conteúdo de cada lado sendo bem
              mais estreito que isso) — trocado por flex com gap fixo
              (lg:gap-12, 3rem): dl e os botões ficam com a própria
              largura de conteúdo, lado a lado, próximos um do outro, em
              vez de esticados nas pontas do card. */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-12">
            <dl className="space-y-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-on-variant">Email</dt>
                <dd className="mt-0.5 break-words text-sm text-white">{profile.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-on-variant">Telefone</dt>
                <dd className="mt-0.5 text-sm text-white">{profile.telefone || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-on-variant">Membro desde</dt>
                <dd className="mt-0.5 text-sm text-white">{new Date(profile.created_at).toLocaleDateString('pt-BR')}</dd>
              </div>
              {trialExpiraEm && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-on-variant">Trial expira em</dt>
                  <dd className="mt-0.5 text-sm text-white">
                    {trialExpiraEm.toLocaleDateString('pt-BR')} às{' '}
                    {trialExpiraEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </dd>
                </div>
              )}
            </dl>

            {/* Botões de ação: empilhados, largura total, no mobile e no
                tablet (só viram uma linha a partir de md — item explícito
                das regras gerais: "empilhar verticalmente no mobile,
                ocupando largura total"). gap-3 entre eles nas duas
                orientações. */}
            <div className="flex flex-col gap-3 border-t border-border/60 pt-5 md:flex-row md:flex-wrap lg:border-t-0 lg:pt-0">
              <AlterarSenhaButton className="w-full md:w-auto" />
              <EditarPerfilModal
                nomeAtual={profile.nome}
                telefoneAtual={profile.telefone ?? ''}
                avatarAtual={profile.avatar_url}
                className="w-full md:w-auto"
              />
            </div>
          </div>
        </div>

        {/* Sair — só no mobile (md:hidden). Em qualquer largura o "Sair" já
            está sempre acessível no dropdown do ícone de perfil do Header
            (mesmo componente/menu nas duas larguras agora), mas esse botão
            aqui na tela de perfil continua como atalho extra, sem precisar
            abrir esse menu. */}
        <LogoutButton className="flex w-full items-center justify-center gap-2 rounded-lg bg-card px-4 py-3 text-sm font-medium text-error hover:bg-surface-container md:hidden">
          <LogOut size={18} /> Sair da conta
        </LogoutButton>
      </div>
    </div>
  );
}

// Card de métrica do grid (item 2) — extraído porque os 4 cards têm
// exatamente a mesma estrutura (ícone num círculo, label em caixa alta,
// valor grande embaixo), só ícone/label/valor/cor mudam. p-2.5 (era p-3,
// reduzido um pouco por pedido explícito) pequeno de propósito: em
// grid-cols-2 numa tela de 375px, cada card tem só ~163px de largura
// (metade de ~343px úteis) — padding generoso espremeria o conteúdo. O
// espaço vazio relatado embaixo do número era causado pelo grid esticando
// os cards pra altura do mais alto da linha, não pelo padding em si — ver
// items-start no grid, acima; esta redução de padding é só um ajuste
// complementar, não a correção principal.
function CardMetrica({
  icon: Icon,
  label,
  valor,
  corValor,
}: {
  icon: LucideIcon;
  label: string;
  valor: string | number;
  corValor: string;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-card p-2.5">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Icon size={22} />
      </div>
      <p className="truncate text-xs font-semibold uppercase tracking-wide text-on-variant">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${corValor}`}>{valor}</p>
    </div>
  );
}
