'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Check,
  Play,
  Download,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  FileVideo,
  FileAudio,
  File as FileIcon,
} from 'lucide-react';
import VideoPlayer from '@/components/membros/VideoPlayer';
import { createClient } from '@/lib/supabase/client';
import { formatDuration, formatBytes, formatTitulo } from '@/lib/utils';
import type { Aula, Curso, Documento, Modulo } from '@/types';

// Ícone por tipo de arquivo (doc.tipo guarda o mimetype, ex: "application/pdf",
// vindo do import do Drive — ver app/admin/cursos/[id]/aulas/actions.ts).
function iconeParaDocumento(tipo: string | null) {
  const t = (tipo ?? '').toLowerCase();
  if (t.includes('image')) return FileImage;
  if (t.includes('sheet') || t.includes('excel') || t.includes('csv')) return FileSpreadsheet;
  if (t.includes('zip') || t.includes('compressed') || t.includes('rar')) return FileArchive;
  if (t.includes('video')) return FileVideo;
  if (t.includes('audio')) return FileAudio;
  if (t.includes('pdf') || t.includes('document') || t.includes('text')) return FileText;
  return FileIcon;
}

// A tela do player nunca recebe video_url do servidor — nem da aula atual,
// nem das outras aulas listadas na barra lateral — o próprio VideoPlayer
// busca a URL sob demanda (ver hooks/useDificultarInspecao e o comentário em
// VideoPlayer.tsx), então ela nem chega a existir no payload inicial da página.
type AulaSemVideoUrl = Omit<Aula, 'video_url'>;
type AulaComStatus = AulaSemVideoUrl & { concluida: boolean };
type ModuloComAulas = Modulo & { aulas: AulaComStatus[] };

