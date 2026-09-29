'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Code, Brain, Megaphone, Video, Languages, Plane, TrendingUp, ShoppingCart, Infinity as InfinityIcon, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Container from '@/components/institucional/Container';
import { comDestaque } from '@/components/institucional/SectionHeader';
import CtaButtons from '@/components/institucional/CtaButtons';

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

// Linha de disparo (pedido explícito): a 45% da altura da viewport — o
// cartão que estiver cruzando essa linha horizontal é o ATIVO.
const LINHA_GATILHO_PROPORCAO = 0.45;
const BREAKPOINT_LG = 1024;

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
 * Seção "Plataforma" (id="plataforma") — efeito de "coluna fixa" (scroll
 * com sticky): a coluna esquerda (cabeçalho + acordeão de tópicos +
 * botões) fica parada (position: sticky) enquanto a coluna direita (pilha
 * de 4 cartões visuais) rola por trás dela; o tópico correspondente ao
 * cartão mais próximo da "linha de disparo" (45% da altura da tela) abre
 * sozinho, com uma barra de progresso preenchendo conforme aquele cartão
 * passa pela linha. Estrutura/mecânica inspirada numa referência visual —
 * cores, fonte, ícones e textos são só os do projeto.
 *
 * position: sticky quebra se QUALQUER ancestral da coluna esquerda tiver
 * overflow não-visível — por isso o card externo (com cantos
 * arredondados) usa `overflow-clip` (recorta os cantos SEM criar um novo
 * contexto de "scroll container" — `overflow-hidden` quebraria o sticky
 * aqui) em vez de `overflow-hidden`, e nenhum wrapper entre o card e a
 * coluna esquerda define overflow nenhum.
 *
 * Sem framer-motion (não está no package.json) e sem IntersectionObserver
 * pro índice ativo (a "linha de disparo" fixa em 45% da viewport, não a
 * entrada/saída de cada cartão em si, precisa da posição EXATA de cada
 * cartão a cada frame — mais direto medir via getBoundingClientRect num
 * loop de rAF do que orquestrar vários observers): 1 listener de scroll
 * passivo + requestAnimationFrame, lendo `getBoundingClientRect` uma vez
 * por frame. O ÍNDICE ativo vira estado React (só muda quando realmente
 * troca de tópico — poucas vezes por scroll); o PROGRESSO da barra é
 * escrito direto no DOM via ref (nunca vira estado — evitaria um
 * re-render a cada frame só pra mudar um `width`).
 */
