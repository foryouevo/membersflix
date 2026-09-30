'use client';

import { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

// Margem de largura (px) que um resize precisa cruzar antes de disparar um
// `AOS.refreshHard()` — pedido explícito: "quando a largura da janela mudar
// de forma RELEVANTE (resize com debounce)". Sem isso, rotacionar um
// celular por 1-2px de diferença de barra de endereço recalcularia a
// posição de TODOS os elementos [data-aos] à toa; só uma mudança de largura
// que realmente pode cruzar um breakpoint (>= 50px) justifica o refresh.
const LARGURA_MINIMA_PARA_REFRESH = 50;
const DEBOUNCE_RESIZE_MS = 200;

/**
 * Inicializa o AOS (https://michalsnik.github.io/aos/) pro site inteiro —
 * pedido explícito desta tarefa: "componente client, use no layout raiz".
 * Só chama `AOS.init()` (e os dois `refreshHard()` de segurança, abaixo);
 * NENHUM elemento é renderizado por este componente (retorna null) — quem
 * decide ONDE animar é cada seção, via atributo `data-aos` no próprio JSX
 * (CursosSection.tsx, PlanosSection.tsx, FaqSection.tsx, etc.).
 *
 * `disable`: função (não boolean fixo) que o PRÓPRIO AOS reavalia — sempre
 * que `prefers-reduced-motion: reduce` estiver ativo, ele desliga a
 * biblioteca inteira (nenhum elemento [data-aos] anima, todos nascem no
 * estado final via CSS do próprio AOS quando desabilitado).
 *
 * `AOS.refreshHard()` (recalcula as posições de TODOS os elementos
 * [data-aos] do zero, reconsultando o DOM) — chamado em dois momentos
 * (pedido explícito): no evento `window.load` (fontes/imagens terminam de
 * carregar DEPOIS do primeiro render e podem empurrar elementos pra baixo,
 * mudando a posição em que cada um deveria disparar) e num resize
 * "relevante" (debounce de 200ms + só se a largura mudou pelo menos
 * LARGURA_MINIMA_PARA_REFRESH — nunca a cada pixel).
 */
export default function AosProvider() {
  useEffect(() => {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: true,
      offset: 80,
      disable: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    });

    function aoCarregarPagina() {
      AOS.refreshHard();
    }
    window.addEventListener('load', aoCarregarPagina);

    let larguraAnterior = window.innerWidth;
    let temporizador: ReturnType<typeof setTimeout>;
    function aoRedimensionar() {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        const larguraAtual = window.innerWidth;
        if (Math.abs(larguraAtual - larguraAnterior) >= LARGURA_MINIMA_PARA_REFRESH) {
          larguraAnterior = larguraAtual;
          AOS.refreshHard();
        }
      }, DEBOUNCE_RESIZE_MS);
    }
    window.addEventListener('resize', aoRedimensionar, { passive: true });

    return () => {
      window.removeEventListener('load', aoCarregarPagina);
      window.removeEventListener('resize', aoRedimensionar);
      clearTimeout(temporizador);
    };
  }, []);

  return null;
}
