'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Code, Brain, Megaphone, Video, Languages, Plane, TrendingUp, ShoppingCart, Infinity as InfinityIcon, type LucideIcon } from 'lucide-react';
import { cn, scrollSuaveParaSecao } from '@/lib/utils';
import Container from '@/components/institucional/Container';
import SectionHeader from '@/components/institucional/SectionHeader';
import { BOTAO_PRIMARIO_TAMANHO } from '@/components/institucional/CtaButtons';

// Tópicos — pedido explícito: "array constante... com comentário dizendo
// que o texto e o visual de cada item podem ser editados aqui". A ordem
// deste array é a MESMA ordem dos 4 cartões visuais na coluna direita
// (índice 0 = 1º cartão, etc. — ver VISUAIS mais abaixo) e do fallback
// empilhado no mobile/tablet. Editar título/descrição: só aqui. Trocar o
// VISUAL de um item: editar o array VISUAIS, mais abaixo (mesma posição).
const TOPICOS = [
  { titulo: 'Cursos gravados, em um só lugar', descricao: 'Acesse +99 cursos gravados, em 13 nichos, sem precisar procurar em vários lugares.' },
  { titulo: 'Aulas organizadas por módulo', descricao: '+1000 aulas organizadas por módulo, do básico ao avançado.' },
  { titulo: 'Acesso vitalício ao conteúdo', descricao: 'Estude sem prazo para terminar e volte ao conteúdo sempre que quiser.' },
  { titulo: 'Estude de onde estiver', descricao: 'Assista no seu ritmo, no computador ou no celular.' },
] as const;

const BREAKPOINT_LG = 1024;

// Margem entre a base do header fixo e o topo do card no MOMENTO da
// ativação (pedido explícito desta tarefa — era uma "linha de disparo" a
// 45% da altura da viewport, sem relação nenhuma com o header). Constante
// nomeada (não um número solto no meio da fórmula) porque o MESMO valor
// entra tanto no `top` do sticky (JSX, mais abaixo) quanto no cálculo da
// linha de disparo em JS (useEffect de medição, dentro do componente) — os
// dois PRECISAM usar exatamente o mesmo número, ou a coluna trava num
// instante e a troca/progresso do tópico 1 dispara em outro.
const MARGEM_ATIVACAO_PX = 12;

/* ------------------------------------------------------------------ *
 * Moldura compartilhada dos 4 cartões visuais — borda fina, cantos
 * arredondados, superfície e o brilho vermelho suave na base (comum aos
 * 4, pedido explícito: "estilo comum"). overflow-hidden AQUI é seguro
 * (não quebra o sticky da coluna esquerda — isso só aconteceria se um
 * ANCESTRAL da coluna esquerda tivesse overflow não-visível; este
 * cartão fica na coluna DIREITA, sem nenhuma relação de ancestralidade
 * com a esquerda).
 * ------------------------------------------------------------------ */
