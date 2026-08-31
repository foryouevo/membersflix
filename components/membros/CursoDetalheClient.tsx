'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Lock, Play, PlayCircle } from 'lucide-react';
import AccessModal from '@/components/membros/AccessModal';
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
  const [modalOpen, setModalOpen] = useState(false);
  useDificultarInspecao();

  return (
    // Página inteira trava em 100vh e não rola verticalmente — hero e seção
    // de módulos dividem esse espaço fixo entre si (flex-col). Só o
    // carrossel, lá dentro, tem scroll (horizontal, tipo Netflix).
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Hero: capa do curso, conteúdo (badges/título/descrição/botões)
          ancorado embaixo e à esquerda, sobre um gradiente — mesmo padrão
          reutilizado pra qualquer curso, tudo vindo de `curso` (nada fixo
          tipo "UI UX DESIGN PRO" hardcoded). Altura em vh (não px): some da
          conta de h-screen, e o que sobra pra seção de módulos é sempre "o
          resto" (flex-1 dela) — por isso o total nunca ultrapassa 100vh. */}
      <div
        className={`relative flex h-[38vh] w-full shrink-0 items-end overflow-hidden sm:h-[44vh] ${!hasAccess ? 'locked-card' : ''}`}
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

        <div className="relative max-w-xl px-4 pb-16 sm:px-16">
          {/* Badge de categoria: 100% dinâmico, vem de curso.categoria (join
              feito na página) — some se o curso não tiver categoria
              cadastrada, em vez de mostrar um badge vazio. */}
          {curso.categoria?.nome && (
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-surface-high px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-on-variant">
                {curso.categoria.nome}
              </span>
            </div>
          )}

          <h1 className="text-2xl font-bold leading-tight text-white drop-shadow-lg sm:text-4xl">{curso.titulo}</h1>

          {curso.descricao && (
            <p className="mt-2 line-clamp-2 max-w-md text-sm leading-relaxed text-on-variant sm:line-clamp-3">{curso.descricao}</p>
          )}

          <div className="mt-4 flex items-center gap-3">
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

      {/* Seção de módulos: ocupa exatamente o espaço vertical restante
          (flex-1). `min-h-0` é essencial aqui — sem isso, o flexbox usa
          min-height:auto por padrão, que ignora o flex-1 e deixa o conteúdo
          "vazar" (voltando a criar scroll na página) sempre que o carrossel
          intrinsecamente quiser mais altura do que sobrou — típico em telas
          baixas tipo 1366x768. Com min-h-0, é essa seção (e o carrossel
          dentro dela) que encolhe pra caber, não a página que estica. */}
      <div className="min-h-0 flex-1 px-12 py-8" style={{ background: 'linear-gradient(0deg,rgba(15, 15, 15, 1) 0%, rgba(1, 1, 1, 1) 100%)' }}>
        <ModulosCarousel
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

function ModulosCarousel({
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
  // Embla cuida de drag com mouse, swipe de touch e das animações suaves de
  // scroll — reimplementar isso na mão em cima do scroll nativo (como era
  // antes, com scrollBy/scrollLeft) seria bem mais código e mais frágil,
  // então usamos a lib pra isso em vez de montar do zero. `loop: false` de
  // propósito: o loop nativo do Embla reposiciona os cards reais via
  // transform pra simular um carrossel infinito, o que exige ter cards de
  // sobra pra cobrir a largura nas duas pontas (senão ele desativa o loop
  // sozinho, sem aviso) — não é o comportamento pedido aqui. Em vez disso, o
  // fim de lista é tratado nos handlers abaixo: um scroll normal de volta
  // pro primeiro/último item, sem duplicar nada na lista renderizada.
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start', dragFree: false });

  function irParaAnterior() {
    if (!emblaApi) return;
    // No primeiro item, "anterior" não desabilita — volta pro último com um
    // scroll suave só (emblaApi.scrollTo anima por padrão; não é instantâneo).
    if (emblaApi.selectedScrollSnap() === 0) {
      emblaApi.scrollTo(emblaApi.scrollSnapList().length - 1);
    } else {
      emblaApi.scrollPrev();
    }
  }

  function irParaProxima() {
    if (!emblaApi) return;
    const ultimoIndice = emblaApi.scrollSnapList().length - 1;
    // No último item, "próxima" volta pro primeiro com o mesmo scroll suave
    // — um reset simples, não um carrossel infinito com itens repetidos.
    if (emblaApi.selectedScrollSnap() === ultimoIndice) {
      emblaApi.scrollTo(0);
    } else {
      emblaApi.scrollNext();
    }
  }

  return (
    // h-full: recebe a altura exata que a seção de módulos calculou pra ela
    // (o "resto" do 100vh depois do hero) e reparte entre o título (linha
    // fixa) e a área do carrossel (o resto disso, de novo).
    <div className="flex h-full min-h-0 flex-col">
      {/* Título da seção + setas de navegação lado a lado, alinhadas à direita
          na mesma linha — não ficam mais sobrepostas aos cards nas laterais
          do carrossel. As setas nunca somem: o wrap manual (irParaAnterior/
          irParaProxima acima) garante que sempre há uma próxima ação, mesmo
          nas pontas da lista. shrink-0: essa linha nunca perde altura — só a
          área do carrossel abaixo encolhe quando a tela é baixa. */}
      <div className="mb-2 flex shrink-0 items-center justify-between gap-4">
        {/* Fixo, de propósito — não vem de curso.titulo nem de nenhum outro
            campo do banco. É o mesmo texto em toda página de curso da
            plataforma, independente de qual curso for exibido. */}
        <h2 className="ml-[10px] text-[1.6rem] font-bold text-white">Módulos do curso</h2>
        {modulos.length > 1 && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={irParaAnterior}
              aria-label="Módulos anteriores"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-high text-on-variant transition-colors hover:bg-primary hover:text-white"
            >
              <ChevronLeft size={20} strokeWidth={1.5} />
            </button>
            <button
              onClick={irParaProxima}
              aria-label="Próximos módulos"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-high text-on-variant transition-colors hover:bg-primary hover:text-white"
            >
              <ChevronRight size={20} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      {modulos.length === 0 ? (
        <p className="text-sm text-on-variant">Nenhum módulo publicado ainda.</p>
      ) : (
        // `overflow-hidden` é a "janela" do carrossel (ref do Embla), agora
        // com altura relativa (flex-1 min-h-0 — o resto do espaço depois do
        // título) em vez de "altura do conteúdo": é isso que faz ela encolher
        // em telas baixas em vez de empurrar a página pra baixo. Continua
        // `overflow-hidden` nos dois eixos (não `overflow-x-auto` +
        // `overflow-y-visible` como poderia parecer o caminho óbvio pra não
        // cortar o hover): o CSS normaliza isso sozinho — quando um eixo é
        // "visible" e o outro não, o "visible" vira "auto" (mesma regra já
        // documentada no comentário do ModulosCarousel antes do Embla
        // entrar) — ou seja, ainda cortaria, só que sem avisar. Também
        // precisamos do overflow-hidden nos dois eixos aqui mesmo: é ele que
        // esconde os cards fora da área visível do carrossel (senão a lista
        // inteira apareceria de uma vez, sem o efeito de "janela" rolável).
        // A solução real é dar folga de verdade (abaixo) — grande o
        // suficiente pra cobrir não só o scale-[1.04] (2% do card) mas
        // também o shadow-overlay do hover, que se espalha até 24px pra fora
        // da borda do card.
        <div className="min-h-0 flex-1 overflow-hidden" ref={emblaRef}>
          {/* px-2 py-6 no track: a altura/largura de cada card (abaixo) vem
              daqui — 100% do espaço, menos essa folga. py-6 (24px) cobre o
              scale-[1.04] + a sombra do hover sem cortar em cima/embaixo;
              px-2 dá uma margem pros cards das pontas (1º e último), que
              antes não tinham nenhuma folga lateral pro hover. */}
          <div className="flex h-full gap-4 px-2 py-6">
            {modulos.map((modulo) => (
              // aspect-[3/4] + h-full: a largura normalmente vem calculada a
              // partir da altura disponível, pra encolher em telas baixas sem
              // nunca criar scroll de página (ver comentário na seção acima).
              // min-w-40/max-w-64: card mais largo do que estava (o ajuste
              // anterior, só com max-w-52, tinha ficado estreito demais) —
              // o min-w garante um piso mesmo quando a altura disponível é
              // pequena (nesse caso a proporção 3:4 deixa de ser exata, mas
              // o overflow-hidden do carrossel evita que isso vire scroll de
              // página); o max-w evita ficar enorme demais em telas altas.
              <div key={modulo.id} className="aspect-[3/4] h-full min-w-40 max-w-64 shrink-0">
                <ModuloCard
                  modulo={modulo}
                  hasAccess={hasAccess}
                  bloqueadoPorTrial={hasAccess && trialModuloUnicoId !== null && trialModuloUnicoId !== modulo.id}
                  onClickLocked={onClickLocked}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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
