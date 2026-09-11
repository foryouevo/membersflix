'use client';

import { useRef, useState } from 'react';
import { ArrowRight, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import Carousel from '@/components/membros/Carousel';
import CardTitulo from '@/components/membros/CardTitulo';
import CourseCard from '@/components/membros/CourseCard';
import AccessModal from '@/components/membros/AccessModal';
import { buildSupportWhatsappLink } from '@/lib/utils';
import type { Curso } from '@/types';

// Largura de cada card do carrossel — 1 por vez no mobile (<640px), 2 a
// partir de sm (tablet), 3 a partir de lg (pedido explícito desta tarefa:
// "3 cursos por vez"). Percentuais um pouco abaixo da fração exata
// (48%/31%, não 50%/33.3%) pra sobrar espaço pro gap-4 do trackClassName
// sem estourar 100% da linha.
const ITEM_BASIS_CLASSES = 'flex-[0_0_100%] sm:flex-[0_0_48%] lg:flex-[0_0_31%]';

/**
 * "Cursos Recomendados" da tela de perfil — voltou a ser um CARROSSEL
 * nesta tarefa (tinha virado lista vertical numa tarefa anterior).
 *
 * Usa o Carousel.tsx já existente na plataforma (Embla — mesmo componente
 * de "Meus Cursos"/"Todos os Cursos" da Home), não Swiper.js: essa lib não
 * é dependência deste projeto (só embla-carousel-react está instalada) —
 * substituí pelo carrossel que já existe e já resolve exatamente o mesmo
 * padrão (setas + swipe), sem adicionar uma biblioteca nova.
 *
 * Cada item reaproveita CourseCard.tsx com hasAccess={false} — é o MESMO
 * componente/estilo já usado pra cursos bloqueados em qualquer lugar da
 * plataforma (Home, Busca, Meus Cursos): thumbnail em escala de cinza
 * (classe `locked-card`, grayscale(1)) + ícone de cadeado sobreposto,
 * exatamente o pedido desta tarefa. Clique abre o MESMO AccessModal
 * (WhatsApp) de sempre — nenhum fluxo de checkout/pagamento novo.
 *
 * Banner "Desbloqueie todo o catálogo" (de uma tarefa anterior, não citado
 * nesta mas mantido por não remover informação já implementada): WhatsApp
 * de suporte geral, mesmo link/padrão do botão "Falar com o Suporte".
 *
 * Setas do carrossel na MESMA linha do título, em QUALQUER largura —
 * inclusive mobile (pedido de uma tarefa posterior; antes ficavam
 * embutidas no cabeçalho próprio do Carousel, numa linha separada abaixo
 * do título, e depois só apareciam a partir de lg): mesma ponte
 * hideHeader/navControlsRef/onPodeNavegarChange já usada em
 * MeusCursosCard.tsx (ver comentário completo em Carousel.tsx) — nenhuma
 * lógica de navegação duplicada, só reposicionada. Mesmo estilo circular
 * das setas de "Meu(s) Curso(s)" — aqui cabem na linha do título em
 * qualquer largura (título curto o bastante); lá não cabem no mobile
 * (linha já ocupada pelos ícones de busca/filtro), por isso naquele card
 * elas vão sobrepostas nas laterais do carrossel em vez de ficarem aqui.
 * Clique nas setas soma-se ao swipe por toque, não substitui.
 */
export default function CursosRecomendados({ cursos, numeroWhatsapp }: { cursos: Curso[]; numeroWhatsapp: string | null }) {
  const [modalCurso, setModalCurso] = useState<Curso | null>(null);
  const carrosselNavRef = useRef<{ irParaAnterior: () => void; irParaProxima: () => void } | null>(null);
  const [carrosselPodeNavegar, setCarrosselPodeNavegar] = useState(false);
  const linkDesbloquear = numeroWhatsapp
    ? buildSupportWhatsappLink(numeroWhatsapp, 'Olá, quero desbloquear todo o catálogo de cursos.')
    : null;

  return (
    <div className="rounded-lg bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <CardTitulo className="min-w-0">Cursos Recomendados</CardTitulo>

        {/* Setas — mesmo estilo circular (h-9 w-9, bg-surface-high) das
            setas de "Meu(s) Curso(s)" ao lado. Pedido desta tarefa: também
            no mobile, na mesma linha do título (diferente de "Meu(s)
            Curso(s)", que não tem essa folga — ver comentário em
            MeusCursosCard.tsx). min-w-0+truncate no título ao lado
            (acima): garante que as setas nunca fiquem espremidas/
            sobrepostas, mesmo em telas bem estreitas — o título encolhe
            com reticências antes disso acontecer. Só aparecem quando o
            Carousel avisa (via onPodeNavegarChange) que há mais
            recomendados do que cabem de uma vez. irParaAnterior/
            irParaProxima vêm do próprio Carousel (navControlsRef, ver
            Carousel.tsx) — nenhuma lógica de navegação duplicada aqui. */}
        {carrosselPodeNavegar && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => carrosselNavRef.current?.irParaAnterior()}
              aria-label="Recomendados: anteriores"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-high text-on-variant transition-colors hover:bg-surface-container hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => carrosselNavRef.current?.irParaProxima()}
              aria-label="Recomendados: próximos"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-high text-on-variant transition-colors hover:bg-surface-container hover:text-white"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {cursos.length === 0 ? (
        <p className="text-sm text-on-variant">Nenhuma recomendação no momento.</p>
      ) : (
        <Carousel
          items={cursos}
          getKey={(curso) => curso.id}
          title={null}
          emptyMessage="Nenhuma recomendação no momento."
          // w-full min-w-0 no outer/viewport (bug desta tarefa, além do
          // lg:min-w-0 já aplicado no item de grid da coluna, em
          // page.tsx): garante que o Carousel NUNCA tente crescer além da
          // largura que o card já reservou pra ele, mesmo se o item de
          // grid pai algum dia perder essa proteção — o Embla mede a
          // largura real do viewport em runtime, então sem essas classes
          // um viewport sem largura própria definida poderia "herdar" a
          // largura somada dos slides em vez do espaço disponível.
          outerClassName="flex w-full min-w-0 flex-col"
          viewportClassName="w-full min-w-0 overflow-hidden"
          trackClassName="flex gap-4 px-2 py-2"
          itemClassName={`${ITEM_BASIS_CLASSES} min-w-0`}
          // hideHeader: as setas agora ficam na linha do título, lá em
          // cima — sem isso sobraria aqui uma linha vazia.
          hideHeader
          navControlsRef={carrosselNavRef}
          onPodeNavegarChange={setCarrosselPodeNavegar}
          renderItem={(curso) => <CourseCard curso={curso} hasAccess={false} onClickLocked={setModalCurso} />}
        />
      )}

      {linkDesbloquear ? (
        <a
          href={linkDesbloquear}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-primary/10 p-4 transition-colors hover:bg-primary/20"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-white">
            <MessageCircle size={16} className="text-primary" />
            Desbloqueie todo o catálogo
          </span>
          <ArrowRight size={18} className="shrink-0 text-primary" />
        </a>
      ) : (
        <span
          title="Número de suporte não configurado pelo admin"
          className="mt-4 flex cursor-not-allowed items-center justify-between gap-3 rounded-lg bg-primary/10 p-4 opacity-60"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-white">
            <MessageCircle size={16} className="text-primary" />
            Desbloqueie todo o catálogo
          </span>
          <ArrowRight size={18} className="shrink-0 text-primary" />
        </span>
      )}

      <AccessModal open={!!modalCurso} onClose={() => setModalCurso(null)} curso={modalCurso} numeroWhatsapp={numeroWhatsapp} />
    </div>
  );
}
