'use client';

import { useEffect, useRef } from 'react';

// Ajustes do efeito (valores do pedido explícito desta tarefa). scale
// 0.92→0.97 (era 0.9 antes disso): "reduza a perda de tamanho causada
// pelo efeito... pra imagem parecer grande mesmo inclinada" — com a
// imagem agora ocupando até 95% do card (era ~65%), um scale inicial
// menor ficava exagerado demais. rotateX desktop mantido em 25 (dentro do
// range pedido, 20-25). Mobile recebe uma inclinação/escala mais
// discretas (nunca corta a imagem numa tela estreita, onde o container já
// é quase do tamanho da própria imagem).
const ROTATE_INICIAL_DESKTOP = 25;
const ROTATE_INICIAL_MOBILE = 12;
const SCALE_INICIAL_DESKTOP = 0.97;
const SCALE_INICIAL_MOBILE = 0.97;
const TRANSLATE_Y_INICIAL = 40;
// 768 (era 640/sm) — MESMO breakpoint em que o header vira hambúrguer
// (LandingHeader.tsx usa `md:` = 768 pra alternar entre o menu desktop e
// o mobile), pedido explícito desta tarefa: "use o mesmo breakpoint em
// que o menu vira hambúrguer". Unificado com a troca de imagem abaixo
// (mesma imagem mobile = mesmos valores de inclinação mobile, sem um
// meio-termo estranho entre 640 e 768px onde a imagem já seria a desktop
// mas a inclinação ainda seria a mobile, ou vice-versa).
const BREAKPOINT_MOBILE = 768;
const PROGRESSO_ALTURA_JANELA = 0.6; // progresso 1 depois de rolar ~60% da altura da tela

function lerp(inicio: number, fim: number, progresso: number) {
  return inicio + (fim - inicio) * progresso;
}

/**
 * Mockup da tela inicial da plataforma, com um efeito de scroll: nasce
 * inclinado em 3D (visível já no carregamento) e vai "endireitando"
 * conforme a página rola. Renderizado DENTRO do card do hero (ver
 * HeroSection.tsx, que controla max-width/margem/borda inferior — este
 * componente só cuida do efeito e do frame do mockup em si, sem outer
 * padding/max-w próprio, pra caber em qualquer contexto que o chamador
 * definir).
 *
 * Duas imagens diferentes (pedido explícito desta tarefa): abaixo de
 * 768px (BREAKPOINT_MOBILE, ver comentário acima) usa
 * imagemPlataformaMobile.png (346x564, vertical — mockup de tela de
 * celular); a partir daí, imagemPlataformaHero.png (1903x944,
 * horizontal). <picture> + <source media> (não next/image nem
 * useEffect/matchMedia) — pedido explícito: o NAVEGADOR decide sozinho
 * qual baixar ANTES de qualquer JS rodar, então só 1 das duas imagens é
 * baixada e não existe "piscada" trocando de uma pra outra depois da
 * hidratação, que é exatamente o problema que useEffect+state teria (o
 * server não sabe a largura da tela do cliente, então sempre renderizaria
 * um chute inicial que podia estar errado no primeiro paint).
 * `aspect-[346/564] md:aspect-[1903/944]` no wrapper: reserva o formato
 * CORRETO da imagem em cada breakpoint via CSS puro, mesmo antes dela
 * carregar — sem isso, um <img> só com um width/height fixo (que só pode
 * descrever UMA das duas proporções) causaria um salto de layout (CLS) na
 * troca de 768px, já que as duas imagens têm proporções bem diferentes
 * (retrato vs. paisagem).
 *
 * Sem framer-motion (não está no package.json — pedido explícito: "não
 * instale nada novo só para isso"): scroll listener passivo +
 * requestAnimationFrame, escrevendo o transform DIRETO no elemento via ref
 * (sem setState a cada frame — evitaria um re-render inteiro do componente
 * 60x/s só pra mudar um `style`).
 *
 * Progresso = scrollY / (60% da altura da janela) — pedido explícito desta
 * tarefa (era baseado na posição do container relativo à viewport, ver
 * histórico): 0 sempre em scrollY=0 (a imagem SEMPRE nasce inclinada no
 * carregamento) e 1 depois de rolar uma distância fixa relativa à altura
 * da tela, independente de onde o card fisicamente está no documento.
 *
 * `prefers-reduced-motion`: aplica o estado FINAL (reto, sem inclinação) e
 * nunca liga o listener de scroll (pedido explícito).
 */
