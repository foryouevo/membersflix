'use client';

import { useState } from 'react';
import { Sparkles, ArrowRight, MessageCircle } from 'lucide-react';
import Carousel from '@/components/membros/Carousel';
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
 */
export default function CursosRecomendados({ cursos, numeroWhatsapp }: { cursos: Curso[]; numeroWhatsapp: string | null }) {
  const [modalCurso, setModalCurso] = useState<Curso | null>(null);
  const linkDesbloquear = numeroWhatsapp
    ? buildSupportWhatsappLink(numeroWhatsapp, 'Olá, quero desbloquear todo o catálogo de cursos.')
    : null;

  return (
    <div className="rounded-lg bg-card p-6">
      <div className="mb-4 flex items-center gap-2 text-white">
        <Sparkles size={18} className="text-primary" />
        <h2 className="font-semibold">Cursos Recomendados</h2>
      </div>

      {cursos.length === 0 ? (
        <p className="text-sm text-on-variant">Nenhuma recomendação no momento.</p>
      ) : (
        <Carousel
          items={cursos}
          getKey={(curso) => curso.id}
          title={null}
          prevLabel="Recomendados: anteriores"
          nextLabel="Recomendados: próximos"
          emptyMessage="Nenhuma recomendação no momento."
          outerClassName="flex flex-col"
          // justify-end: o título já está no cabeçalho PRÓPRIO deste card,
          // acima — aqui o <h2> fica vazio (title={null}), então só as
          // setas aparecem, alinhadas à direita.
          headerClassName="mb-3 flex shrink-0 items-center justify-end gap-1.5"
          viewportClassName="overflow-hidden"
          trackClassName="flex gap-4 px-2 py-2"
          itemClassName={`${ITEM_BASIS_CLASSES} min-w-0`}
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
