'use client';

import { useEffect, useState, type ReactNode } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Carrossel genérico, extraído do ModulosCarousel original (CursoDetalheClient,
// seção "Módulos do curso") pra ser reaproveitado em qualquer lista de cards —
// hoje usado ali e também na Home (Meus Cursos / Todos os Cursos). Mesma lib
// (Embla: drag com mouse, swipe de touch, animação suave) e mesma lógica de
// navegação: as setas nunca desabilitam, um "wrap" manual (irParaAnterior/
// irParaProxima) volta pro início/fim com scroll suave em vez de usar o loop
// infinito nativo do Embla (que exige cards duplicados de sobra pra cobrir a
// largura nas pontas).
//
// Os *ClassName ficam todos configuráveis porque os dois usos hoje têm
// necessidades de layout diferentes: os módulos travam a altura (h-screen da
// página de curso, cards em aspect-ratio) enquanto os cursos da Home rolam
// com a página normalmente e os cards têm largura em % por breakpoint
// (flex-basis) — os defaults abaixo reproduzem exatamente o comportamento
// original dos módulos; quem usa fora desse contexto passa suas próprias
// classes (ver VitrinePageClient).
export default function Carousel<T>({
  items,
  renderItem,
  getKey,
  title,
  titleClassName = 'ml-[10px] text-[1.6rem] font-bold text-white',
  prevLabel = 'Anteriores',
  nextLabel = 'Próximos',
  emptyMessage,
  outerClassName = 'flex h-full min-h-0 flex-col',
  headerClassName = 'mb-2 flex shrink-0 items-center justify-between gap-4',
  viewportClassName = 'min-h-0 flex-1 overflow-hidden',
  trackClassName = 'flex h-full gap-4 px-2 py-6',
  itemClassName,
}: {
  items: T[];
  renderItem: (item: T) => ReactNode;
  getKey?: (item: T, index: number) => string;
  title: ReactNode;
  titleClassName?: string;
  prevLabel?: string;
  nextLabel?: string;
  emptyMessage: string;
  outerClassName?: string;
  headerClassName?: string;
  viewportClassName?: string;
  trackClassName?: string;
  itemClassName: string;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start', dragFree: false });
  const [podeNavegar, setPodeNavegar] = useState(false);

  // Quando os cards cabem todos de uma vez (ex: uma categoria com só 2
  // cursos numa tela que mostra 4 por vez) o Embla só tem 1 "snap" de
  // scroll — nesse caso não tem pra onde navegar, então as setas ficam
  // desativadas (visual + clique bloqueado) em vez de escondidas, já que a
  // lista pode crescer depois e a seção continua ali. `reInit` é o evento
  // que o Embla dispara sozinho em resize (breakpoint mudando quantos cards
  // cabem por vez), então isso se reavalia automaticamente ao redimensionar
  // a tela, sem precisar calcular a mão quantos cards cada breakpoint mostra.
  useEffect(() => {
    if (!emblaApi) return;
    const atualizar = () => setPodeNavegar(emblaApi.scrollSnapList().length > 1);
    atualizar();
    emblaApi.on('reInit', atualizar);
    return () => {
      emblaApi.off('reInit', atualizar);
    };
  }, [emblaApi]);

  function irParaAnterior() {
    if (!emblaApi || !podeNavegar) return;
    // No primeiro item, "anterior" não desabilita — volta pro último com um
    // scroll suave só (emblaApi.scrollTo anima por padrão; não é instantâneo).
    if (emblaApi.selectedScrollSnap() === 0) {
      emblaApi.scrollTo(emblaApi.scrollSnapList().length - 1);
    } else {
      emblaApi.scrollPrev();
    }
  }

  function irParaProxima() {
    if (!emblaApi || !podeNavegar) return;
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
    <div className={outerClassName}>
      <div className={headerClassName}>
        <h2 className={titleClassName}>{title}</h2>
        {/* `podeNavegar` (não `items.length > 1`): só aparecem quando o
            conteúdo de fato ultrapassa a largura visível do carrossel —
            Embla já calcula isso sozinho via scrollSnapList().length > 1
            (mais de 1 "página" de scroll = tem overflow de verdade), e
            reavalia em resize através do evento `reInit` (useEffect acima).
            Com todos os cards cabendo de uma vez (por mais itens que
            existam) ou com 0/1 item, as setas somem por completo — não só
            ficam desativadas. */}
        {podeNavegar && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={irParaAnterior}
              aria-label={prevLabel}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-high text-on-variant transition-colors hover:bg-primary hover:text-white"
            >
              <ChevronLeft size={20} strokeWidth={1.5} />
            </button>
            <button
              onClick={irParaProxima}
              aria-label={nextLabel}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-high text-on-variant transition-colors hover:bg-primary hover:text-white"
            >
              <ChevronRight size={20} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-on-variant">{emptyMessage}</p>
      ) : (
        <div className={viewportClassName} ref={emblaRef}>
          <div className={trackClassName}>
            {items.map((item, i) => (
              <div key={getKey ? getKey(item, i) : i} className={itemClassName}>
                {renderItem(item)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