function MolduraCartao({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-black/10 bg-gray-50 dark:border-white/10 dark:bg-white/[0.03]', className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,rgba(229,9,20,0.14),transparent_70%)] dark:bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,rgba(229,9,20,0.22),transparent_70%)]"
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}

// Cartão 1 "Cursos" — grade 4x3 de "peças" com ícones dos nichos (lucide,
// genéricos — NENHUM dado da plataforma inventado, só ilustrativo), peça
// central maior com o favicon da marca (logohome.png) e brilho vermelho;
// peças de canto mais apagadas (pedido explícito).
const ICONES_NICHOS: LucideIcon[] = [Code, Brain, Megaphone, Video, Languages, Plane, TrendingUp, ShoppingCart];
const CELULA_CENTRAL = 5;
const CELULAS_CANTO = [0, 3, 8, 11];

function CardCursos() {
  return (
    <div className="grid h-full grid-cols-4 grid-rows-3 gap-2 p-5 sm:gap-2.5 sm:p-7 lg:gap-3 lg:p-8">
      {Array.from({ length: 12 }, (_, i) => i).map((i) => {
        if (i === CELULA_CENTRAL) {
          return (
            <div
              key={i}
              className="relative flex items-center justify-center rounded-lg border border-primary/30 bg-primary/10 shadow-[0_0_28px_-6px_rgba(229,9,20,0.55)] lg:rounded-xl"
            >
              <Image src="/imagens/logohome.png" alt="" width={40} height={40} className="h-6 w-6 object-contain sm:h-7 sm:w-7 lg:h-9 lg:w-9" />
            </div>
          );
        }
        const Icone = ICONES_NICHOS[i % ICONES_NICHOS.length];
        return (
          <div
            key={i}
            className={cn(
              'flex items-center justify-center rounded-lg border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5 lg:rounded-xl',
              CELULAS_CANTO.includes(i) && 'opacity-40'
            )}
          >
            <Icone className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 sm:h-4 sm:w-4 lg:h-5 lg:w-5" strokeWidth={1.5} aria-hidden="true" />
          </div>
        );
      })}
    </div>
  );
}

// Cartão 2 "Módulos" — lista de blocos com "esqueleto" de linhas +
// barra de progresso em vermelho (rótulos genéricos "Módulo N", pedido
// explícito: "sem textos inventados... nada de nomes de cursos").
const MODULOS_PROGRESSO = [100, 72, 38, 10];

function CardModulos() {
  return (
    <div className="flex h-full flex-col justify-center gap-2.5 p-5 sm:gap-3 sm:p-7 lg:gap-4 lg:p-8">
      {MODULOS_PROGRESSO.map((pct, i) => (
        <div key={i} className="rounded-lg border border-black/10 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5 sm:p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 sm:text-sm">Módulo {i + 1}</span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs">{pct}%</span>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <div className="h-1.5 w-3/4 rounded-full bg-black/5 dark:bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Cartão 3 "Vitalício" — símbolo de infinito central + anéis
// concêntricos (SVG) com rotação lenta e sutil (desliga com
// prefers-reduced-motion, ver `reduzido`).
function CardVitalicio({ reduzido }: { reduzido: boolean }) {
  return (
    <div className="relative flex h-full items-center justify-center">
      <svg
        viewBox="0 0 200 200"
        className={cn('h-32 w-32 text-primary/25 sm:h-40 sm:w-40 lg:h-52 lg:w-52', !reduzido && 'animate-[girar-lento_18s_linear_infinite]')}
        aria-hidden="true"
      >
        <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 7" />
        <circle cx="100" cy="100" r="72" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1 6" />
        <circle cx="8" cy="100" r="2" fill="currentColor" />
        <circle cx="192" cy="100" r="2" fill="currentColor" />
        <circle cx="100" cy="8" r="1.5" fill="currentColor" />
      </svg>
      <div className="absolute flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10 shadow-[0_0_36px_-8px_rgba(229,9,20,0.55)] sm:h-20 sm:w-20 lg:h-24 lg:w-24">
        <InfinityIcon className="h-7 w-7 text-primary sm:h-9 sm:w-9 lg:h-11 lg:w-11" strokeWidth={1.75} aria-hidden="true" />
      </div>
    </div>
  );
}

// Cartão 4 "Dispositivos" — mockup de notebook (imagemPlataformaHero.png)
// com um mockup de celular (imagemPlataformaMobile.png) sobreposto à
// direita, molduras simples em CSS. alt="" nos dois (decorativo — a MESMA
// imagem já tem alt descritivo no hero/seção da plataforma logo acima na
// página; repetir o texto aqui só duplicaria anúncio pra leitor de tela
// sem informação nova, o título/descrição do tópico já cobre o
// conteúdo).
function CardDispositivos() {
  return (
    <div className="relative flex h-full items-center justify-center px-6 sm:px-10">
      <div className="relative w-[74%] max-w-[420px]">
        <div className="overflow-hidden rounded-t-md border border-black/10 bg-black p-1 dark:border-white/10">
          <div className="relative aspect-[16/10] overflow-hidden rounded-sm">
            <Image src="/imagens/imagemPlataformaHero.png" alt="" fill sizes="420px" className="object-cover" />
          </div>
        </div>
        <div className="h-2 rounded-b-lg border border-t-0 border-black/10 bg-gray-200 dark:border-white/10 dark:bg-white/10" />
      </div>
      <div className="absolute bottom-3 right-2 w-[24%] max-w-[100px] sm:right-6">
        <div className="overflow-hidden rounded-[1.1rem] border-4 border-black bg-black shadow-xl dark:border-white/20">
          <div className="relative aspect-[9/16] overflow-hidden rounded-[0.85rem]">
            <Image src="/imagens/imagemPlataformaMobile.png" alt="" fill sizes="100px" className="object-cover" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Ordem = MESMA ordem de TOPICOS (índice a índice) — trocar o visual de
// um item específico é só reordenar/trocar aqui.
const VISUAIS: ((props: { reduzido: boolean }) => React.ReactElement)[] = [
  () => <CardCursos />,
  () => <CardModulos />,
  ({ reduzido }) => <CardVitalicio reduzido={reduzido} />,
  () => <CardDispositivos />,
];

/**
 * Botão único "Ver cursos": âncora pra #cursos (MESMO id que o item
 * "Cursos" do menu, LandingHeader.tsx, já usa), rolando suave via
 * `scrollSuaveParaSecao` (lib/utils.ts — MESMO mecanismo do menu, não um
 * novo).
 *
 * Usa BOTAO_PRIMARIO_TAMANHO (CtaButtons.tsx) — pedido explícito de uma
 * tarefa posterior: "mesmo formato e tamanho de TODOS os botões do site"
 * (mesma altura/padding/font-size/font-weight/radius do "Saiba mais" da
 * seção de números e do "Criar minha conta grátis"), depois de uma tarefa
 * anterior ter corrigido só o STRETCH usando `.btn-primary` puro — o que
 * resolveu a largura, mas raspou o botão de volta pro tamanho MENOR de
 * `.btn-primary` sozinho (sem o `md:py-3 md:text-base` que os outros
 * botões primários têm a partir de md). BOTAO_PRIMARIO_TAMANHO é
 * exatamente BOTAO_PRIMARIO_CLASSES SEM as classes de largura/max-width —
 * dá o tamanho certo sem reintroduzir o stretch.
 *
 * `self-start` continua aqui (ainda precisa): o pai deste botão (a coluna
 * "sticky flex flex-col", mais abaixo) tem `align-items: stretch` por
 * padrão (nenhum `items-start`/`items-center` nele) — QUALQUER filho
 * direto dele com largura `auto` (BOTAO_PRIMARIO_TAMANHO não define
 * `width` nenhum) estica pra ocupar 100% da coluna sem isso. `w-fit`:
 * redundância explícita (mesmo resultado do `inline-flex` sozinho, já
 * presente em BOTAO_PRIMARIO_TAMANHO).
 *
 * Renderizado em DUAS posições (ver o componente principal, abaixo): fim da
 * coluna esquerda no desktop, logo abaixo do texto de apoio no mobile/
 * tablet — nunca as duas ao mesmo tempo, porque cada posição vive dentro de
 * um bloco `hidden lg:grid`/`lg:hidden` mutuamente exclusivo (um deles
 * sempre tem `display: none`), não uma questão de esconder visualmente só.
 * Alinhado à esquerda nas duas (o pai mobile não é flex, então não há
 * stretch pra neutralizar lá — `self-start` não atrapalha nesse caso,
 * simplesmente não faz nada).
 */
function BotaoVerCursos({ className }: { className?: string }) {
  return (
    <Link
      href="#cursos"
      onClick={(e) => {
        e.preventDefault();
        scrollSuaveParaSecao('cursos');
      }}
      className={cn(BOTAO_PRIMARIO_TAMANHO, 'w-fit shrink-0 self-start whitespace-nowrap', className)}
    >
      Ver cursos
    </Link>
  );
}

/**
 * Seção "Plataforma" (id="plataforma") — efeito de "coluna fixa" (scroll
 * com sticky): a coluna esquerda (cabeçalho + acordeão de tópicos + botão)
 * fica parada (position: sticky) enquanto a coluna direita (pilha de 4
 * cartões visuais) rola por trás dela; o tópico correspondente ao cartão
 * mais próximo da "linha de disparo" abre sozinho, com uma barra de
 * progresso preenchendo conforme aquele cartão passa pela linha. Estrutura/
 * mecânica inspirada numa referência visual — cores, fonte, ícones e textos
 * são só os do projeto.
 *
 * Linha de disparo (pedido explícito desta tarefa — ERA fixa a 45% da
 * altura da viewport, sem relação com o header; agora é ancorada no
 * header): fica exatamente na altura em que a coluna esquerda gruda
 * (sticky) — headerH + MARGEM_ATIVACAO_PX + o padding-top REAL do card (ver
 * o useEffect de medição, dentro do componente). Como o padding-top do card empurra
 * IGUALMENTE a coluna esquerda e a pilha de cartões da direita pra baixo
 * (mesma linha de grade, `items-start`), o cartão 1 nasce exatamente nessa
 * linha no instante da ativação — não precisa de nenhum ajuste extra pra
 * "cartão 1 ativo, progresso 0" logo ali: é uma consequência direta da
 * geometria (mesmo padding-top em cima dos dois lados da grade).
 *
 * position: sticky quebra se QUALQUER ancestral da coluna esquerda tiver
 * overflow não-visível — por isso o card externo (com cantos
 * arredondados) usa `overflow-clip` (recorta os cantos SEM criar um novo
 * contexto de "scroll container" — `overflow-hidden` quebraria o sticky
 * aqui) em vez de `overflow-hidden`, e nenhum wrapper entre o card e a
 * coluna esquerda define overflow nenhum.
 *
 * Sem framer-motion (não está no package.json) e sem IntersectionObserver
 * pro índice ativo (a linha de disparo, não a entrada/saída de cada cartão
 * em si, precisa da posição EXATA de cada cartão a cada frame — mais
 * direto medir via getBoundingClientRect num loop de rAF do que orquestrar
 * vários observers): 1 listener de scroll passivo + requestAnimationFrame,
 * lendo `getBoundingClientRect` uma vez
 * por frame. O ÍNDICE ativo vira estado React (só muda quando realmente
 * troca de tópico — poucas vezes por scroll); o PROGRESSO da barra é
 * escrito direto no DOM via ref (nunca vira estado — evitaria um
 * re-render a cada frame só pra mudar um `width`).
 */
// `destinoLogado` saiu dos props desta tarefa: a seção usava CtaButtons
// (que precisa dele pra decidir "Criar conta"/"Ir para a plataforma") —
// substituído por BotaoVerCursos (pedido explícito, item 5), uma âncora
// fixa pra #cursos que não depende de login nenhum.
export default function PlataformaSection() {
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const [reduzido, setReduzido] = useState(false);
  const [montado, setMontado] = useState(false);

  const cardRef = useRef<HTMLDivElement | null>(null); // card com a "sangria" — usado só pra MEDIR o padding-top real dele
  const cartoesRef = useRef<(HTMLDivElement | null)[]>([]);
  const barraRef = useRef<HTMLDivElement | null>(null);
  const indiceAtivoRef = useRef(0); // espelho do state, pra ler dentro do loop de rAF sem closure velha
  const linhaGatilhoRef = useRef(0); // altura (em px, contados da viewport) calculada por calcularLinhaGatilho — lido a cada frame do rAF, sem custo de reler o DOM

  useEffect(() => {
    setMontado(true);
    setReduzido(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // Mede a altura real do header (--header-h, app/globals.css) e o
  // padding-top REAL do card (o mesmo elemento que tem as classes
  // `py-5 sm:py-6 ... lg:py-16 xl:py-[72px]`, mais abaixo) via
  // getComputedStyle — nenhum dos dois é um número mágico duplicado aqui:
  // o header já tem sua variável própria, e o padding-top do card é o
  // valor de verdade RENDERIZADO (acompanha sozinho se aquelas classes
  // mudarem um dia, sem precisar espelhar breakpoint por breakpoint em
  // JS). Escreve o resultado tanto na ref (lida pelo loop de rAF, abaixo)
  // quanto na property CSS custom `--plataforma-pad-top` do próprio card
  // (lida pelo `top` do sticky, no JSX — MESMO valor usado nos dois
  // lugares, CSS e JS, garantindo que a coluna trava exatamente onde a
  // linha de disparo diz que ela deveria travar).
  useEffect(() => {
    function medir() {
      if (!cardRef.current) return;
      const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64;
      const padTop = parseFloat(getComputedStyle(cardRef.current).paddingTop) || 0;
      cardRef.current.style.setProperty('--plataforma-pad-top', `${padTop}px`);
      linhaGatilhoRef.current = headerH + MARGEM_ATIVACAO_PX + padTop;
    }
    medir();
    window.addEventListener('resize', medir, { passive: true });
    return () => window.removeEventListener('resize', medir);
  }, []);

  useEffect(() => {
    if (!montado || reduzido) return;

    let ticking = false;

    function aplicar() {
      ticking = false;
      if (window.innerWidth < BREAKPOINT_LG) return; // sem tracking no mobile/tablet (sem sticky lá)

      const linhaGatilho = linhaGatilhoRef.current;
      const rects = cartoesRef.current.map((el) => el?.getBoundingClientRect() ?? null);
      const primeiro = rects[0];

      let novoIndice = 0;
      let progresso = 0;

      if (primeiro && primeiro.top > linhaGatilho) {
        // Antes da ativação (card ainda abaixo do menu): tópico 1, progresso 0.
        novoIndice = 0;
        progresso = 0;
      } else {
        // Acha o ÚLTIMO cartão cujo topo já cruzou a linha — esse é o
        // ativo (pedido explícito: "cada cartão seguinte fica ativo
        // quando o topo dele alcançar a linha").
        for (let i = 0; i < rects.length; i++) {
          if (rects[i] && rects[i]!.top <= linhaGatilho) novoIndice = i;
        }
        const atual = rects[novoIndice];
        const proximo = rects[novoIndice + 1];
        if (atual) {
          // Distância = altura do cartão atual + o espaçamento até o
          // PRÓXIMO (gap-6 da pilha) — pedido explícito: o progresso vai
          // de 0 a 1 enquanto o cartão percorre a própria altura MAIS
          // esse respiro, não só a própria altura. Último cartão (sem
          // próximo): usa a própria altura como distância.
          const distancia = proximo ? proximo.top - atual.top : atual.height;
          progresso = distancia > 0 ? (linhaGatilho - atual.top) / distancia : 1;
        }
      }

      progresso = Math.min(1, Math.max(0, progresso));
      if (novoIndice !== indiceAtivoRef.current) {
        indiceAtivoRef.current = novoIndice;
        setIndiceAtivo(novoIndice);
      }
      if (barraRef.current) barraRef.current.style.width = `${progresso * 100}%`;
    }

    function aoRolar() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(aplicar);
    }

    aplicar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    window.addEventListener('resize', aoRolar, { passive: true });
    return () => {
      window.removeEventListener('scroll', aoRolar);
      window.removeEventListener('resize', aoRolar);
    };
  }, [montado, reduzido]);

  // prefers-reduced-motion: mantém o sticky/a troca de tópico (o índice
  // ainda pode ser trocado por CLIQUE, ver abaixo), mas sem o tracking
  // automático por scroll — a barra fica parada em 100% no ativo (pedido
  // explícito).
  useEffect(() => {
    if (reduzido && barraRef.current) barraRef.current.style.width = '100%';
  }, [reduzido, indiceAtivo]);

  // Clique num tópico — rola suave até o cartão correspondente ALINHADO À
  // LINHA DE DISPARO (pedido explícito desta tarefa — era `scrollIntoView`
  // centralizado na viewport, que podia deixar o cartão atrás do menu):
  // desloca o scroll pela diferença entre o topo atual do cartão e a
  // mesma linha usada pelo tracking automático, então o cartão pousa
  // exatamente onde o menu fixo nunca cobre e o tópico já nasce ativo.
  // `behavior: 'auto'` no reduced-motion (sem scroll animado).
  function irParaCartao(indice: number) {
    const el = cartoesRef.current[indice];
    if (!el) return;
    const destino = window.scrollY + el.getBoundingClientRect().top - linhaGatilhoRef.current;
    window.scrollTo({ top: destino, behavior: reduzido ? 'auto' : 'smooth' });
  }

  return (
    // Container (mesmo componente compartilhado que a seção dos números e
    // a faixa #palavras já usam — max-w-6xl, mesma margem lateral): o
    // CONTEÚDO da seção (não mais o card) é quem segue exatamente essa
    // largura/alinhamento agora (pedido explícito desta tarefa). O card em
    // si volta a ser um pouco MAIOR que isso — ver comentário dele, logo
    // abaixo — através de uma "sangria" (bleed) que sai do container só
    // pra fora, sem alterar onde o conteúdo interno começa/termina.
    <Container>
      {/* Card com SANGRIA (bleed) — pedido explícito desta tarefa: o card
          se estende ~72px pra fora do container de cada lado (limitado
          pelo espaço real disponível — ver --card-bleed em
          app/globals.css, calculado em CSS puro, sem JS), com o padding
          interno IGUAL a essa sangria, pra o conteúdo ficar exatamente
          alinhado com o container (mesma borda esquerda/direita do
          eyebrow/título/grid da seção dos números). margin-inline
          negativo "puxa" o card pra fora; padding-inline (max com o piso
          responsivo --padding-minimo, ver classes abaixo) "empurra" o
          conteúdo de volta pra dentro na mesma medida — os dois sempre
          andam juntos.
          overflow-clip (NÃO overflow-hidden — quebraria o sticky da
          coluna esquerda, ver comentário do componente, acima). */}
      <div
        ref={cardRef}
        className="relative overflow-clip rounded-2xl border border-black/10 bg-gray-50 py-5 dark:border-white/10 dark:bg-surface sm:py-6 [--padding-minimo:20px] sm:[--padding-minimo:24px] md:[--padding-minimo:32px] lg:rounded-3xl lg:py-16 lg:[--padding-minimo:0px] xl:py-[72px]"
        style={{
          marginInline: 'calc(var(--card-bleed) * -1)',
          paddingInline: 'max(var(--card-bleed), var(--padding-minimo))',
        }}
      >
        {/* ---------- DESKTOP (lg+): sticky + acordeão ---------- */}
        {/* grid-cols-[minmax(0,7fr)_minmax(0,7fr)] + gap-x-8 (2rem) — pedido
            EXATO desta tarefa (era 5fr/7fr assimétrico com gap-x-12/16). */}
        <div className="hidden lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,7fr)] lg:items-start lg:gap-x-8">
            {/* COLUNA ESQUERDA — sticky. top = altura do header +
                MARGEM_ATIVACAO_PX + o padding-top REAL do card (ver o
                useEffect de medição, acima — escreve `--plataforma-pad-top`
                nesse mesmo elemento; nunca hardcoded aqui. O `64px` no
                fallback do var() é só uma rede de segurança pro instante
                antes desse efeito rodar, evitando um `calc()` com `NaN`). */}
            <div
              className="sticky flex flex-col"
              style={{ top: `calc(var(--header-h) + ${MARGEM_ATIVACAO_PX}px + var(--plataforma-pad-top, 64px))` }}
            >
              {/* Cabeçalho padronizado (pedido explícito desta tarefa —
                  item 1): SectionHeader compartilhado, MESMOS tamanhos de
                  eyebrow/título/texto de apoio da seção de números (nenhuma
                  classe de tamanho, peso ou espaçamento entre linhas própria
                  sobrescrevendo aqui — era um span/h2/p com tamanhos
                  menores, hardcoded só pra esta seção). showActions=false:
                  os botões saem daqui — vira só o "Ver cursos" (item 5),
                  posicionado separadamente (fim da coluna, abaixo do
                  acordeão). */}
              <SectionHeader
                eyebrow="Conheça a [[plataforma]]"
                title="Tudo o que você precisa para [[aprender]]"
                description="Conheça o que a plataforma oferece para você estudar com organização, no seu ritmo e de onde estiver."
                align="left"
                showActions={false}
              />

              {/* Acordeão — role="list" semântico simples (cada tópico é
                  um <button> com aria-expanded/aria-controls). Espaçamentos
                  reduzidos nesta tarefa (mt-5->mt-4, py-3->py-2.5,
                  mt-1.5->mt-1, mt-2.5->mt-2 — item 1, "NÃO reduza os
                  tamanhos de fonte do cabeçalho, reduza espaçamentos"):
                  compensa o título/eyebrow/texto agora maiores (mesma
                  escala da seção de números), pra continuar cabendo em
                  1366x768/1440x900 com a coluna sticky. Tamanho dos
                  PRÓPRIOS títulos/descrições dos tópicos não muda (regra
                  explícita — "continuam com os tamanhos próprios"). */}
              <div className="mt-4" role="list">
                {TOPICOS.map((topico, i) => {
                  const ativo = i === indiceAtivo;
                  return (
                    <div key={topico.titulo} role="listitem" className="border-b border-black/10 py-2.5 first:pt-0 dark:border-white/10">
                      <button
                        type="button"
                        aria-expanded={ativo}
                        aria-controls={`plataforma-desc-${i}`}
                        onClick={() => irParaCartao(i)}
                        className={cn(
                          'text-left text-sm font-semibold transition-colors duration-300',
                          ativo ? 'text-gray-900 dark:text-white' : 'text-gray-500 opacity-60 dark:text-gray-400'
                        )}
                      >
                        {topico.titulo}
                      </button>
                      {/* grid-template-rows 0fr->1fr (pedido explícito): anima
                          a altura sem medir em JS, sem pulo. */}
                      <div
                        id={`plataforma-desc-${i}`}
                        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                        style={{ gridTemplateRows: ativo ? '1fr' : '0fr' }}
                      >
                        <div className="overflow-hidden">
                          <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{topico.descricao}</p>
                          {/* Barra de progresso — aria-hidden (pedido
                              explícito); só existe DOM próprio enquanto
                              este tópico está ativo (a ref é reatribuída
                              pro item ativo a cada troca). */}
                          <div aria-hidden="true" className="mt-2 h-[2px] w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                            <div
                              ref={(el) => {
                                if (ativo) barraRef.current = el;
                              }}
                              className="h-full w-0 bg-gradient-to-r from-primary to-primary/20"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botão único "Ver cursos" (item 5/6) — posição DESKTOP:
                  fim da coluna esquerda, abaixo do acordeão. Já está
                  dentro do bloco `hidden lg:grid`, então não precisa de
                  nenhum `lg:` extra aqui — nunca coexiste com a variante
                  mobile (ver o bloco `lg:hidden`, abaixo). mt-5 (era mt-6
                  no CtaButtons antigo): parte da mesma compactação do
                  acordeão, acima. */}
              <BotaoVerCursos className="mt-5" />
            </div>

            {/* COLUNA DIREITA — pilha de 4 cartões visuais, rola normal.
                Altura reduzida nesta tarefa (era 380-420px): a coluna
                ficou mais estreita (7fr de 14, era 7fr de 12 — item 4),
                uma altura um pouco menor mantém a proporção dos cartões
                sem esticar/distorcer o conteúdo interno. */}
            <div className="flex flex-col gap-6">
              {TOPICOS.map((topico, i) => {
                const Visual = VISUAIS[i];
                return (
                  <div
                    key={topico.titulo}
                    ref={(el) => {
                      cartoesRef.current[i] = el;
                    }}
                    className="transition-opacity duration-[400ms]"
                    style={{ opacity: i === indiceAtivo ? 1 : 0.35 }}
                  >
                    <MolduraCartao className="h-[340px] xl:h-[380px]">
                      <Visual reduzido={reduzido} />
                    </MolduraCartao>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ---------- MOBILE/TABLET (abaixo de lg): empilhado, sem
              sticky/acordeão — visual em cima, título+descrição sempre
              visíveis embaixo (pedido explícito). ---------- */}
          <div className="lg:hidden">
            {/* MESMO SectionHeader do desktop, acima (item 1) — nenhum
                tamanho próprio aqui também. */}
            <SectionHeader
              eyebrow="Conheça a [[plataforma]]"
              title="Tudo o que você precisa para [[aprender]]"
              description="Conheça o que a plataforma oferece para você estudar com organização, no seu ritmo e de onde estiver."
              align="left"
              showActions={false}
            />

            {/* Botão único "Ver cursos" — posição MOBILE/TABLET (item 6):
                logo abaixo do texto de apoio, ANTES dos itens/cartões
                (mt-6 = 24px de respiro, pedido explícito). Nunca aparece
                junto com a variante desktop acima — este bloco inteiro é
                `lg:hidden`, o de cima é `hidden lg:grid`, mutuamente
                exclusivos. */}
            <BotaoVerCursos className="mt-6" />

            <div className="mt-8 flex flex-col gap-8 sm:gap-10">
              {TOPICOS.map((topico, i) => {
                const Visual = VISUAIS[i];
                return (
                  <div key={topico.titulo}>
                    <MolduraCartao className="h-[260px] sm:h-[300px]">
                      <Visual reduzido={reduzido} />
                    </MolduraCartao>
                    <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">{topico.titulo}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{topico.descricao}</p>
                  </div>
                );
              })}
            </div>
          </div>
      </div>
    </Container>
  );
}
