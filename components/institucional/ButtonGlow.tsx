'use client';

import { useEffect } from 'react';

/**
 * Faz a "luz" de qualquer botão `.btn-glow` (app/globals.css) seguir o
 * cursor (pedido explícito: "UM listener global... sem listener por
 * botão"). Monta UMA vez no layout raiz — encontra o botão sob o ponteiro
 * via `closest('.btn-glow')` a cada movimento, calcula a posição RELATIVA
 * ao próprio botão (getBoundingClientRect) e escreve `--mx`/`--my` nele via
 * `style.setProperty`, sempre dentro de um requestAnimationFrame (nunca
 * mais que 1 escrita por frame, mesmo que vários `pointermove` cheguem no
 * meio do caminho).
 *
 * `pointerover`/`pointerout` (não `pointerenter`/`pointerleave` — esses
 * não borbulham; um listener único no document nunca os receberia de
 * filhos aninhados dentro do botão) ligam/desligam `.is-tracking` (desliga
 * a transition de --mx/--my enquanto o cursor está em cima, pra luz não
 * "atrasar" atrás dele, ver CSS) e, só quando o ponteiro REALMENTE sai do
 * botão (checado via `relatedTarget` — trocar de filho DENTRO do mesmo
 * botão, ex. do padding pro texto, também dispara pointerout/pointerover,
 * mas `alvo.contains(relatedTarget)` filtra esse caso, evitando um
 * "pisca" da luz voltando ao canto padrão no meio do hover), removem o
 * `--mx`/`--my` inline — a luz volta suavemente (a transition normal volta
 * a valer fora do `.is-tracking`) pro canto padrão (85%/100%, os
 * `initial-value` do `@property`, CSS).
 *
 * Só `pointerType` "mouse"/"pen" (pedido explícito — em telas de toque, o
 * botão fica só no estado parado/`:active`, sem rastrear nada, CSS puro).
 *
 * `prefers-reduced-motion`: nem anexa os listeners (pedido explícito —
 * "sem o rastreamento do cursor") — a luz fica sempre no canto padrão, só
 * a opacidade muda via CSS puro (:hover/:focus-visible/:active).
 */
export default function ButtonGlow() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let quadroPendente: number | null = null;
    let ultimoEvento: PointerEvent | null = null;

    function aplicar() {
      quadroPendente = null;
      const e = ultimoEvento;
      if (!e) return;
      const alvo = (e.target as Element | null)?.closest<HTMLElement>('.btn-glow');
      if (!alvo) return;
      const rect = alvo.getBoundingClientRect();
      alvo.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      alvo.style.setProperty('--my', `${e.clientY - rect.top}px`);
    }

    function aoMover(e: PointerEvent) {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      ultimoEvento = e;
      if (quadroPendente === null) quadroPendente = requestAnimationFrame(aplicar);
    }

    function aoEntrar(e: PointerEvent) {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      const alvo = (e.target as Element | null)?.closest<HTMLElement>('.btn-glow');
      alvo?.classList.add('is-tracking');
    }

    function aoSair(e: PointerEvent) {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      const alvo = (e.target as Element | null)?.closest<HTMLElement>('.btn-glow');
      if (!alvo) return;
      const indoPara = e.relatedTarget as Node | null;
      if (indoPara && alvo.contains(indoPara)) return; // só trocou de filho DENTRO do mesmo botão
      alvo.classList.remove('is-tracking');
      alvo.style.removeProperty('--mx');
      alvo.style.removeProperty('--my');
    }

    document.addEventListener('pointermove', aoMover, { passive: true });
    document.addEventListener('pointerover', aoEntrar, { passive: true });
    document.addEventListener('pointerout', aoSair, { passive: true });
    return () => {
      document.removeEventListener('pointermove', aoMover);
      document.removeEventListener('pointerover', aoEntrar);
      document.removeEventListener('pointerout', aoSair);
      if (quadroPendente !== null) cancelAnimationFrame(quadroPendente);
    };
  }, []);

  return null;
}
