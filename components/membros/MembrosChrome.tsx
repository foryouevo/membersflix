'use client';

import { useState } from 'react';
import Header from '@/components/membros/Header';
import BottomNav from '@/components/membros/BottomNav';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types';

/**
 * Wrapper client-side só pra mediar Header, <main> e BottomNav —
 * app/membros/layout.tsx é Server Component (busca profile/config/
 * categorias/instrutores ali, com `await`), não pode ter useState; este
 * componente existe só pra guardar estado que precisa ser COMPARTILHADO
 * entre essas três árvores (Header é irmão de <main> e do BottomNav — um
 * não é ancestral do outro, não teriam como se comunicar sem um pai
 * client-side em comum):
 *
 * - `buscaMobileAberta`: abrir a barra de busca mobile (Header.tsx) precisa
 *   empurrar o padding-top de <main> pra baixo, pra ela não sobrepor os
 *   cards.
 * - `filtroModalAberto`: abrir o bottom sheet de filtro mobile (Header.tsx
 *   -> FiltroModal.tsx) precisa ESCONDER o BottomNav enquanto estiver
 *   aberto — bug relatado: mesmo com o z-index do bottom sheet mais alto
 *   que o do BottomNav, o menu flutuante continuava por cima, cobrindo o
 *   footer "Limpar filtros"/"Aplicar". Causa raiz (investigada): o `<div>`
 *   raiz do Header é `position: fixed` COM z-index próprio (z-30) — isso
 *   cria um stacking context isolado, e todo descendente dele (inclusive o
 *   FiltroModal, que vive dentro da árvore do Header) fica "preso" dentro
 *   desse contexto pra fins de comparação com elementos de FORA dele. O
 *   BottomNav é irmão do Header (não descendente), então na hora de
 *   comparar quem fica por cima, o navegador compara o Header INTEIRO
 *   (como uma unidade, no z-30 dele) contra o BottomNav (z-40) — o
 *   z-index alto do FiltroModal por dentro do Header não conta pra essa
 *   comparação externa, só valeria contra outros elementos DENTRO do
 *   próprio Header. Por isso só subir o z-index do FiltroModal nunca
 *   resolveria sozinho.
 *
 *   Essa propriedade (position:fixed + z-index no Header) não dá pra tirar
 *   sem prejuízo visual — é o que mantém o header colado no topo da tela
 *   durante o scroll, e sem z-index ele nem ficaria por cima do conteúdo da
 *   página. Daria pra contornar renderizando o FiltroModal via portal
 *   direto em document.body (escapando de vez do stacking context do
 *   Header), mas isso quebraria o posicionamento do dropdown ancorado ao
 *   ícone no desktop (hoje um `absolute` relativo ao próprio botão — um
 *   portal perderia essa referência de DOM, exigindo reimplementar a
 *   ancoragem via coordenadas medidas em JS). Sem esse ganho valer a
 *   complexidade/risco extra (o desktop nem usa o BottomNav — ele é
 *   `md:hidden` —, então nunca teve esse conflito), a solução aqui é a
 *   mais simples e direta: esconder o BottomNav enquanto o painel mobile
 *   estiver aberto, com uma transição suave (ver comentário em
 *   BottomNav.tsx), e devolvê-lo assim que fechar — por qualquer caminho
 *   (X, clique no overlay, ESC, "Aplicar"), já que todos passam pelo mesmo
 *   `onFiltroModalAbertoChange(false)` dentro do Header.
 */
export default function MembrosChrome({
  profile,
  numeroWhatsapp,
  categorias,
  instrutores,
  children,
}: {
  profile: Pick<Profile, 'nome' | 'avatar_url'> | null;
  numeroWhatsapp: string | null;
  categorias: { id: string; nome: string; ids: string[] }[];
  instrutores: string[];
  children: React.ReactNode;
}) {
  const [buscaMobileAberta, setBuscaMobileAberta] = useState(false);
  const [filtroModalAberto, setFiltroModalAberto] = useState(false);

  return (
    <>
      <Header
        profile={profile}
        numeroWhatsapp={numeroWhatsapp}
        categorias={categorias}
        instrutores={instrutores}
        buscaMobileAberta={buscaMobileAberta}
        onBuscaMobileAbertaChange={setBuscaMobileAberta}
        filtroModalAberto={filtroModalAberto}
        onFiltroModalAbertoChange={setFiltroModalAberto}
      />
      {/* pt-14/pb-24 no mobile: espaço pro header (h-14, 56px) e pra bottom
          nav flutuante (fixed) não cobrirem o conteúdo. pt-28 (14+14,
          112px) no lugar de pt-14 enquanto a barra de busca mobile está
          aberta (mais h-14/56px dela, ver Header.tsx) — empurra o
          conteúdo pra baixo dela em vez dela sobrepor os cards (item
          explícito do pedido). transition-[padding-top] com a mesma
          duração/easing da animação de abertura da barra (300ms/ease-out),
          pro empurrão parecer parte do mesmo movimento, não um salto seco.
          md:pt-20/md:pb-0: em telas md+ o bottom nav some e quem ocupa o
          topo é o Header em sua altura de desktop — nunca muda com a busca
          mobile (que não existe nessa largura, item 6 do pedido). */}
      <main
        className={cn(
          'h-full overflow-y-auto pb-24 transition-[padding-top] duration-300 ease-out md:pb-0 md:pt-20',
          buscaMobileAberta ? 'pt-28' : 'pt-14'
        )}
      >
        {children}
      </main>
      {/* BottomNav (antes renderizado direto em app/membros/layout.tsx,
          fora deste componente) — precisou vir pra cá pra poder receber
          `oculto` (ver comentário do componente, acima: some enquanto o
          bottom sheet de filtro mobile está aberto). Continua recebendo
          `numeroWhatsapp` normalmente; `oculto` some com o menu via
          transição própria (BottomNav.tsx), não via `hidden`/desmonte —
          ele nunca sai do DOM, só fica invisível/sem clique, então volta
          sozinho (mesma transição, ao contrário) assim que
          filtroModalAberto virar false de novo, por qualquer caminho de
          fechamento. A busca mobile (buscaMobileAberta) NÃO esconde o
          BottomNav: ela abre no topo da tela (colada no header), sem
          sobreposição nenhuma com o menu, que fica na base — não tem o
          mesmo conflito (item 2 do pedido, condicional: "se ela também
          cobrir ou for coberta" — aqui não cobre). */}
      <BottomNav numeroWhatsapp={numeroWhatsapp} oculto={filtroModalAberto} />
    </>
  );
}
