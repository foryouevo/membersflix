'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Lock, Play } from 'lucide-react';
import AccessModal from '@/components/membros/AccessModal';
import Carousel from '@/components/membros/Carousel';
import { useDificultarInspecao } from '@/hooks/useDificultarInspecao';
import { formatTitulo } from '@/lib/utils';
import type { Aula, Curso, Documento, Modulo } from '@/types';

type ModuloComAulas = Modulo & { aulas: (Aula & { documentos: Documento[]; concluida: boolean })[] };

// Fallback pra rota clássica quando cursoSlug/aula.slug vier vazio —
// acontece se a migration 011 (coluna `slug`) ainda não rodou em produção,
// não é um bug de query/nome de campo (a coluna literalmente não existe
// ainda no banco, então todo `select` volta sem ela). Sem isso, o link
// virava `/curso/undefined/undefined` (404) — com isso, cai de volta pra
// rota que já funciona hoje. Usado nos dois pontos que montam link de
// aula neste arquivo (hero + ModuloCard).
function hrefAulaFallback(cursoSlug: string, aula: { id: string; slug: string }) {
  return cursoSlug && aula.slug ? `/curso/${cursoSlug}/${aula.slug}` : `/membros/player/${aula.id}`;
}

export default function CursoDetalheClient({
  curso,
  hasAccess,
  modulos,
  trialModuloUnicoId,
  numeroWhatsapp,
  proximaAula,
  hrefsPorAula = {},
}: {
  curso: Curso;
  hasAccess: boolean;
  modulos: ModuloComAulas[];
  trialModuloUnicoId: string | null;
  totalAulas: number;
  concluidas: number;
  numeroWhatsapp: string | null;
  // Objeto (era só o id) — passa a carregar `slug` também (usado só pelo
  // fallback do href, ver `hrefsPorAula` abaixo).
  proximaAula: { id: string; slug: string } | null;
  // Dicionário aulaId -> href PRONTO (era uma função `(aula) => string`,
  // mas função não pode atravessar a fronteira Server->Client Component:
  // este é um Client Component ['use client' no topo], e as páginas que o
  // usam são Server Components — só dados serializáveis passam, não
  // funções). Sem entrada pro id (default {}, ou id ausente do mapa), cai
  // no fallback /curso/[slug-do-curso]/[slug-da-aula] (usando `curso.slug`
  // + o slug da própria aula — ver os dois usos de `cursoSlug` mais
  // abaixo) — mesma rota nova que app/membros/curso/[id]/page.tsx (a
  // clássica, sem passar nada aqui) e app/(portal)/curso/[slug]/page.tsx
  // (que monta o dicionário completo) acabam usando de qualquer forma.
  hrefsPorAula?: Record<string, string>;
  jaComecou: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  useDificultarInspecao();

  return (
    // A página agora rola verticalmente de novo (deixou de travar em h-dvh):
    // com módulo-pai virando uma seção própria (título + carrossel), o
    // número de linhas é variável por curso (de 0 a N seções de pai, mais a
    // leva de módulos soltos) — não dá mais pra garantir que tudo cabe numa
    // tela só, como quando era sempre exatamente 1 carrossel. O scroll em si
    // já vem de graça do <main overflow-y-auto> do layout (app/membros/layout.tsx)
    // que envolve esta página — só precisava parar de brigar com ele.
    // Sem bg-background: o fundo (gradiente vermelho/preto) agora é só do
    // <body> (app/globals.css) — um bg-background aqui em cima cobriria ele
    // por completo com uma cor plana, recriando a emenda visível entre essa
    // página e as outras.
    <div className="-mt-14 flex min-h-full flex-col md:-mt-20">
      {/* Hero: capa do curso, conteúdo (badge/título/descrição/botão) ancorado
          embaixo e à esquerda, sobre um gradiente — mesmo padrão reutilizado
          pra qualquer curso, tudo vindo de `curso` (nada fixo tipo "UI UX
          DESIGN PRO" hardcoded). h-[36vh] no mobile (era intrínseco ao
          conteúdo, sem altura forçada — trocado por pedido explícito) /
          sm:h-[44vh] a partir de sm, como sempre foi. */}
      <div
        className={`relative flex h-[36vh] w-full shrink-0 items-center overflow-hidden sm:h-[44vh] ${!hasAccess ? 'locked-card' : ''}`}
      >
        {curso.capa_url && <Image src={curso.capa_url} alt={curso.titulo} fill priority className="object-cover" />}

        {/* pt-14/md:pt-20: espaço pro Header fixo não cobrir a
            badge/título — é transparente e flutua por cima do hero, então
            só o conteúdo de texto aqui dentro precisa dessa folga, não a
            imagem/gradiente (que começam no topo de verdade nas duas
            larguras — ver o -mt-14/md:-mt-20 no container da página
            acima). pb-12 continua fixo em qualquer tela (pedido à parte,
            nada a ver com o header). */}
        <div className="relative px-6 pb-12 pt-14 sm:px-16 md:pt-20">
          {/* Badge de categoria: 100% dinâmico, vem de curso.categoria (join
              feito na página) — some se o curso não tiver categoria
              cadastrada, em vez de mostrar um badge vazio. */}
          {curso.categoria?.nome && (
            <div className="mb-1.5 flex items-center gap-2 sm:mb-2">
              <span className="rounded-full bg-surface-high px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-on-variant">
                {curso.categoria.nome}
              </span>
            </div>
          )}

          <h1 className="text-[2rem] font-bold leading-tight text-white drop-shadow-lg sm:text-[3.5rem]">{curso.titulo}</h1>

          {curso.descricao && (
            <p className="mt-1.5 line-clamp-2 max-w-md text-sm leading-relaxed text-on-variant sm:mt-2 sm:line-clamp-3">{curso.descricao}</p>
          )}

          <div className="mt-3 flex items-center gap-3 sm:mt-4">
            {hasAccess ? (
              proximaAula ? (
                <Link
                  href={hrefsPorAula[proximaAula.id] ?? hrefAulaFallback(curso.slug, proximaAula)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Play size={16} className="fill-white" />
                  Assistir Agora
                </Link>
              ) : (
                <button type="button" disabled className="btn-primary flex items-center gap-2">
                  <Play size={16} className="fill-white" />
                  Assistir Agora
                </button>
              )
            ) : (
              <button type="button" onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
                <Play size={16} className="fill-white" />
                Assistir Agora
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Seção de módulos: altura natural agora (não mais flex-1/min-h-0
          travando num "resto de tela") — cresce com o conteúdo, e quem rola
          é a página (via o <main> do layout). shrink-0 pra não ser
          espremida pelo flex-col do container quando o conteúdo é curto. */}
      {/* Sem background próprio (era um linear-gradient escuro só desta
          seção — mesma emenda que existia na Home entre o hero e "Meus
          Cursos"/"Todos os Cursos", resolvida do mesmo jeito: deixando o
          <body> ser o único fundo do app). */}
      <div className="shrink-0 space-y-8 px-4 py-8 sm:space-y-10 sm:px-12">
        {/* "Módulos do curso" não é mais renderizado como <h2> solto aqui em
            cima — isso deixava uma caixa vazia entre o título e a linha de
            setas logo abaixo (duas linhas por causa do space-y do
            container, quando cabiam numa só). Agora o texto entra DENTRO da
            mesma div flex que já tem as setas — ver SecoesDeModulos, onde
            "Módulos do curso" vira o `titulo` passado pro Carousel quando o
            curso não tem módulo-pai nenhum (uma seção só, título + setas na
            mesma linha). Com módulo-pai, cada seção já tem o próprio título
            real (nome do pai/módulo) nessa mesma linha com as setas dela —
            não haveria onde encaixar um "Módulos do curso" genérico sem
            duplicar/atropelar um título que já é específico. */}
        <SecoesDeModulos
          modulos={modulos}
          hasAccess={hasAccess}
          trialModuloUnicoId={trialModuloUnicoId}
          onClickLocked={() => setModalOpen(true)}
          hrefsPorAula={hrefsPorAula}
          cursoSlug={curso.slug}
        />
      </div>

      <AccessModal open={modalOpen} onClose={() => setModalOpen(false)} curso={curso} numeroWhatsapp={numeroWhatsapp} />
    </div>
  );
}

/**
 * Agrupa a lista flat de módulos em seções, cada uma na sua própria posição
 * na página seguindo a `ordem` do item de nível raiz (a mesma ordem definida
 * no admin), MAS só quando existe pelo menos um módulo-pai de verdade no
 * curso. Dois comportamentos possíveis, decididos por `temAlgumPai`:
 *
 * - Nenhum módulo-pai (ex: "UI UX DESIGN PRO", onde todo módulo é raiz solto)
 *   -> comportamento original, anterior a essa hierarquia toda: uma fileira
 *   só com todos os módulos, com "Módulos do curso" como título dessa
 *   fileira (na mesma linha das setas — é a única seção, então não há
 *   título por módulo individual).
 * - Pelo menos um módulo-pai (ex: "FAW School", onde a maioria dos módulos
 *   tem submódulo mas alguns — "Dominando o Premiere", "BÔNUS e Extras" —
 *   são exceções soltas) -> cada entrada de nível raiz vira sua própria
 *   seção, todas no mesmo estilo visual (mesmo tamanho de título, mesmo
 *   espaçamento): módulo-pai mostra o nome dele + carrossel só com os
 *   filhos; módulo raiz solto mostra o próprio nome + "carrossel" de 1 card
 *   só (o Carousel genérico já esconde as setas sozinho com 1 item).
 *
 * 100% genérico: a decisão é sempre "existe pai neste curso?", nunca o nome
 * de um curso/módulo específico.
 */
function SecoesDeModulos({
  modulos,
  hasAccess,
  trialModuloUnicoId,
  onClickLocked,
  hrefsPorAula,
  cursoSlug,
}: {
  modulos: ModuloComAulas[];
  hasAccess: boolean;
  trialModuloUnicoId: string | null;
  onClickLocked: () => void;
  hrefsPorAula: Record<string, string>;
  cursoSlug: string;
}) {
  const filhosPorPai = new Map<string, ModuloComAulas[]>();
  for (const m of modulos) {
    if (m.modulo_pai_id) {
      const lista = filhosPorPai.get(m.modulo_pai_id) ?? [];
      lista.push(m);
      filhosPorPai.set(m.modulo_pai_id, lista);
    }
  }
  for (const lista of filhosPorPai.values()) lista.sort((a, b) => a.ordem - b.ordem);

  const raizOrdenada = modulos.filter((m) => !m.modulo_pai_id).sort((a, b) => a.ordem - b.ordem);

  if (raizOrdenada.length === 0) {
    return <p className="text-sm text-on-variant">Nenhum módulo publicado ainda.</p>;
  }

  const temAlgumPai = raizOrdenada.some((item) => (filhosPorPai.get(item.id)?.length ?? 0) > 0);

  if (!temAlgumPai) {
    return (
      <ModuloCarrosselSecao
        modulos={raizOrdenada}
        // Sem nenhum módulo-pai no curso, essa é a ÚNICA seção — o título
        // geral "Módulos do curso" (fixo, não vem de curso.titulo nem de
        // nenhum campo do banco) entra direto aqui, na mesma linha das
        // setas, em vez de um <h2> solto acima sobrando espaço.
        titulo="Módulos do curso"
        titleClassName="ml-[10px] font-medium text-2xl text-white"
        hasAccess={hasAccess}
        trialModuloUnicoId={trialModuloUnicoId}
        onClickLocked={onClickLocked}
        hrefsPorAula={hrefsPorAula}
        cursoSlug={cursoSlug}
      />
    );
  }

  return (
    <>
      {raizOrdenada.map((item) => {
        const filhos = filhosPorPai.get(item.id) ?? [];
        return (
          <ModuloCarrosselSecao
            key={item.id}
            // Pai: os filhos dele. Solto: ele mesmo, sozinho na lista — o
            // Carousel trata isso normal, só sem setas (só 1 item).
            modulos={filhos.length > 0 ? filhos : [item]}
            titulo={formatTitulo(item.titulo)}
            titleClassName="ml-[10px] font-medium text-[1.3rem] text-white sm:text-2xl"
            hasAccess={hasAccess}
            trialModuloUnicoId={trialModuloUnicoId}
            onClickLocked={onClickLocked}
            hrefsPorAula={hrefsPorAula}
            cursoSlug={cursoSlug}
          />
        );
      })}
    </>
  );
}

function ModuloCarrosselSecao({
  modulos,
  titulo,
  titleClassName,
  hasAccess,
  trialModuloUnicoId,
  onClickLocked,
  hrefsPorAula,
  cursoSlug,
}: {
  modulos: ModuloComAulas[];
  titulo: string;
  titleClassName: string;
  hasAccess: boolean;
  trialModuloUnicoId: string | null;
  onClickLocked: () => void;
  hrefsPorAula: Record<string, string>;
  cursoSlug: string;
}) {
  return (
    // Carrossel genérico (components/membros/Carousel.tsx — Embla: drag com
    // mouse, swipe de touch, wrap manual nas pontas em vez do loop infinito
    // nativo). Diferente da versão de página única (h-dvh, card com altura
    // vindo do espaço restante): agora pode haver várias dessas seções
    // empilhadas na página (uma por módulo-pai), então a página rola e cada
    // carrossel tem card de LARGURA fixa (não mais altura calculada a partir
    // do "resto da tela") — mesmo padrão usado nos carrosséis da Home
    // (VitrinePageClient).
    <Carousel
      items={modulos}
      getKey={(modulo) => modulo.id}
      title={titulo}
      titleClassName={titleClassName}
      prevLabel={`${titulo}: anteriores`}
      nextLabel={`${titulo}: próximos`}
      emptyMessage="Nenhum módulo publicado ainda."
      outerClassName="flex flex-col"
      headerClassName="flex shrink-0 items-center justify-between gap-4"
      // Só o eixo X esconde overflow (a "janela" horizontal do carrossel);
      // sem trava de altura aqui — cada linha ocupa a altura natural do seu
      // conteúdo, e é a página como um todo que rola quando várias seções
      // juntas passam da tela.
      viewportClassName="overflow-hidden"
      // py-6 (24px) cobre o scale-[1.04] do hover + a sombra sem cortar em
      // cima/embaixo; px-2 dá margem pros cards das pontas.
      trackClassName="flex gap-4 px-2 py-6"
      // w-[15rem] no mobile (era 17rem fixo em qualquer largura) / sm:w-[17rem]
      // a partir de sm — trocado por pedido explícito; aspect-[3/4] continua
      // definindo a altura a partir da largura, em qualquer breakpoint.
      // shrink-0 impede o flex do carrossel (trackClassName) de comprimir o
      // card.
      itemClassName="aspect-[3/4] w-[15rem] shrink-0 sm:w-[17rem]"
      renderItem={(modulo) => (
        <ModuloCard
          modulo={modulo}
          hasAccess={hasAccess}
          bloqueadoPorTrial={hasAccess && trialModuloUnicoId !== null && trialModuloUnicoId !== modulo.id}
          onClickLocked={onClickLocked}
          hrefsPorAula={hrefsPorAula}
          cursoSlug={cursoSlug}
        />
      )}
    />
  );
}

function ModuloCard({
  modulo,
  hasAccess,
  bloqueadoPorTrial,
  onClickLocked,
  hrefsPorAula,
  cursoSlug,
}: {
  modulo: ModuloComAulas;
  hasAccess: boolean;
  bloqueadoPorTrial: boolean;
  onClickLocked: () => void;
  hrefsPorAula: Record<string, string>;
  cursoSlug: string;
}) {
  const bloqueado = !hasAccess || bloqueadoPorTrial;
  const assistidas = modulo.aulas.filter((a) => a.concluida).length;
  const progressoModulo = modulo.aulas.length > 0 ? Math.round((assistidas / modulo.aulas.length) * 100) : 0;
  // Continua de onde parou: primeira aula não assistida do módulo, ou a primeira aula se nenhuma foi assistida ainda.
  const proximaAulaDoModulo = modulo.aulas.find((a) => !a.concluida) ?? modulo.aulas[0] ?? null;

  const content = (
    // h-full em vez de aspect-[3/4]: a proporção 3/4 agora é definida no
    // wrapper do slide (ModulosCarousel), aqui só herda a altura/largura já
    // calculadas — repetir aspect-ratio nos dois níveis seria redundante.
    <div className="group relative h-full w-full hover:z-10">
      <div
        className={`relative flex h-full w-full flex-col overflow-hidden rounded-lg px-4 pb-4 ring-1 ring-transparent transition-all duration-200 ease-out group-hover:scale-[1.04] group-hover:shadow-overlay group-hover:ring-primary/60 ${bloqueado ? 'locked-card' : ''}`}
        // Fundo em gradiente (pedido explícito — era uma imagem de capa
        // antes) — MESMA paleta/formula do gradiente vermelho/escuro já
        // usado no resto da plataforma (app/globals.css, regra `body`),
        // só como linear em vez de radial: pra um card pequeno e
        // vertical como este, um degradê de cima pra baixo fica mais
        // natural que uma elipse pensada pra tela cheia — as CORES são
        // exatamente as mesmas, não inventei nenhuma nova.
        style={{ background: 'linear-gradient(180deg, #5c2020 0%, #3a1a1a 30%, #241717 55%, #141414 100%)' }}
      >
        {/* Logo centralizada (horizontal e verticalmente) na área
            disponível ACIMA do título — flex-1 ocupa todo o espaço que
            sobra no card, empurrando o título (fora desta div) pro final.
            Mesmo arquivo já usado no Header (public/logo.png). Altura
            aumentada pra h-8 (2rem) — pedido explícito desta tarefa. */}
        <div className="flex flex-1 items-center justify-center">
          <Image src="/logo.png" alt="" width={140} height={28} className="h-8 w-auto object-contain opacity-90" />
        </div>

        {/* font-size 1.1rem / font-weight 400 mantidos (eram o estilo já
            usado antes desta tarefa); posição fixa no final do card (fora
            do flex-1 acima). text-start (era text-center) — pedido
            explícito desta tarefa. */}
        <p className="text-start text-[1.1rem] font-normal leading-tight text-white">{formatTitulo(modulo.titulo)}</p>

        {bloqueado && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Lock size={24} className="text-white" />
          </div>
        )}

        {/* Barra de progresso fina na borda inferior do card — mantida
            como estava (pedido explícito). */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-surface-high">
          <div className="h-full bg-primary" style={{ width: `${progressoModulo}%` }} />
        </div>
      </div>
    </div>
  );

  if (!hasAccess) {
    return (
      <button onClick={onClickLocked} className="block h-full w-full text-left">
        {content}
      </button>
    );
  }

  // Módulo travado pelo trial de 30min (curso liberado, mas só o Módulo 1
  // fica acessível até a confirmação do pagamento): agora também abre o
  // MESMO modal "Você deseja liberar esse curso?" (AccessModal) no clique —
  // pedido explícito; antes era um <div> sem clique (só o tooltip title).
  if (bloqueadoPorTrial) {
    return (
      <button
        type="button"
        onClick={onClickLocked}
        title="Disponível após a confirmação do pagamento"
        className="block h-full w-full text-left"
      >
        {content}
      </button>
    );
  }

  if (!proximaAulaDoModulo) {
    return <div className="block h-full w-full cursor-not-allowed opacity-60">{content}</div>;
  }

  return (
    <Link
      href={hrefsPorAula[proximaAulaDoModulo.id] ?? hrefAulaFallback(cursoSlug, proximaAulaDoModulo)}
      className="block h-full w-full"
    >
      {content}
    </Link>
  );
}
