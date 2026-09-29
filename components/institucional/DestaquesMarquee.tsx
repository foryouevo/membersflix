'use client';

import { BookOpen, PlayCircle, Infinity as InfinityIcon, Clock, TrendingUp, type LucideIcon } from 'lucide-react';

// Frases da faixa — pedido explícito: "use exatamente estas... não invente
// outras informações sobre a plataforma" (baseadas no que já aparece na
// própria tela da plataforma, ver imagemPlataformaHero.png). PRA EDITAR:
// mexa só neste array — cada item vira "{antes}{destaque}" na faixa,
// {antes} no cinza secundário normal e {destaque} em negrito branco
// (inclusive a pontuação final, quando ela pertence ao trecho em
// destaque — reflete exatamente a formatação pedida, ex.: "Acesse **+99
// cursos** em um só lugar." → antes="Acesse ", destaque="+99 cursos",
// depois=" em um só lugar.").
const FRASES: { Icone: LucideIcon; antes: string; destaque: string; depois: string }[] = [
  { Icone: BookOpen, antes: 'Acesse ', destaque: '+99 cursos', depois: ' em um só lugar.' },
  { Icone: PlayCircle, antes: '', destaque: '+1000 aulas', depois: ' organizadas por módulo.' },
  { Icone: InfinityIcon, antes: '', destaque: 'Acesso vitalício', depois: ' ao conteúdo.' },
  { Icone: Clock, antes: 'Assista ', destaque: 'no seu ritmo', depois: ', de onde estiver.' },
  { Icone: TrendingUp, antes: 'Aprenda ', destaque: 'do básico ao avançado.', depois: '' },
];

function Item({ Icone, antes, destaque, depois }: (typeof FRASES)[number]) {
  return (
    // gap-2 aqui é só entre o ÍCONE e o texto (os 2 únicos filhos deste
    // flex) — causa raiz de um bug relatado nesta tarefa: antes, "antes"/
    // "destaque"/"depois" eram TRÊS filhos separados do MESMO flex com
    // gap, então o gap também entrava ENTRE eles (espaço duplicado antes
    // do negrito, espaço solto antes da vírgula em "..., de onde
    // estiver."). Agora o texto inteiro (antes + destaque + depois) é UM
    // ÚNICO span de texto corrido — sem flex nem gap por dentro — então
    // fica exatamente com os espaços/pontuação que estão nos dados
    // (FRASES, acima), sem nenhum espaço extra vindo do layout.
    <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 md:text-base">
      <Icone className="h-[18px] w-[18px] shrink-0 text-primary md:h-5 md:w-5" strokeWidth={1.75} aria-hidden="true" />
      <span>
        {antes}
        <strong className="font-semibold text-gray-900 dark:text-white">{destaque}</strong>
        {depois}
      </span>
    </span>
  );
}

/**
 * Faixa fina de destaques "passando" (marquee infinito) logo abaixo do
 * card do hero — substitui o placeholder genérico anterior ("Seção de
 * palavras (swiper)", ver LandingPageClient.tsx, que agora renderiza ESTE
 * componente especificamente pro id 'palavras').
 *
 * Marquee em CSS puro (pedido explícito — "sem lib nova"; Swiper NÃO está
 * no package.json, então nem cogitado): a faixa interna (`track`) contém a
 * lista de frases DUAS vezes seguidas (a 2ª com aria-hidden, invisível pra
 * leitor de tela) lado a lado, e uma animação `@keyframes marquee`
 * (definida em app/globals.css) desloca ela de `translateX(0)` até
 * `translateX(-50%)` — exatamente a largura de UMA cópia da lista — então
 * quando o loop reinicia (`0%` de novo), a 2ª cópia já está posicionada
 * EXATAMENTE onde a 1ª começou, sem nenhum "pulo" visível.
 *
 * `hover:[animation-play-state:paused]`: pausa ao passar o mouse (desktop,
 * pedido explícito). `motion-reduce:` (variant nativo do Tailwind, sem
 * config extra): desliga a animação e ESCONDE a 2ª cópia (senão o mesmo
 * texto apareceria duplicado, parado, pra quem pediu menos movimento) —
 * o restante vira um bloco estático, quebrando em linhas centralizadas
 * (`motion-reduce:flex-wrap motion-reduce:justify-center`).
 *
 * `mask-image` (+ `-webkit-` pra Safari): funde as pontas esquerda/direita
 * da faixa com transparência, pros itens "nascerem"/"sumirem" suavemente
 * nas bordas em vez de cortar em seco.
 */
export default function DestaquesMarquee() {
  return (
    // aria-label já está no <section> pai (LandingPageClient.tsx) — não
    // duplica aqui, senão dois landmarks "region" ficariam empilhados com
    // o MESMO nome. SEM bg/border/rounded/shadow (pedido explícito desta
    // tarefa: "a faixa deve ficar totalmente transparente... mostrando
    // apenas as frases passando sobre o fundo da página") — o
    // mask-image continua (não é um "fundo", só recorta a opacidade nas
    // pontas; funciona igual sobre um container transparente).
    <div
      className="relative overflow-hidden py-3 md:py-4"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
      }}
    >
      {/* w-max: a faixa some do tamanho do CONTEÚDO (as 2 cópias lado a
          lado), não do container — precisa ser mais larga que a tela pra
          "passar" de verdade. 25s mobile / 35s desktop (pedido explícito:
          "um pouco mais rápido no mobile, ~25s... 30-40s no desktop"). */}
      <div
        className="flex w-max animate-[marquee_25s_linear_infinite] items-center gap-10 whitespace-nowrap will-change-transform hover:[animation-play-state:paused] motion-reduce:w-full motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:justify-center md:gap-16 md:[animation-duration:35s]"
      >
        <div className="flex shrink-0 items-center gap-10 md:gap-16">
          {FRASES.map((f, i) => (
            <Item key={i} {...f} />
          ))}
        </div>
        {/* 2ª cópia — aria-hidden (pedido explícito) + motion-reduce:hidden
            (some no fallback estático, ver comentário do componente
            acima, pra não duplicar visualmente o mesmo texto parado). */}
        <div aria-hidden="true" className="flex shrink-0 items-center gap-10 motion-reduce:hidden md:gap-16">
          {FRASES.map((f, i) => (
            <Item key={i} {...f} />
          ))}
        </div>
      </div>
    </div>
  );
}
