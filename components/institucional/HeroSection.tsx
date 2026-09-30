'use client';

import { useEffect, useMemo, useState } from 'react';
import AvataresProvaSocial from '@/components/institucional/AvataresProvaSocial';
import ImagemPlataformaSection from '@/components/institucional/ImagemPlataformaSection';
import CtaButtons from '@/components/institucional/CtaButtons';
import WordReveal from '@/components/institucional/WordReveal';
import { cn } from '@/lib/utils';

// Fallback estático (pedido explícito: "se o footer não expõe uma lista,
// use os nomes acima") — só entra em jogo se `categorias` vier vazio (falha
// na query em app/page.tsx, ver comentário lá). Fonte principal de verdade
// é sempre a prop `categorias` (mesmos dados REAIS que alimentam a coluna
// "Cursos" do footer, LandingFooter.tsx) — nunca duplicada, só reaproveitada
// aqui, pra nunca dessincronizar dos nichos que o footer mostra.
// `export` (era só local a este arquivo) — CursosSection.tsx (seção
// "Cursos" da landing, tarefa posterior) reaproveita a MESMA lista como
// cards provisórios, mesmo motivo: nunca duplicar/dessincronizar dos
// nichos reais.
export const NICHOS_FALLBACK = [
  'Criação de Sites',
  'Desenvolvimento Pessoal',
  'Dropshipping',
  'Ecommerce',
  'Edição de Vídeos',
  'Finanças',
  'Gestão de Tráfego',
  'Idiomas',
  'Inteligência Artificial',
  'Marketing Digital',
  'Milhas Aéreas',
  'Social Media',
  'TikTok',
];

const VELOC_DIGITAR_MS = 70;
const VELOC_APAGAR_MS = 40;
const PAUSA_COMPLETO_MS = 1500;

// Trecho do nicho animado — tratado como "a última palavra da linha 2" da
// sequência de entrada do hero (pedido explícito de uma tarefa posterior,
// ver comentário no H1 mais abaixo): linha 1 ("Um só lugar") tem 3
// palavras (índices 0-2), linha 2 ("todos os cursos") mais 3 (índices
// 0-2 na PRÓPRIA instância de WordReveal dela, mas conceitualmente
// 3-5 na cascata contínua) — o nicho é a PRÓXIMA palavra da cascata,
// índice 6. DELAY/STAGGER aqui são os MESMOS da linha 1 (WordReveal
// immediate delay={250} stagger={60} no H1, abaixo) — reaproveitados
// (não duplicados) pra calcular tanto o `--wr-delay`/`--i` do nicho
// quanto ESPERA_ANTES_DE_DIGITAR_MS logo abaixo, garantindo que os dois
// nunca dessincronizem.
const NICHO_DELAY_BASE_MS = 250;
const NICHO_STAGGER_MS = 60;
const NICHO_INDICE = 6;
// Duração aproximada da transição de opacity/filter do .wr-word (ver
// app/globals.css — "opacity .6s ease, ... filter .6s ease"), pedido
// explícito: "~600ms". A digitação só começa DEPOIS que a entrada do
// nicho termina (pedido explícito) — calculado, não por onTransitionEnd
// (mais simples/robusto, sem depender de qual propriedade dispara o
// evento primeiro entre opacity/transform/filter).
const TRANSICAO_ENTRADA_MS = 600;
const ESPERA_ANTES_DE_DIGITAR_MS = NICHO_DELAY_BASE_MS + NICHO_INDICE * NICHO_STAGGER_MS + TRANSICAO_ENTRADA_MS;