export default function PlataformaSection({ destinoLogado }: { destinoLogado: string | null }) {
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const [reduzido, setReduzido] = useState(false);
  const [montado, setMontado] = useState(false);

  const cartoesRef = useRef<(HTMLDivElement | null)[]>([]);
  const barraRef = useRef<HTMLDivElement | null>(null);
  const indiceAtivoRef = useRef(0); // espelho do state, pra ler dentro do loop de rAF sem closure velha

  useEffect(() => {
    setMontado(true);
    setReduzido(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (!montado || reduzido) return;

    let ticking = false;

    function aplicar() {
      ticking = false;
      if (window.innerWidth < BREAKPOINT_LG) return; // sem tracking no mobile/tablet (sem sticky lá)

      const linhaGatilho = window.innerHeight * LINHA_GATILHO_PROPORCAO;
      let novoIndice: number | null = null;
      let progresso = 0;

      for (let i = 0; i < cartoesRef.current.length; i++) {
        const el = cartoesRef.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= linhaGatilho && rect.bottom >= linhaGatilho) {
          novoIndice = i;
          progresso = rect.height > 0 ? (linhaGatilho - rect.top) / rect.height : 0;
          break;
        }
      }

      // Antes do 1º cartão chegar na linha: fica no tópico 0, progresso 0.
      // Depois do último cartão passar da linha: fica no último, 100%.
      if (novoIndice === null) {
        const primeiro = cartoesRef.current[0]?.getBoundingClientRect();
        const ultimo = cartoesRef.current[cartoesRef.current.length - 1]?.getBoundingClientRect();
        if (primeiro && primeiro.top > linhaGatilho) {
          novoIndice = 0;
          progresso = 0;
        } else if (ultimo && ultimo.bottom < linhaGatilho) {
          novoIndice = cartoesRef.current.length - 1;
          progresso = 1;
        }
      }

      if (novoIndice !== null) {
        progresso = Math.min(1, Math.max(0, progresso));
        if (novoIndice !== indiceAtivoRef.current) {
          indiceAtivoRef.current = novoIndice;
          setIndiceAtivo(novoIndice);
        }
        if (barraRef.current) barraRef.current.style.width = `${progresso * 100}%`;
      }
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

  // Clique num tópico — rola suave até o cartão correspondente,
  // centralizado na viewport (pedido explícito). `behavior: 'auto'` no
  // reduced-motion (sem scroll animado).
  function irParaCartao(indice: number) {
    cartoesRef.current[indice]?.scrollIntoView({ behavior: reduzido ? 'auto' : 'smooth', block: 'center' });
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
        className="relative overflow-clip rounded-2xl border border-black/10 bg-gray-50 py-5 dark:border-white/10 dark:bg-surface sm:py-6 [--padding-minimo:20px] sm:[--padding-minimo:24px] md:[--padding-minimo:32px] lg:rounded-3xl lg:py-16 lg:[--padding-minimo:0px] xl:py-[72px]"
        style={{
          marginInline: 'calc(var(--card-bleed) * -1)',
          paddingInline: 'max(var(--card-bleed), var(--padding-minimo))',
        }}
      >
        {/* ---------- DESKTOP (lg+): sticky + acordeão ---------- */}
        <div className="hidden lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-x-12 xl:gap-x-16">
            {/* COLUNA ESQUERDA — sticky. top = altura do header + 32px
                (pedido explícito), usando a MESMA variável do projeto
                (--header-h, ver app/globals.css). */}
            <div className="sticky flex flex-col" style={{ top: 'calc(var(--header-h) + 32px)' }}>
              <span className="text-sm text-gray-500 dark:text-gray-400">{comDestaque('Conheça a [[plataforma]]', 'font-semibold text-gray-900 dark:text-white')}</span>
              {/* text-4xl incondicional, SEM xl:text-5xl (pedido explícito
                  desta tarefa dava a opção "text-4xl a text-5xl" — testei
                  os dois): a "sangria" do card (--card-bleed, ver
                  app/globals.css) trava em 72px de cada lado a partir de
                  ~1354px e NUNCA cresce mais (o container em si também
                  trava em max-w-6xl) — ou seja, a coluna esquerda tem a
                  MESMA largura (~426px, medido) em 1366px, 1920px ou
                  2560px; se text-5xl não coubesse em 2 linhas em 1366px,
                  não ia caber em nenhuma tela maior também, então
                  text-4xl é o tamanho certo em TODAS elas, não só nas
                  menores. Medido: numLines=2 em 1366x768/1440x900. */}
              <h2 className="mt-3 max-w-[520px] text-4xl font-semibold leading-tight tracking-tight text-gray-900 dark:text-white">
                {comDestaque('Tudo o que você precisa para [[aprender]]', 'text-primary')}
              </h2>
              <p className="mt-4 max-w-[440px] text-base leading-relaxed text-gray-500 dark:text-gray-400">
                Conheça o que a plataforma oferece para você estudar com organização, no seu ritmo e de onde estiver.
              </p>

              {/* Acordeão — role="list" semântico simples (cada tópico é
                  um <button> com aria-expanded/aria-controls, pedido
                  explícito). py-3 (era py-4) + textos um pouco menores —
                  pedido explícito desta tarefa: "deixe a coluna esquerda
                  compacta... reduza espaçamentos/tamanhos se precisar",
                  pra caber em 1366x768/1440x900 com a coluna sticky. */}
              <div className="mt-5" role="list">
                {TOPICOS.map((topico, i) => {
                  const ativo = i === indiceAtivo;
                  return (
                    <div key={topico.titulo} role="listitem" className="border-b border-black/10 py-3 first:pt-0 dark:border-white/10">
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
                          <p className="mt-1.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{topico.descricao}</p>
                          {/* Barra de progresso — aria-hidden (pedido
                              explícito); só existe DOM próprio enquanto
                              este tópico está ativo (a ref é reatribuída
                              pro item ativo a cada troca). */}
                          <div aria-hidden="true" className="mt-2.5 h-[2px] w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
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

              <CtaButtons destinoLogado={destinoLogado} className="mt-6" />
            </div>

            {/* COLUNA DIREITA — pilha de 4 cartões visuais, rola normal.
                Altura 380-440px (pedido explícito, era 440-480px — o card
                ficou mais estreito, uma altura um pouco menor mantém a
                proporção equilibrada). */}
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
                    <MolduraCartao className="h-[380px] xl:h-[420px]">
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
            <span className="text-sm text-gray-500 dark:text-gray-400">{comDestaque('Conheça a [[plataforma]]', 'font-semibold text-gray-900 dark:text-white')}</span>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              {comDestaque('Tudo o que você precisa para [[aprender]]', 'text-primary')}
            </h2>
            <p className="mt-4 max-w-[440px] text-base leading-relaxed text-gray-500 dark:text-gray-400">
              Conheça o que a plataforma oferece para você estudar com organização, no seu ritmo e de onde estiver.
            </p>

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

            <CtaButtons destinoLogado={destinoLogado} className="mt-8" />
          </div>
      </div>
    </Container>
  );
}