export default function ImagemPlataformaSection() {
  const wrapperRef = useRef<HTMLDivElement>(null); // recebe a perspective
  const imgBoxRef = useRef<HTMLDivElement>(null); // recebe o transform (rotateX/scale/translateY)

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const imgBox = imgBoxRef.current;
    if (!wrapper || !imgBox) return;

    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduzido) {
      imgBox.style.transform = 'none';
      return;
    }

    let ticking = false;

    function aplicar() {
      ticking = false;
      if (!imgBox) return;

      const mobile = window.innerWidth < BREAKPOINT_MOBILE;
      const rotateInicial = mobile ? ROTATE_INICIAL_MOBILE : ROTATE_INICIAL_DESKTOP;
      const scaleInicial = mobile ? SCALE_INICIAL_MOBILE : SCALE_INICIAL_DESKTOP;

      const alvo = window.innerHeight * PROGRESSO_ALTURA_JANELA;
      let progresso = alvo > 0 ? window.scrollY / alvo : 1;
      progresso = Math.min(1, Math.max(0, progresso));

      const rotateX = lerp(rotateInicial, 0, progresso);
      const scale = lerp(scaleInicial, 1, progresso);
      const translateY = lerp(TRANSLATE_Y_INICIAL, 0, progresso);

      imgBox.style.transform = `translateY(${translateY}px) scale(${scale}) rotateX(${rotateX}deg)`;
    }

    function aoRolar() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(aplicar);
    }

    aplicar(); // estado inicial correto mesmo sem ter rolado ainda
    window.addEventListener('scroll', aoRolar, { passive: true });
    window.addEventListener('resize', aoRolar, { passive: true });
    return () => {
      window.removeEventListener('scroll', aoRolar);
      window.removeEventListener('resize', aoRolar);
    };
  }, []);

  return (
    // Largura do wrapper — pedido explícito desta tarefa: no mobile
    // (imagem VERTICAL, tipo tela de celular) centralizada, ocupando 93%
    // da largura do pai (era w-[78%] — o pedido aqui foi só aumentar essa
    // largura, mantendo max-w-[420px] como teto de segurança pra telas
    // "mobile" mais largas, perto de 768px, não deixar a imagem esticar
    // demais). mx-auto centraliza (o wrapper pai já é flex-col
    // items-center, mas mx-auto garante a centralização mesmo se essa div
    // um dia deixar de estar dentro de um flex). A partir de md (imagem
    // HORIZONTAL), INALTERADO (w-full max-w-[1450px], mesmo valor de
    // sempre — pedido explícito: "não altere nada no desktop/tablet").
    // perspective no PAI (não no próprio elemento que gira) — sem isso a
    // rotação em X não teria profundidade 3D nenhuma, só achataria a
    // imagem verticalmente. overflow-visible aqui (o corte de verdade é
    // feito pelo CARD em volta, em HeroSection.tsx — dobrar
    // overflow-hidden aqui além do card cortaria a inclinação 3D de forma
    // estranha nas laterais quando o scale/rotate ainda não chegou no
    // estado final).
    <div ref={wrapperRef} className="mx-auto w-[93%] max-w-[420px] md:w-full md:max-w-[1450px]" style={{ perspective: '1200px' }}>
      {/* rounded-t apenas (sem rounded-b/border-b) — a base "encosta" na
          borda inferior do card (pedido explícito) e é o PRÓPRIO card (com
          seu overflow-hidden + cantos arredondados embaixo) quem corta o
          excesso do canto reto da imagem contra a curva do card, não este
          componente. aspect-[] explícito (ver comentário do componente,
          acima) — reserva o formato certo ANTES da imagem carregar, nos
          dois breakpoints. */}
      <div
        ref={imgBoxRef}
        className="relative aspect-[346/564] overflow-hidden rounded-t-xl border border-b-0 border-black/10 shadow-2xl dark:border-white/10 sm:rounded-t-2xl md:aspect-[1903/944]"
        style={{ transformOrigin: 'center top', willChange: 'transform' }}
      >
        {/* <picture> (não next/image nem useEffect) — ver comentário do
            componente acima pra causa raiz de por que essa é a técnica
            certa aqui: o navegador escolhe UMA fonte ANTES de baixar
            qualquer coisa, sem piscada/dupla-requisição. width/height do
            <img> = dimensões REAIS do arquivo mobile (o `src` padrão,
            usado quando nenhum <source> casa) — só um hint de intrinsic
            size pro navegador; o aspect-ratio explícito no wrapper acima
            é quem manda de verdade na hora de reservar o espaço. */}
        <picture>
          <source media="(min-width: 768px)" srcSet="/imagens/imagemPlataformaHero.png" />
          <img
            src="/imagens/imagemPlataformaMobile.png"
            width={346}
            height={564}
            alt="Tela inicial da plataforma MembersFlix"
            decoding="async"
            className="block h-full w-full object-cover"
          />
        </picture>
      </div>
    </div>
  );
}
