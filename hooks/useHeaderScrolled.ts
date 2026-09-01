'use client';

import { useEffect, useRef, useState } from 'react';

// Acima disso (em px de scroll do <main>), o header considera "rolado";
// abaixo, volta ao estado do topo. Um threshold pequeno (não 0) evita o
// header "piscar" entre os dois estados bem na borda do topo.
const SCROLL_THRESHOLD = 20;

// Extraído do MobileHeader original (que já tinha essa lógica) pra ser
// reaproveitado também no DesktopHeader — os dois precisam saber "a página
// rolou?" pra alternar entre transparente (topo) e com fundo (rolado), só
// que com aparências finais diferentes (o mobile ainda soma um brilho
// vermelho radial; o desktop é só um preto semi-transparente liso — ver
// cada componente). Scroll listener com throttle via requestAnimationFrame
// — no máximo 1 atualização de estado por frame, não recalcula a cada
// pixel. Mede o scroll do `<main>` do layout (quem realmente rola, não
// `window` — a página inteira trava em h-screen/overflow-hidden, ver
// app/membros/layout.tsx).
export function useHeaderScrolled() {
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

  return scrolled;
}
