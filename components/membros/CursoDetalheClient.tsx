'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Lock, Play, PlayCircle } from 'lucide-react';
import AccessModal from '@/components/membros/AccessModal';
import Carousel from '@/components/membros/Carousel';
import { useDificultarInspecao } from '@/hooks/useDificultarInspecao';
import { formatTitulo } from '@/lib/utils';
import type { Aula, Curso, Documento, Modulo } from '@/types';

type ModuloComAulas = Modulo & { aulas: (Aula & { documentos: Documento[]; concluida: boolean })[] };

export default function CursoDetalheClient({
  curso,
  hasAccess,
  modulos,
  trialModuloUnicoId,
  numeroWhatsapp,
  proximaAulaId,
}: {
  curso: Curso;
  hasAccess: boolean;
  modulos: ModuloComAulas[];
  trialModuloUnicoId: string | null;
  totalAulas: number;
  concluidas: number;
  numeroWhatsapp: string | null;
  proximaAulaId: string | null;
  jaComecou: boolean;
}) {
  const router = useRouter();
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
    <div className="flex min-h-full flex-col bg-background">
      {/* Hero: capa do curso, conteúdo (voltar/badge/título/descrição/botão)
          ancorado embaixo e à esquerda, sobre um gradiente — mesmo padrão
          reutilizado pra qualquer curso, tudo vindo de `curso` (nada fixo
          tipo "UI UX DESIGN PRO" hardcoded). Altura no mobile: intrínseca ao
          conteúdo (sem h-[Xvh] forçado) — o hero só ocupa o que precisa, sem
          "adivinhar" uma porcentagem da tela, sobrando o máximo possível pra
          seção de módulos (que é onde o card de 24.5rem precisa caber). Em
          sm: volta a ser h-[44vh] fixo, como sempre foi. */}
      <div
        className={`relative flex w-full shrink-0 items-center overflow-hidden sm:h-[44vh] ${!hasAccess ? 'locked-card' : ''}`}
      >
        {curso.capa_url && <Image src={curso.capa_url} alt={curso.titulo} fill priority className="object-cover" />}
        {/* Mesmo padrão de gradiente do banner da Home (VitrinePageClient):
            tom vermelho sutil (from-primary/20) se misturando ao preto,
            diagonal — aqui como overlay de verdade sobre a capa, não só
            fallback de quando não há imagem. Empilhado com o gradiente
            vertical já existente (mais escuro embaixo/nas laterais, onde o
            texto fica; mais claro em cima, pra não esconder a capa toda) —
            juntos dão a profundidade + o tom vermelho pedidos, só nessa
            capa, sem mexer em nenhum outro gradiente da página (cards do
            carrossel, sidebar etc. continuam como estavam). */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/10" />

        <div className="relative px-6 py-12 sm:px-16">
          {/* Voltar: router.back() em vez de link fixo pra Home, porque a
              página de curso é acessada de mais de um lugar (Home, "Meus
              Cursos", categorias) — back() sempre volta pra de onde o aluno
              realmente veio, não força ele pra Home se veio de outro lugar.
              Mesmo padrão visual dos botões de seta do carrossel (Carousel.tsx
              — bg-surface-high, hover vermelho) pra ficar consistente com o
              resto da UI. Só aparece no mobile (md:hidden — mesmo breakpoint
              que MembrosSidebar usa pra trocar bottom nav por sidebar fixa):
              em telas md+ o aluno já tem a sidebar lateral pra navegar, essa
              seta ali ficaria redundante. */}
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Voltar"
            className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-high text-on-variant transition-colors hover:bg-primary hover:text-white sm:mb-4 md:hidden"
          >
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>

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

          <h1 className="text-[2.3rem] font-bold leading-tight text-white drop-shadow-lg sm:text-[3.5rem]">{curso.titulo}</h1>

          {curso.descricao && (
            <p className="mt-1.5 line-clamp-2 max-w-md text-sm leading-relaxed text-on-variant sm:mt-2 sm:line-clamp-3">{curso.descricao}</p>
          )}

          <div className="mt-3 flex items-center gap-3 sm:mt-4">
            {hasAccess ? (
              proximaAulaId ? (
                <Link href={`/membros/player/${proximaAulaId}`} className="btn-primary flex items-center gap-2">
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
      <div
        className="shrink-0 space-y-8 px-4 py-8 sm:space-y-10 sm:px-12"
        style={{ background: 'linear-gradient(0deg,rgba(15, 15, 15, 1) 0%, rgba(1, 1, 1, 1) 100%)' }}
      >
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
}: {
  modulos: ModuloComAulas[];
  hasAccess: boolean;
  trialModuloUnicoId: string | null;
  onClickLocked: () => void;
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
        titleClassName="ml-[10px] text-[1.6rem] font-bold text-white"
        hasAccess={hasAccess}
        trialModuloUnicoId={trialModuloUnicoId}
        onClickLocked={onClickLocked}
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
            titleClassName="ml-[10px] text-xl font-bold text-white"
            hasAccess={hasAccess}
            trialModuloUnicoId={trialModuloUnicoId}
            onClickLocked={onClickLocked}
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
}: {
  modulos: ModuloComAulas[];
  titulo: string;
  titleClassName: string;
  hasAccess: boolean;
  trialModuloUnicoId: string | null;
  onClickLocked: () => void;
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
      headerClassName="mb-3 flex shrink-0 items-center justify-between gap-4"
      // Só o eixo X esconde overflow (a "janela" horizontal do carrossel);
      // sem trava de altura aqui — cada linha ocupa a altura natural do seu
      // conteúdo, e é a página como um todo que rola quando várias seções
      // juntas passam da tela.
      viewportClassName="overflow-hidden"
      // py-6 (24px) cobre o scale-[1.04] do hover + a sombra sem cortar em
      // cima/embaixo; px-2 dá margem pros cards das pontas.
      trackClassName="flex gap-4 px-2 py-6"
      // Largura fixa por breakpoint (w-36/sm:w-44/lg:w-48), com aspect-[3/4]
      // definindo a altura a partir dela — o padrão de antes de existir
      // hierarquia de módulos, quando também não havia trava de altura na
      // página.
      itemClassName="aspect-[3/4] w-36 shrink-0 sm:w-44 lg:w-48"
      renderItem={(modulo) => (
        <ModuloCard
          modulo={modulo}
          hasAccess={hasAccess}
          bloqueadoPorTrial={hasAccess && trialModuloUnicoId !== null && trialModuloUnicoId !== modulo.id}
          onClickLocked={onClickLocked}
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
}: {
  modulo: ModuloComAulas;
  hasAccess: boolean;
  bloqueadoPorTrial: boolean;
  onClickLocked: () => void;
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
        className={`relative h-full w-full overflow-hidden rounded-lg bg-surface-highest ring-1 ring-transparent transition-all duration-200 ease-out group-hover:scale-[1.04] group-hover:shadow-overlay group-hover:ring-primary/60 ${bloqueado ? 'locked-card' : ''}`}
      >
        {modulo.capa_url && (
          <Image
            src={modulo.capa_url}
            alt={modulo.titulo}
            fill
            className="object-cover"
            sizes="200px"
          />
        )}

        {/* Gradiente escuro na base pra legibilidade do nome do módulo por cima da imagem */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        <div className="absolute inset-0 flex items-center justify-center">
          <PlayCircle size={30} className="text-white/90 drop-shadow" />
        </div>

        {bloqueado && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Lock size={24} className="text-white" />
          </div>
        )}

        {/* font-size 1.1rem / font-weight 400 substituem o estilo anterior
            (0.95rem / font-semibold); margin: 10px e padding: 0 5px continuam
            os mesmos de antes. Cor branca e posição (canto inferior, sobre a
            imagem) também continuam. Sem ícone antes do texto — não havia
            nenhum aqui pra remover. */}
        <p className="absolute inset-x-0 bottom-2 m-[10px] px-[5px] py-0 text-[1.1rem] font-normal leading-tight text-white">
          {formatTitulo(modulo.titulo)}
        </p>

        {/* Barra de progresso fina na borda inferior do card */}
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
  // fica acessível até a confirmação do pagamento): sem clique, sem abrir o
  // modal de "solicitar acesso" (que é pra quem não tem o curso liberado).
  if (bloqueadoPorTrial) {
    return (
      <div title="Disponível após a confirmação do pagamento" className="block h-full w-full cursor-not-allowed">
        {content}
      </div>
    );
  }

  if (!proximaAulaDoModulo) {
    return <div className="block h-full w-full cursor-not-allowed opacity-60">{content}</div>;
  }

  return (
    <Link href={`/membros/player/${proximaAulaDoModulo.id}`} className="block h-full w-full">
      {content}
    </Link>
  );
}