/**
 * Efeito de digitação (typewriter) do trecho destacado do H1 — escreve um
 * nicho, pausa com o texto completo, apaga letra por letra, passa pro
 * próximo, em loop infinito. useEffect + setTimeout (pedido explícito: "não
 * instale nada novo só para isso" — sem lib de terceiros).
 *
 * `prefers-reduced-motion`: retorna só o primeiro nicho, parado, sem
 * animação nenhuma (pedido explícito). `montado`: guard de hidratação —
 * antes de montar, mostra o mesmo texto estático que o reduced-motion
 * mostraria, pra nunca haver mismatch de hidratação entre server e client
 * (o H1 estático via `aria-label`, ver HeroSection abaixo, cobre leitor de
 * tela o tempo todo, independente deste hook).
 *
 * A digitação em si só começa depois de `ESPERA_ANTES_DE_DIGITAR_MS`
 * (pedido explícito de uma tarefa posterior — "só deve começar DEPOIS que
 * a entrada terminar"): antes disso, `texto` fica '' (vazio) — o cursor
 * piscando aparece sozinho, sem nenhum caractere, exatamente como a tarefa
 * permite ("pode mostrar só o cursor"). Velocidade de digitação/apagar,
 * nichos e cores continuam EXATAMENTE os mesmos — só o INÍCIO atrasou.
 */