export default function PlayerPageClient({
  curso,
  modulo,
  aula,
  documentos,
  modulos,
  aulaAnteriorId,
  proximaAulaId,
  posicaoInicial,
}: {
  curso: Curso;
  modulo: Modulo;
  aula: AulaSemVideoUrl;
  documentos: Documento[];
  modulos: ModuloComAulas[];
  aulaAnteriorId: string | null;
  proximaAulaId: string | null;
  posicaoInicial: number;
}) {
  const supabase = createClient();

  // `concluida` chega do servidor no carregamento da página; `overrides` guarda
  // só o que o aluno mudou nesta sessão marcando/desmarcando manualmente pelo
  // check da sidebar, pra refletir na hora — checkbox, riscado no título e %
  // do módulo — sem esperar um reload. `salvandoIds` controla o estado de
  // "gravando" por aula, pra não disparar cliques duplicados enquanto o
  // upsert no Supabase ainda não voltou.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [salvandoIds, setSalvandoIds] = useState<Record<string, boolean>>({});

  // Abas "Aula"/"Anexos" — só existem no mobile (lg:hidden); no desktop a
  // descrição e os documentos continuam em seções separadas, sem abas (ver
  // os blocos `hidden lg:block` mais abaixo). "Aula" vem selecionada por
  // padrão.
  const [abaMobile, setAbaMobile] = useState<'aula' | 'anexos'>('aula');

  function estaConcluida(a: { id: string; concluida: boolean }) {
    return overrides[a.id] ?? a.concluida;
  }

  // Grava o novo status em `progresso_aulas` (upsert, protegido pela RLS
  // `progresso_own` — só mexe na linha do próprio aluno). Aplica otimista no
  // estado local antes de esperar a resposta e reverte se a gravação falhar.
  // Não envia `segundo_atual`: marcar/desmarcar manualmente não deve
  // sobrescrever a posição de reprodução salva pelo VideoPlayer.
  async function alternarConcluida(aulaAlvo: { id: string }, novoValor: boolean) {
    const valorAnterior = overrides[aulaAlvo.id];
    setOverrides((prev) => ({ ...prev, [aulaAlvo.id]: novoValor }));
    setSalvandoIds((prev) => ({ ...prev, [aulaAlvo.id]: true }));

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = user
      ? await supabase.from('progresso_aulas').upsert(
          {
            aluno_id: user.id,
            aula_id: aulaAlvo.id,
            curso_id: curso.id,
            concluida: novoValor,
            atualizado_em: new Date().toISOString(),
          },
          { onConflict: 'aluno_id,aula_id' }
        )
      : { error: new Error('Sessão expirada.') };

    setSalvandoIds((prev) => {
      const { [aulaAlvo.id]: _omit, ...resto } = prev;
      return resto;
    });

    if (error) {
      setOverrides((prev) => ({ ...prev, [aulaAlvo.id]: valorAnterior ?? !novoValor }));
      return false;
    }
    return true;
  }

  // A barra lateral mostra só o módulo da aula atual (não a lista completa
  // de módulos do curso) — pra navegar entre módulos diferentes, o aluno usa
  // o botão "← {curso.titulo}" no topo do vídeo, que volta pra tela do curso.
  const moduloAtual = modulos.find((m) => m.id === modulo.id);
  const aulasDoModulo = moduloAtual?.aulas ?? [];
  const assistidasModulo = aulasDoModulo.filter(estaConcluida).length;
  const progressoModulo = aulasDoModulo.length > 0 ? Math.round((assistidasModulo / aulasDoModulo.length) * 100) : 0;

  // "MÓDULO X • Aula X de Y": posição do módulo entre os módulos do curso
  // (por `ordem`) e posição da aula dentro do módulo atual.
  const numeroModulo = [...modulos].sort((a, b) => a.ordem - b.ordem).findIndex((m) => m.id === modulo.id) + 1;
  const numeroAulaNoModulo = aulasDoModulo.findIndex((a) => a.id === aula.id) + 1;

  // Título do módulo + barra de progresso + lista de aulas: no desktop é o
  // conteúdo fixo da <aside> (sempre visível, ver mais abaixo). No mobile
  // esse MESMO bloco (não uma cópia) é o conteúdo da aba "Aulas" — por isso
  // vive numa variável só, montada nos dois lugares, em vez de duplicado.
  const blocoModulo = (
    <>
      <div className="shrink-0 border-b border-border/40 p-6">
        <p className="truncate text-2xl font-bold text-white">{formatTitulo(modulo.titulo)}</p>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-high">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressoModulo}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-on-variant">{progressoModulo}% Concluído</p>
      </div>

      <div className="p-0 lg:flex-1 lg:overflow-y-auto">
        {aulasDoModulo.map((a, idx) => {
          const ativa = a.id === aula.id;
          const concluida = estaConcluida(a);
          const tituloExibido = formatTitulo(a.titulo);
          // "Tempo restante" usa a última posição salva (posicaoInicial),
          // não a posição ao vivo do player — não temos esse estado aqui,
          // só uma estimativa a partir do progresso salvo até a página
          // carregar. Também não existe, no modelo de dados atual, um
          // conceito de aula "bloqueada"/não liberada dentro de um módulo
          // (só o curso inteiro pode estar bloqueado pro aluno) — por
          // isso não há estado de cadeado aqui, só concluída/atual/pendente.
          const restante = ativa && a.duracao_segundos > 0 ? Math.max(a.duracao_segundos - posicaoInicial, 0) : 0;

          // Linha divisória entre aulas consecutivas (não depois da última).
          // Importante: usamos `border-l-{cor}` (só o lado esquerdo, pro
          // destaque da aula ativa) e `border-b-{cor}` (só o lado de baixo,
          // pro separador) como utilitários DIRECIONAIS separados — nunca o
          // atalho `divide-y`/`divide-{cor}` do Tailwind, que gera uma regra
          // `border-color` (shorthand, as 4 bordas de uma vez) em cada item;
          // isso já causou um bug aqui antes, sobrescrevendo a cor da borda
          // esquerda do destaque ativo. Com as duas bordas endereçadas
          // separadamente, uma nunca pisa na cor da outra.
          const naoUltima = idx !== aulasDoModulo.length - 1;

          return (
            <div
              key={a.id}
              className={`flex items-start gap-3 border-l-4 px-3 py-3 text-sm transition-colors ${
                ativa ? 'border-l-primary bg-surface-high' : 'border-l-transparent hover:bg-surface-container'
              } ${naoUltima ? 'border-b border-b-border/40' : ''}`}
            >
              {/* Checkbox sempre clicável, pra qualquer aula da lista (não só a
                  atual) — é a garantia de que o aluno controla o próprio
                  progresso manualmente, independente do avanço automático.
                  É um <button> irmão do <Link> abaixo (não um filho dele) pra
                  não aninhar elemento interativo dentro de outro. */}
              <button
                type="button"
                onClick={() => alternarConcluida(a, !concluida)}
                disabled={!!salvandoIds[a.id]}
                aria-pressed={concluida}
                aria-label={concluida ? `Desmarcar "${tituloExibido}" como concluída` : `Marcar "${tituloExibido}" como concluída`}
                className="group/check relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container text-xs font-semibold text-on-variant transition-colors hover:bg-surface-high disabled:cursor-wait disabled:opacity-60"
              >
                {concluida ? (
                  <CheckCircle2 size={18} className="text-primary" />
                ) : (
                  <>
                    <span className="group-hover/check:opacity-0">{ativa ? <Play size={14} className="text-primary" /> : idx + 1}</span>
                    {/* Ícone de check que aparece no hover, convidando a marcar como concluída */}
                    <Check size={14} className="absolute inset-0 m-auto opacity-0 transition-opacity group-hover/check:opacity-100" />
                  </>
                )}
              </button>
              <Link href={`/membros/player/${a.id}`} className="min-w-0 flex-1">
                <p
                  className={`break-words font-medium ${concluida ? 'text-on-variant line-through' : ativa ? 'text-primary' : 'text-white'}`}
                >
                  {tituloExibido}
                </p>
                {ativa ? (
                  <p className="text-xs text-primary">
                    Assistindo agora{a.duracao_segundos > 0 ? ` • ${formatDuration(a.duracao_segundos)}` : ''}
                  </p>
                ) : (
                  a.duracao_segundos > 0 && <p className="text-xs text-on-variant">{formatDuration(a.duracao_segundos)}</p>
                )}
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    // Nada de -mt-14/md:-mt-20 nem h-screen/overflow-hidden aqui — essa
    // página deixou de gerenciar a própria altura de viewport (o vídeo
    // tinha altura herdada do container inteiro, sem teto, e "vazava" da
    // tela). Agora ela é uma página normal como as outras da área de
    // membros: usa a folga padrão que <main> já reserva pro Header
    // (pt-14/md:pt-20, app/membros/layout.tsx) e quem rola é a PÁGINA
    // (o próprio <main>, overflow-y-auto) — é isso que faz o Header
    // detectar o scroll de novo e ganhar fundo ao rolar (ele lê o scroll
    // de window/documento, não o de uma div interna isolada). Sem
    // bg-background: fundo (gradiente vermelho/preto) é só do <body>
    // (app/globals.css).
    <div>
      {/* flex-col por padrão / lg:flex-row a partir do breakpoint grande:
          empilhado no mobile (a lista de aulas mora na aba "Aulas" abaixo
          do vídeo, não ao lado — ver mais abaixo), lado a lado no desktop.
          items-start (não mais stretch, o default): a coluna de conteúdo e
          a <aside> não precisam mais ter a MESMA altura uma da outra — a
          altura de cada uma agora é só o que o próprio conteúdo pede
          (a página é quem rola). gap-6 entre as colunas no desktop: é o
          único espaço entre o vídeo e a sidebar agora — ver padding de
          cada coluna abaixo (reduzido pra não duplicar esse respiro). */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:gap-6">
        {/* px-4 pt-4 (mobile, nas duas larguras) + pb-24: respiro
            confortável dos dois lados (a <aside> nem aparece, então
            precisa da própria margem direita) + folga pro BottomNav
            flutuante (fixed, 6rem — precisa ser reposta à mão porque esta
            coluna, dentro do fluxo normal da página, termina antes do fim
            do scroll). A partir de lg: pt-4/pr-0/pb-6/pl-14 — só a margem
            ESQUERDA da página continua tendo padding aqui (pl-14); a
            direita fica só no gap-6 da fileira acima (antes de mais do
            que o gap, o próprio padding direito desta coluna E o espaço
            reservado pela <aside> se somavam, deixando a borda direita do
            vídeo longe da sidebar) — daí o pr-0. lg:pb-6: sem o extra do
            BottomNav (md:hidden, não existe mais nessa largura). */}
        <div className="flex-1 px-4 pb-24 pt-4 lg:pb-6 lg:pl-14 lg:pr-0 lg:pt-4">
          <VideoPlayer
            aulaId={aula.id}
            cursoId={curso.id}
            posicaoInicial={posicaoInicial}
            aulaAnteriorId={aulaAnteriorId}
            proximaAulaId={proximaAulaId}
            voltarHref={`/membros/curso/${curso.id}`}
            voltarLabel={`Voltar para ${curso.titulo}`}
          />

          <div className="mt-6 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-surface-high px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-on-variant">
                  Módulo {numeroModulo}
                </span>
                <span className="px-1 text-xs text-on-variant">•</span>
                <span className="text-[0.7rem] font-semibold tracking-wide text-on-variant">
                  Aula {numeroAulaNoModulo} de {aulasDoModulo.length}
                </span>
              </div>
              {/* Menor e com menos respiro no mobile (cabe em 1-2 linhas sem
                  ocupar tanto espaço vertical); volta ao tamanho/espaçamento
                  original a partir de lg:. */}
              <h1 className="mt-3 text-xl font-bold leading-tight text-white lg:mt-1 lg:text-[1.9rem] lg:leading-normal">
                {formatTitulo(aula.titulo)}
              </h1>
              {/* Descrição: só no desktop aqui embaixo do título — no mobile
                  ela mora dentro da aba "Aula" logo abaixo (ver bloco
                  lg:hidden mais adiante), pra não somar mais espaço vertical
                  nessa área. */}
              {aula.descricao && <p className="mt-1 hidden max-w-2xl text-sm text-on-variant lg:block">{aula.descricao}</p>}
            </div>
            {/* Aula Anterior / Próxima Aula: só no desktop — no mobile essa
                fileira cortava na borda direita da tela junto com o título.
                Navegar entre aulas no mobile continua possível pela lista de
                aulas do módulo, na aside abaixo. */}
            <div className="hidden shrink-0 gap-2 lg:flex">
              <Link
                href={aulaAnteriorId ? `/membros/player/${aulaAnteriorId}` : '#'}
                aria-disabled={!aulaAnteriorId}
                className={`btn-secondary flex items-center gap-1 ${!aulaAnteriorId ? 'pointer-events-none opacity-40' : ''}`}
              >
                <ChevronLeft size={16} /> Aula Anterior
              </Link>
              <Link
                href={proximaAulaId ? `/membros/player/${proximaAulaId}` : '#'}
                aria-disabled={!proximaAulaId}
                className={`btn-primary flex items-center gap-1 ${!proximaAulaId ? 'pointer-events-none opacity-40' : ''}`}
              >
                Próxima Aula <ChevronRight size={16} />
              </Link>
            </div>
          </div>

          {/* Mobile: abas "Aulas"/"Anexos" no lugar da seção "Documentos e
              Anexos" com título sublinhado (essa continua igual, só no
              desktop, no bloco `hidden lg:block` logo abaixo). Abas em texto
              simples (sem fundo/borda de card): ativa em branco com
              underline na cor de destaque (primary), inativa em cinza
              (on-variant). Borda inferior de 1px branco bem transparente
              atravessa toda a largura, colada embaixo da fileira de abas.

              Conteúdo abaixo troca de verdade por aba — é um ternário (não
              CSS de visibilidade), então o lado escondido é DESMONTADO, não
              só invisível ocupando espaço. "Aulas" mostra `blocoModulo`
              (título do módulo + progresso + lista — o mesmo conteúdo da
              <aside> do desktop, que fica `hidden` aqui no mobile, ver
              abaixo); "Anexos" mostra só os documentos. Nenhum salto de
              scroll ao trocar: o que muda é só o miolo deste bloco — vídeo,
              linha "Módulo X • Aula Y de Z", título e a própria fileira de
              abas continuam exatamente onde estavam antes do clique. */}
          <div className="mt-6 lg:hidden">
            <div className="flex gap-6 text-sm font-semibold">
              <button type="button" onClick={() => setAbaMobile('aula')} className="relative pb-3">
                <span className={abaMobile === 'aula' ? 'text-white' : 'text-on-variant'}>Aulas</span>
                {abaMobile === 'aula' && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
              </button>
              <button type="button" onClick={() => setAbaMobile('anexos')} className="relative pb-3">
                <span className={abaMobile === 'anexos' ? 'text-white' : 'text-on-variant'}>Anexos</span>
                {abaMobile === 'anexos' && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
              </button>
            </div>
            <div className="border-b border-white/10" />

            <div className={abaMobile === 'aula' ? '' : 'pt-4'}>
              {abaMobile === 'aula' ? (
                blocoModulo
              ) : documentos.length > 0 ? (
                <div className="space-y-2">
                  {documentos.map((doc) => {
                    const Icone = iconeParaDocumento(doc.tipo);
                    return (
                      <a
                        key={doc.id}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 rounded-[0.6rem] border border-transparent bg-card px-4 py-3 text-sm text-on-surface transition-colors hover:border-primary hover:bg-surface-container"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-surface-high text-primary">
                          <Icone size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <p className="truncate font-medium text-white">{doc.nome}</p>
                          {doc.tamanho_bytes != null && (
                            <p className="text-xs text-on-variant">{formatBytes(doc.tamanho_bytes)}</p>
                          )}
                        </span>
                        <Download size={18} className="shrink-0 text-on-variant transition-colors group-hover:text-primary" />
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-on-variant">Nenhum documento disponível para esta aula.</p>
              )}
            </div>
          </div>

          {/* Desktop: seção "Documentos e Anexos" original, com título
              sublinhado — sempre visível mesmo sem documentos, mantém o
              espaçamento consistente com o resto da página. */}
          <div className="mt-8 hidden lg:block">
            <h2 className="text-base font-bold text-white">Documentos e Anexos</h2>
            <div className="mb-4 mt-2 h-0.5 w-full max-w-[11rem] bg-primary" />

            {documentos.length > 0 ? (
              <div className="max-w-[20rem] space-y-2">
                {documentos.map((doc) => {
                  const Icone = iconeParaDocumento(doc.tipo);
                  return (
                    <a
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 rounded-[0.6rem] border border-transparent bg-card px-4 py-3 text-sm text-on-surface transition-colors hover:border-primary hover:bg-surface-container"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-surface-high text-primary">
                        <Icone size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <p className="truncate font-medium text-white">{doc.nome}</p>
                        {doc.tamanho_bytes != null && (
                          <p className="text-xs text-on-variant">{formatBytes(doc.tamanho_bytes)}</p>
                        )}
                      </span>
                      <Download size={18} className="shrink-0 text-on-variant transition-colors group-hover:text-primary" />
                    </a>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-on-variant">Nenhum documento disponível para esta aula.</p>
            )}
          </div>
        </div>

        {/* Desktop apenas (hidden lg:flex): no mobile esse mesmo conteúdo
            (`blocoModulo`) vive dentro da aba "Aulas" logo acima — não faz
            sentido repetir a lista de aulas duas vezes na mesma tela.

            lg:sticky lg:top-4: gruda no topo da PRÓPRIA PÁGINA (não mais
            de uma div com scroll isolado) assim que ela rola — top-4
            (1rem) é o afastamento do topo ao fixar (valor pedido
            explicitamente, substitui o top-24/6rem anterior, que alinhava
            rente à altura real do Header em desktop). lg:max-h-
            [calc(100vh-6rem)]: teto de altura a partir desse mesmo ponto —
            sem isso, uma lista de aulas longa esticaria a <aside> (e o
            "sticky" junto) além da tela. lg:overflow-hidden aqui fora +
            lg:overflow-y-auto dentro (blocoModulo, no bloco da lista) é o
            que faz só a LISTA rolar por conta própria quando ultrapassa
            esse teto — o cabeçalho (título do módulo + progresso) fica
            fixo no topo da aside, nunca é empurrado pra fora por ela.
            lg:pr-6: margem direita da página (simétrica ao lg:pl-14 da
            coluna de conteúdo) — o gap-6 da fileira acima já é o respiro
            ATÉ aqui, isso aqui é só o respiro depois daqui até a borda da
            tela. lg:w-[28rem] (era lg:w-80/20rem): largura fixa da
            sidebar em desktop — só entra em jogo a partir de lg (a
            <aside> é `hidden` abaixo disso), então não afeta o mobile. */}
        <aside className="hidden w-full shrink-0 flex-col border-t border-border/60 lg:flex lg:w-[28rem] lg:overflow-hidden lg:border-l lg:border-t-0 lg:pr-6 lg:sticky lg:top-4 lg:max-h-[calc(100vh_-_6rem)]">
          {blocoModulo}
        </aside>
      </div>
    </div>
  );
}
