'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import CategoriaChipsMobile from '@/components/membros/CategoriaChipsMobile';

// Acima disso (em px de scroll do <main>), o header vira sólido e os chips
// colapsam; abaixo, volta ao estado do topo. Um threshold pequeno (não 0)
// evita o header "piscar" entre os dois estados bem na borda do topo.
const SCROLL_THRESHOLD = 20;

// Mesmo valor do Tailwind `gap-2` (0.5rem = 8px) usado abaixo, entre o logo
// "M" e o texto "Início" — extraído aqui como constante nomeada pra poder
// ser reaproveitado fora deste componente: VitrinePageClient usa esse
// mesmo número (HEADER_HEIGHT_PX + GAP_LOGO_TITULO_PX) no padding-top do
// card de destaque, pra manter o espaço entre a fileira de chips e o topo
// do card idêntico a este gap. Tailwind não permite gerar uma classe
// arbitrária (`pt-[Npx]`) a partir de um valor calculado em runtime — o
// compilador precisa ver a classe completa, como texto literal, no código
// fonte — então a "sincronização" aqui é: os dois lugares importam/leem o
// MESMO número (este arquivo é a fonte da verdade), não uma única classe
// CSS compartilhada. Se esse gap-2 mudar, atualize os dois.
export const GAP_LOGO_TITULO_PX = 8;

type GrupoCategoria = { nome: string; ordem: number; ids: string[] };

/**
 * Cabeçalho compacto da Home mobile (logo "M" + "Início" + fileira de chips
 * de categoria), com dois estados conforme o scroll do <main> (quem rola de
 * verdade — ver app/membros/layout.tsx — não `window`):
 *
 * - No topo (scrollY <= 20px): fundo transparente (deixa o hero por trás
 *   aparecer atrás do logo/"Início"), chips visíveis, sem borda.
 * - Rolado (scrollY > 20px): fundo sólido #000 (cobrindo a largura toda,
 *   inclusive atrás de onde os chips estavam, já que eles são filhos desse
 *   mesmo container — não precisa pintar a área deles à parte) com um brilho
 *   vermelho radial sutil grudado na direita (`at 100% 50%`) por cima — preto
 *   sólido primeiro, gradiente depois, então nada do conteúdo por trás
 *   aparece rolando. Chips escondidos via fade + colapso de altura (não só
 *   opacity, senão eles continuariam ocupando espaço), borda inferior sutil
 *   de 1px.
 *
 * O header em si é sempre `fixed` (fora do fluxo normal da página) — o
 * espaço reservado pra ele no conteúdo abaixo (pt-28, em VitrinePageClient)
 * é um valor FIXO, calculado pro estado "expandido" (pior caso de altura) e
 * nunca muda — é assim que se evita o conteúdo "pular" quando os chips
 * somem/voltam: ele já estava posicionado supondo o header no tamanho
 * máximo o tempo todo, então encolher o header só sobra espaço vazio, nunca
 * desloca nada.
 *
 * Scroll listener com throttle via requestAnimationFrame — no máximo 1
 * atualização de estado por frame, não recalcula a cada pixel.
 */
export default function HomeMobileHeader({
  categoriasAgrupadas,
  categoriaFiltro,
  onToggleGrupo,
}: {
  categoriasAgrupadas: GrupoCategoria[];
  categoriaFiltro: string[];
  onToggleGrupo: (ids: string[]) => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const tickingRef = useRef(false);

  useEffect(() => {
    const container = document.querySelector('main');
    if (!container) return;

    function medir() {
      setScrolled(container!.scrollTop > SCROLL_THRESHOLD);
      tickingRef.current = false;
    }
    function onScroll() {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(medir);
    }

    onScroll();
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 top-0 z-30 border-b transition-colors duration-[250ms] ease-out md:hidden ${
        scrolled ? 'border-white/[0.08]' : 'border-transparent bg-transparent'
      }`}
      // Preto sólido (background-color) por baixo do gradiente (background-image)
      // — mesma técnica do glow do login (LoginPageClient.tsx), inline porque é
      // um radial-gradient com percentuais que não valem a pena virar classe
      // Tailwind arbitrária. Só aplicado no estado "rolado": no topo a barra
      // continua transparente (bg-transparent via className acima).
      style={
        scrolled
          ? {
              backgroundColor: '#000',
              backgroundImage: 'radial-gradient(ellipse 60% 300% at 100% 50%, rgba(229, 9, 20, 0.35), transparent 75%)',
            }
          : undefined
      }
    >
      {/* gap-2 = GAP_LOGO_TITULO_PX (8px) acima — mantenha os dois em sincronia. */}
      <div className="flex items-center gap-2 px-4 py-3">
        <Image src="/imagens/logohome.png" alt="" width={32} height={32} className="h-7 w-auto object-contain" />
        <span className="text-base font-extrabold text-white">Início</span>
      </div>

      {/* max-h (não só opacity): colapsa a altura de verdade, não deixa o
          espaço reservado mesmo invisível. max-h-14 no estado aberto fica
          perto da altura real do conteúdo (chips ~44-48px) — um valor bem
          maior faria a transição de 250ms parecer terminar antes da hora
          (a caixa para de crescer quando o conteúdo acaba, mesmo que o
          max-height animado ainda não tenha chegado lá). */}
      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-[250ms] ease-out ${
          scrolled ? 'max-h-0 opacity-0' : 'max-h-14 opacity-100'
        }`}
      >
        <CategoriaChipsMobile
          categoriasAgrupadas={categoriasAgrupadas}
          categoriaFiltro={categoriaFiltro}
          onToggleGrupo={onToggleGrupo}
        />
      </div>
    </div>
  );
}