function useTypewriter(nichos: string[]) {
  const [montado, setMontado] = useState(false);
  const [reduzido, setReduzido] = useState(false);
  const [texto, setTexto] = useState('');

  useEffect(() => {
    setMontado(true);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduzido(mq.matches);
    function aoMudar(e: MediaQueryListEvent) {
      setReduzido(e.matches);
    }
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, []);

  useEffect(() => {
    if (!montado || reduzido || nichos.length === 0) return;

    let cancelado = false;
    let indiceNicho = 0;
    let indiceChar = 0;
    let timer: ReturnType<typeof setTimeout>;

    function digitar() {
      if (cancelado) return;
      const nicho = nichos[indiceNicho];
      indiceChar++;
      setTexto(nicho.slice(0, indiceChar));
      timer = setTimeout(indiceChar < nicho.length ? digitar : apagar, indiceChar < nicho.length ? VELOC_DIGITAR_MS : PAUSA_COMPLETO_MS);
    }

    function apagar() {
      if (cancelado) return;
      indiceChar--;
      setTexto(nichos[indiceNicho].slice(0, indiceChar));
      if (indiceChar > 0) {
        timer = setTimeout(apagar, VELOC_APAGAR_MS);
      } else {
        indiceNicho = (indiceNicho + 1) % nichos.length;
        timer = setTimeout(digitar, VELOC_DIGITAR_MS);
      }
    }

    // ESPERA_ANTES_DE_DIGITAR_MS (não VELOC_DIGITAR_MS direto, como antes)
    // — só o atraso INICIAL muda; o resto do loop (digitar/apagar) segue
    // com os MESMOS tempos de sempre.
    timer = setTimeout(digitar, ESPERA_ANTES_DE_DIGITAR_MS);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [montado, reduzido, nichos]);

  if (!montado || reduzido) return { texto: nichos[0] ?? '', reduzido: true };
  return { texto, reduzido: false };
}

/**
 * Hero da seção "Início" — reconstruído nesta tarefa pra seguir a
 * composição de uma referência visual (card grande arredondado, prova
 * social com avatares, título grande, subtítulo, botões, mockup da
 * plataforma emergindo da base do card): SÓ a estrutura/composição foi
 * copiada da referência, nunca cores de marca dela — cores, fonte, logo e
 * textos continuam os do projeto (fundo escuro + vermelho `primary`, ver
 * tailwind.config.ts).
 *
 * `categorias`: MESMA prop que já chega em LandingPageClient vinda de
 * app/page.tsx (13 categorias reais do banco) — reaproveitada aqui como os
 * "nichos" do typewriter, nenhuma lista nova/duplicada (ver comentário do
 * fallback acima).
 */
export default function HeroSection({ destinoLogado, categorias }: { destinoLogado: string | null; categorias: { id: string; nome: string }[] }) {
  const nichos = useMemo(() => (categorias.length > 0 ? categorias.map((c) => c.nome) : NICHOS_FALLBACK), [categorias]);
  const { texto: nichoAtual, reduzido } = useTypewriter(nichos);

  // Dispara a ENTRADA do nicho (não a digitação — essa espera
  // ESPERA_ANTES_DE_DIGITAR_MS dentro de useTypewriter, acima) — MESMA
  // técnica de "montou + 2 requestAnimationFrame" que WordReveal.tsx usa
  // no modo `immediate` (garante que o navegador já pintou o estado
  // INICIAL do `.wr-word`, opacity .12/blur, antes da classe `is-in`
  // entrar, senão a transição CSS não teria um "de" pra sair).
  const [nichoEntrou, setNichoEntrou] = useState(false);
  useEffect(() => {
    let quadro1 = 0;
    let quadro2 = 0;
    quadro1 = requestAnimationFrame(() => {
      quadro2 = requestAnimationFrame(() => setNichoEntrou(true));
    });
    return () => {
      cancelAnimationFrame(quadro1);
      if (quadro2) cancelAnimationFrame(quadro2);
    };
  }, []);

  return (
    // SEM Container/max-w (era Container, max-w-6xl — causa raiz de um bug
    // relatado nesta tarefa: o card ficava travado numa largura pequena,
    // alinhada ao container do resto do site, em vez de fluido/quase
    // full-bleed como a referência). Wrapper próprio, width:100%, só com
    // margem lateral pequena (pedido explícito: ~12px mobile, 16px
    // tablet, 20-24px desktop) — px-3/sm:px-4/lg:px-6 — sem NENHUM
    // max-width: o card cresce junto com a janela, inclusive muito além
    // de 1920px.
    //
    // paddingTop = var(--header-h) + 12px (pedido explícito — variável
    // CSS em vez de valor mágico, ver app/globals.css): o header é
    // `fixed` (não ocupa espaço no fluxo, ver LandingHeader.tsx), então
    // sem essa compensação o hero nascia atrás dele — outra causa raiz do
    // mesmo bug relatado ("o menu se sobrepõe ao card"). Só o padding-TOP
    // precisa disso (o menu só cobre o TOPO da página no carregamento,
    // antes de rolar — depois disso, ele reduz e passa por cima
    // normalmente durante o scroll, o que é esperado). pb pequeno: só o
    // respiro entre o card e a seção seguinte (diferente do padding
    // INTERNO do card, que não tem pb nenhum — ver mais abaixo).
    <div className="px-3 pb-6 sm:px-4 sm:pb-8 lg:px-6 lg:pb-10" style={{ paddingTop: 'calc(var(--header-h) + 12px)' }}>
      {/* CAMADA EXTERNA — wrapper com cantos bem arredondados, fundo um
          tom mais claro que o fundo da página no escuro (#141414 — MESMA
          cor já usada em outro lugar do projeto pro fundo "um passo acima"
          do preto mais profundo, ver app/globals.css `html{background-color}`,
          reaproveitada aqui por consistência, não inventada) e padding
          pequeno, criando a "moldura" dupla pedida na referência. */}
      <div className="rounded-2xl bg-gray-100 p-2 dark:bg-[#141414] sm:rounded-[28px] sm:p-3 lg:rounded-[32px]">
        {/* CAMADA INTERNA — o card do hero em si: borda fina sutil,
            cantos arredondados, overflow-hidden (corta o mockup da
            plataforma lá embaixo E os feixes de luz do fundo, que
            "vazam" de propósito pra fora da área visível). relative pro
            fundo decorativo (absolute, atrás) e o conteúdo (relative,
            acima) se empilharem certo. */}
        <div className="relative overflow-hidden rounded-xl border border-black/10 dark:border-white/10 sm:rounded-2xl lg:rounded-3xl">
          {/* FUNDO DECORATIVO — 3 camadas, todas pointer-events-none/
              aria-hidden (só efeito visual, nada de conteúdo):
              1) gradiente radial base (mais claro no topo-centro, mais
                 escuro nas bordas — "sofisticado e discreto", pedido
                 explícito);
              2) brilho vermelho `primary` (#e50914, MESMO token do
                 projeto — tailwind.config.ts) em opacidade bem baixa,
                 nascendo do topo-centro;
              3) 2 feixes de luz diagonais bem sutis no canto superior
                 direito (gradiente + blur + rotação, opacidade baixíssima).
              Tudo em CSS puro (gradientes), nada de imagem. */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_0%,#f4f4f5_0%,#e4e4e7_100%)] dark:bg-[radial-gradient(ellipse_90%_70%_at_50%_0%,#1c1c1c_0%,#141414_45%,#0c0c0c_100%)]" />
            <div className="absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(ellipse_55%_60%_at_50%_0%,rgba(229,9,20,0.12),transparent_70%)] dark:bg-[radial-gradient(ellipse_55%_60%_at_50%_0%,rgba(229,9,20,0.22),transparent_70%)]" />
            <div className="absolute -right-16 -top-16 h-72 w-72 rotate-[35deg] bg-gradient-to-b from-black/[0.04] to-transparent blur-2xl dark:from-white/[0.07]" />
            <div className="absolute right-8 -top-24 h-80 w-36 rotate-[35deg] bg-gradient-to-b from-black/[0.03] to-transparent blur-xl dark:from-white/[0.05]" />
          </div>

          {/* CONTEÚDO — z-10 acima do fundo decorativo. pt reduzido nesta
              tarefa (pedido explícito: ~48-80px desktop, era 64-96px —
              "reduza um pouco os espaçamentos verticais" pra sobrar mais
              imagem visível na primeira tela, já que agora o card TAMBÉM
              começa mais baixo, abaixo do menu). SEM pb nenhum (pedido
              explícito: "o card não tem padding inferior") — o mockup
              (último filho) encosta direto na borda de baixo do card,
              cortado pelo overflow-hidden dele. Só o TEXTO (prova social/
              título/subtítulo/botões) tem padding horizontal aqui — a
              imagem, mais abaixo, fica FORA deste padding (própria seção,
              ver comentário lá) pra poder ocupar até 95% da largura do
              CARD, não da coluna de texto. */}
          {/* pt-6 (era pt-8 incondicional) + md:pt-10 lg:pt-16 (eram
              sm:pt-10/lg:pt-16 — pedido explícito desta tarefa: tudo
              abaixo de md agora é "mobile", então o valor que ANTES
              começava em sm/640 passa a começar em md/768, mantendo o
              tablet/desktop EXATAMENTE como estavam — na prática, o
              efetivo em >=768px não muda em nada). pt-6 (mais compacto
              que os 32px de antes) libera espaço pra imagem aparecer mais
              alta na primeira tela no mobile. */}
          <div className="relative z-10 flex flex-col items-center pt-6 text-center md:pt-10 lg:pt-16">
            <div className="flex flex-col items-center px-4 sm:px-6">
              {/* 1) Prova social — pedido explícito de uma tarefa
                  anterior: no mobile vira COLUNA (avatares em cima, texto
                  embaixo, gap-2/8px); a partir de md, EXATAMENTE como
                  antes (linha, gap-3). Não convertido pro eyebrow
                  compartilhado (SectionHeader.tsx, ver comentário lá) —
                  já segue visualmente o MESMO padrão (cinza + trecho
                  branco/semibold, sem caixa alta), só que com um
                  breakpoint próprio (md, não sm) amarrado à compactação
                  mobile específica do hero; extrair arriscaria uma
                  regressão visual sutil sem ganho nenhum (pedido
                  explícito desta tarefa: "se for arriscado, deixe como
                  está"). */}
              {/* Selo (fotos + texto) — 2º item da sequência de entrada do
                  hero (pedido explícito: "fade + subida 16px, delay
                  100ms"). intro-item (app/globals.css) — dispara sozinho ao
                  carregar, sem esperar rolagem nenhuma (nunca AOS aqui). */}
              <div
                className="intro-item flex flex-col items-center gap-2 md:flex-row md:gap-3"
                style={{ '--intro-y': '16px', '--intro-delay': '100ms' } as React.CSSProperties}
              >
                <AvataresProvaSocial />
                {/* text-xs (12px, pedido explícito) no mobile, md:text-sm
                    restaura o tamanho de sempre. whitespace-nowrap
                    incondicional — pedido explícito: "em UMA única linha"
                    no mobile; a partir de md sobra espaço de sobra, não
                    tem efeito colateral nenhum manter lá também. */}
                <span className="whitespace-nowrap text-xs font-medium md:text-sm">
                  <span className="text-gray-500 dark:text-gray-400">+2 mil usuários na </span>
                  <span className="text-gray-900 dark:text-white">MembersFlix</span>
                </span>
              </div>

              {/* 2) H1 — pedido explícito desta tarefa: no MOBILE, 3
                  linhas (era 2, mas quebrava sozinho em até 4 por falta
                  de espaço) — "Um só lugar" / "todos os cursos" / nicho
                  animado, cada um na sua própria linha; a partir de md,
                  EXATAMENTE como estava antes desta tarefa ("Um só lugar"
                  / "todos os cursos {nicho}" juntos na linha 2). Técnica:
                  um <br className="md:hidden" /> força a quebra só no
                  mobile — no md+ ele vira display:none e o texto volta a
                  fluir junto, sem duplicar nenhum elemento/marcação por
                  breakpoint. `aria-label` estático + conteúdo visual
                  `aria-hidden` (mesmo padrão de acessibilidade de
                  sempre). */}
              <h1
                aria-label="Um só lugar, todos os cursos"
                className="mt-4 w-full max-w-4xl text-[clamp(26px,7.5vw,32px)] font-semibold leading-[1.1] tracking-tight text-gray-900 dark:text-white md:mt-6 md:text-[clamp(2.5rem,1.3rem+2.4vw,4rem)] md:leading-[1.05]"
              >
                <span aria-hidden="true">
                  {/* Título — WordReveal palavra por palavra (pedido
                      explícito, hero item 3): "Um só lugar" e "todos os
                      cursos" cada um numa instância própria (não dá pra
                      juntar as duas num WordReveal só, porque entre elas
                      mora o span do NICHO — texto DINÂMICO, trocado letra a
                      letra pelo typewriter, useTypewriter acima; passar
                      esse span por dentro do WordReveal reprocessaria/
                      recriaria os spans de palavra a cada tecla digitada,
                      brigando com a própria digitação). delay da 2ª linha
                      (430ms) continua a MESMA cadência de stagger da 1ª
                      (250ms + 3 palavras × 60ms), pra ler como uma cascata
                      única mesmo sendo dois componentes. */}
                  <WordReveal as="span" immediate delay={250} stagger={60} className="block">
                    Um só lugar
                  </WordReveal>
                  {/* Wrapper da linha 2 — no mobile, contém DUAS linhas
                      reais (br força a quebra), cada uma com sua própria
                      altura natural, então não precisa de min-h aqui (só
                      a linha do nicho, mais abaixo, precisa — o
                      conteúdo dela muda de tamanho). A partir de md, vira
                      a linha ÚNICA combinada de sempre — min-h nela (não
                      no span do nicho, que é inline e ignora min-height)
                      reserva a altura certa. */}
                  <span className="mt-1 block md:min-h-[1.2em]">
                    {/* "todos os cursos" — no mobile o <br> logo depois já
                        força a quebra, independente do display dela; a
                        partir de md, sem <br>, ela flui junto com o nicho
                        na mesma linha, como sempre foi. */}
                    <WordReveal as="span" immediate delay={430} stagger={60} className="whitespace-nowrap">
                      todos os cursos
                    </WordReveal>
                    <br className="md:hidden" />
                    {/* min-h-[1.2em] + block (mobile — linha PRÓPRIA do
                        nicho, reserva a altura sozinha aqui); md:inline +
                        md:min-h-0 (volta a ser só mais um trecho inline
                        da linha combinada de cima, sem min-height
                        próprio — desnecessário lá, e inline ignoraria
                        mesmo). text-[0.9em] no mobile (pedido explícito:
                        "reduza um pouco mais o tamanho do trecho
                        animado, 90% do título, em vez de quebrar em duas
                        linhas" — testado com os nichos mais longos, ver
                        resumo da tarefa); md:text-[1em] restaura o
                        tamanho igual ao resto do título, como sempre foi.
                        whitespace-nowrap incondicional: nunca quebra em 2
                        linhas, nem no mobile (o nicho precisa ficar
                        inteiro numa linha só) nem a partir de lg
                        (comportamento de sempre).
                        `wr`/`is-in` (era `intro-item` — pedido explícito de
                        uma tarefa posterior: "o texto animado dos nichos
                        deve receber o MESMO efeito de entrada das palavras
                        do título... use a mesma classe/transition do
                        WordReveal (.wr-word)"; antes ele aparecia nítido
                        antes do resto por usar uma animação PRÓPRIA
                        (intro-item), fora da cascata do título — agora usa
                        literalmente o `.wr-word` de app/globals.css, com
                        `--i`/`--wr-delay`/`--wr-stagger` calculados como se
                        fosse a PRÓXIMA palavra depois das 6 do título (ver
                        NICHO_INDICE/NICHO_DELAY_BASE_MS/NICHO_STAGGER_MS,
                        acima) — não dá pra usar o componente WordReveal em
                        si aqui (só a classe/CSS dele): o conteúdo é
                        DINÂMICO (typewriter, useTypewriter acima),
                        WordReveal reprocessaria os spans a cada tecla
                        digitada. `nichoEntrou` (state próprio, acima) faz o
                        papel do `is-in` que o WordReveal adicionaria
                        sozinho. */}
                    <span
                      className={cn('wr mt-1 block min-h-[1.2em] whitespace-nowrap text-[0.9em] md:mt-0 md:inline md:min-h-0 md:text-[1em]', nichoEntrou && 'is-in')}
                    >
                      {/* espaço antes do nicho — só visível quando ele
                          está JUNTO de "todos os cursos" na mesma linha
                          (md+); no mobile, esse espaço vira só um espaço
                          em branco solto no INÍCIO da linha do nicho
                          (depois do <br>), que o navegador já recolhe
                          sozinho, sem precisar de nenhuma classe
                          condicional extra. */}
                      <span className="hidden md:inline"> </span>
                      {/* min-width via inline-block (herdado de .wr-word)
                          já evita pulo de layout quando a digitação começa
                          (pedido explícito) — o span nunca desaparece do
                          fluxo, só o TEXTO dentro dele muda de ''
                          (esperando) pra as letras sendo digitadas. */}
                      <span className="wr-word text-primary" style={{ '--i': NICHO_INDICE, '--wr-delay': `${NICHO_DELAY_BASE_MS}ms`, '--wr-stagger': `${NICHO_STAGGER_MS}ms` } as React.CSSProperties}>
                        {nichoAtual}
                        {/* Cursor some no prefers-reduced-motion (pedido
                            explícito: "mostre apenas um nicho estático")
                            — o piscar do cursor também é uma animação. */}
                        {!reduzido && (
                          <span className="animate-blink text-primary" aria-hidden="true">
                            |
                          </span>
                        )}
                      </span>
                    </span>
                  </span>
                </span>
              </h1>

              {/* 3) Subtítulo — MESMO texto de sempre (idêntico ao da
                  descrição da plataforma no footer), inalterado nesta
                  tarefa. No mobile (pedido explícito): text-sm (14px),
                  max-w-[320px], mt-3 (mais compacto). A partir de md,
                  EXATAMENTE como estava antes (text-lg -> sm:text-xl, só
                  que o efetivo em >=768px já era text-xl mesmo antes —
                  ver comentário do wrapper "CONTEÚDO", acima, sobre a
                  troca de breakpoint sm->md). */}
              {/* Subtítulo — WordReveal immediate (pedido explícito, hero
                  item 3: "começa depois do título, delay ~900ms, stagger
                  25ms"). */}
              <WordReveal
                as="p"
                immediate
                delay={900}
                stagger={25}
                className="mt-3 w-full max-w-[320px] text-sm leading-relaxed text-gray-500 dark:text-gray-400 md:mt-4 md:max-w-[640px] md:text-xl"
              >
                Acesse cursos gravados, evolua no seu ritmo e aprenda com quem já chegou lá.
              </WordReveal>

              {/* 4) Botões — extraídos pra um componente compartilhado
                  nesta tarefa (CtaButtons.tsx, ver comentário lá), pra
                  reutilizar em SectionHeader.tsx sem duplicar
                  classes/links. Mesmo estilo/altura/comportamento de
                  sempre — só saiu do lugar. labelPrimario="Criar conta
                  grátis" (pedido explícito de uma tarefa posterior: só
                  aqui e na seção Perguntas frequentes, sem "minha" —
                  destino/estilo/tamanho continuam os mesmos, ver
                  CtaButtons.tsx).
                  intro-item (pedido explícito, hero item 3: "fade + subida
                  20px + scale 0.96 -> 1, delay ~1500ms") num wrapper (a
                  margem mt-5/md:mt-6, que antes ia direto no className do
                  CtaButtons, saiu pra cá — mesmo resultado visual, o
                  colapso de margem entre um <div> bloco simples e seu
                  único filho não muda nada). Sem pointer-events:none em
                  nenhum momento — clicável assim que aparece (pedido
                  explícito: "não deve atrasar a interação"). */}
              <div
                className="intro-item mt-5 md:mt-6"
                style={{ '--intro-y': '20px', '--intro-scale': '0.96', '--intro-delay': '1500ms' } as React.CSSProperties}
              >
                <CtaButtons destinoLogado={destinoLogado} labelPrimario="Criar conta grátis" />
              </div>
            </div>

            {/* Mockup da plataforma — FORA do padding horizontal do texto
                acima (pedido explícito desta tarefa: "de 90% a 95% da
                largura do CARD", não da coluna de texto) — px-2 mínimo no
                mobile (pedido explícito: "pode sair um pouco da margem
                interna, com padding lateral mínimo"), sm:px-0 (a partir
                daí, a centralização por w-[92%] já cuida da margem
                sozinha). mt reduzido (era mt-10/12/14) — mesmo motivo dos
                outros espaçamentos acima, pra sobrar mais imagem visível
                já na primeira tela. "Nasce" da base do card: w-full +
                sem mb, encosta direto na borda de baixo (sem pb no
                wrapper "CONTEÚDO" acima). */}
            {/* mt-4 no mobile (era mt-6) — pedido explícito desta tarefa:
                "reduza os espaçamentos... entre... botões e imagem" (mais
                compacto ainda que o ajuste da tarefa anterior). md:px-0
                (era sm:px-0/md:mt-10 era sm:mt-10 — mesma troca de
                breakpoint sm->md explicada acima: abaixo de md, tudo
                conta como mobile agora); lg:mt-12 inalterado (já era
                lg-only, continua igual). */}
            {/* intro-item (pedido explícito, hero item 3: "fade + subida
                48px, 1000ms, delay ~1700ms") — SEMPRE num wrapper POR FORA
                do componente que recebe a inclinação por scroll
                (ImagemPlataformaSection.tsx, wrapperRef/imgBoxRef lá
                dentro): dois `transform` no MESMO elemento brigariam (um
                escrito via animation CSS aqui, outro via JS a cada frame de
                scroll lá dentro) — este <div> é só o PAI, nunca o mesmo nó;
                a inclinação por scroll continua funcionando exatamente
                igual, sem nenhuma mudança em ImagemPlataformaSection.tsx. */}
            <div
              className="intro-item mt-4 w-full px-2 md:mt-10 md:px-0 lg:mt-12"
              style={{ '--intro-y': '48px', '--intro-duration': '1000ms', '--intro-delay': '1700ms' } as React.CSSProperties}
            >
              <ImagemPlataformaSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
