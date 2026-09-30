'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Code,
  Sparkles,
  Truck,
  ShoppingCart,
  Video,
  Wallet,
  Megaphone,
  Languages,
  Brain,
  Plane,
  Share2,
  Music2,
  GraduationCap,
  Pause,
  Play,
  type LucideIcon,
} from 'lucide-react';
import { cn, slugify } from '@/lib/utils';
import Container from '@/components/institucional/Container';
import SectionHeader from '@/components/institucional/SectionHeader';
import { NICHOS_FALLBACK } from '@/components/institucional/HeroSection';

/* ------------------------------------------------------------------ *
 * Dados dos cards — pedido explícito: "array constante... com { slug,
 * title, image? }". Pra colocar a capa REAL de um curso, salve a imagem em
 * public/cursos/<slug>.png e preencha o campo `image` desse item com
 * '/cursos/<slug>.png' — qualquer item com `image` próprio já sobrescreve
 * o TEMP_COVER (ver `?? TEMP_COVER`, mais abaixo), sem precisar mexer em
 * mais nada. Se o arquivo de `image` (real ou temporário) apontar pra um
 * caminho que não existe, o <Image onError> abaixo detecta a falha e cai
 * pro visual provisório (gradiente + ícone), em vez de quebrar.
 *
 * TEMP_COVER: pedido explícito de uma tarefa anterior — capa temporária
 * REPETIDA em todos os cards só pra visualizar o carrossel com imagem de
 * verdade enquanto as capas reais não existem; troque pelas capas reais
 * depois.
 *
 * Fonte dos 13 nichos: a MESMA prop `categorias` que alimenta a coluna
 * "Cursos" do footer (LandingFooter.tsx) e o typewriter do hero
 * (HeroSection.tsx) — nunca uma lista nova. NICHOS_FALLBACK (exportado de
 * HeroSection.tsx) só entra em jogo se `categorias` vier vazio (mesma
 * regra de lá).
 * ------------------------------------------------------------------ */
type Curso = { slug: string; title: string; image?: string };

// '/imagens/imagemPlataformaMobile.png' — mesmo caminho que
// CardDispositivos, em PlataformaSection.tsx, já usa pra essa imagem.
// TEMPORÁRIO: substituir pelas capas reais em public/cursos/<slug>.png.
const TEMP_COVER = '/imagens/imagemPlataformaMobile.png';

// Proporção da capa — troque aqui (ex.: '16 / 9') quando as capas reais
// vierem em outro formato; único lugar que precisa mudar.
const COVER_ASPECT = '3 / 4';

// Largura de cada card: clamp(220px, 22vw, 380px) no desktop, ~78vw no
// mobile (era 62vw — pedido explícito de uma tarefa posterior: "um card
// principal centralizado, com uma pequena parte dos vizinhos aparecendo
// nas laterais" — 78vw deixa só uma fatia fina de cada vizinho visível,
// reforçando a leitura de "um card por vez"). Aplicada tanto no carrossel
// normal quanto na faixa `reduced-motion` (mesma largura nos dois, único
// lugar que precisa mudar se um dia for diferente).
const CARD_WIDTH_CLASSES = 'w-[78vw] md:w-[clamp(220px,22vw,380px)]';

const BREAKPOINT_MOBILE = 768; // mesmo breakpoint 'md' usado no resto do site pra decidir "é mobile" (ver HeroSection.tsx)
// DESKTOP_SPEED (pedido explícito de uma tarefa posterior — nome sugerido
// como exemplo; mantido em português pra bater com o resto do arquivo,
// mas é EXATAMENTE essa constante): era 40, +~60% = 65px/s.
const VELOCIDADE_DESKTOP_PX_S = 65;
const PERSPECTIVE_DESKTOP = 1200;
const TRANSLATE_Z_MAX_DESKTOP = 140;
const ROTATE_Y_MAX_DESKTOP = 22;
const N_LIMITE = 1.3;
// Constante de tempo (segundos) da suavização exponencial usada em TODA
// transição de velocidade/posição que não seja a aceleração inicial do
// desktop (pausa no hover, retomada depois de soltar o arrasto, saída de
// tela, E TAMBÉM o "deslizar" suave de um card pro outro no carrossel
// mobile, ver `passo()`) — alcança ~95% do alvo em 3x isso, ou seja,
// ~450ms; perto o bastante dos "~300-500ms" pedidos em cada um desses
// casos, com uma fórmula só.
const TAU_RAPIDO = 0.15;
const DURACAO_ACEL_ENTRADA_MS = 1000;
// Pequena variação de rotateZ por card (pedido explícito — "entre -1deg e
// 1deg, pra não parecer rígido"), cíclica: não precisa de um valor por
// card cadastrado à mão, só repete esse punhado em sequência. SÓ usada no
// desktop (o mobile não tem NENHUM efeito 3D — pedido explícito de uma
// tarefa posterior).
const ROTATE_Z_VARIACOES = [-1, 0.6, -0.4, 1, -0.7, 0.3, -0.2, 0.8];

// Carrossel mobile (pedido explícito de uma tarefa posterior — substituiu
// o efeito 3D contínuo por um avanço discreto, um card por vez):
const INTERVALO_AUTOAVANCO_MOBILE_MS = 3500; // troca de card a cada ~3.5s
const RETOMAR_APOS_ARRASTO_MS = 3500; // "alguns segundos" de folga antes do auto-avanço voltar, depois de soltar o arrasto
const LIMIAR_ARRASTO_RAPIDO_PXS = 400; // px/s — acima disso, um arrasto "rápido" pula pro próximo/anterior mesmo sem passar da metade do card
const LIMIAR_CANCELAR_CLIQUE_PX = 6; // pedido explícito — arrasto maior que isso cancela o clique que viria em seguida

const ICONE_POR_SLUG: Record<string, LucideIcon> = {
  'criacao-de-sites': Code,
  'desenvolvimento-pessoal': Sparkles,
  dropshipping: Truck,
  ecommerce: ShoppingCart,
  'edicao-de-videos': Video,
  financas: Wallet,
  'gestao-de-trafego': Megaphone,
  idiomas: Languages,
  'inteligencia-artificial': Brain,
  'marketing-digital': Megaphone,
  'milhas-aereas': Plane,
  'social-media': Share2,
  tiktok: Music2,
};
// Categoria real cujo nome não bate com nenhuma chave acima (o mapa foi
// feito pros 13 nichos conhecidos hoje — se um admin cadastrar uma
// categoria nova no painel, `categorias` muda e um nome novo pode chegar
// aqui) cai neste ícone genérico, em vez de quebrar.
const ICONE_PADRAO: LucideIcon = GraduationCap;

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3);
}

function clamp(valor: number, min: number, max: number) {
  return Math.min(max, Math.max(min, valor));
}

/**
 * Seção "Cursos" (id="cursos") — cabeçalho padrão do site (SectionHeader,
 * MESMOS tamanhos de qualquer outra seção, com um único botão "Ver planos"
 * levando à seção de planos) seguido de um carrossel em loop infinito com
 * autoplay. Nenhuma lib de carrossel/3D (nada de swiper.js/three.js):
 * só CSS transforms (perspective/translateZ/rotateY, sempre
 * compositor-only) + requestAnimationFrame.
 *
 * DOIS MOTORES DE MOVIMENTO diferentes, escolhidos a cada frame por
 * `ehMobileRef.current` (breakpoint 'md', mesmo do resto do site) —
 * pedido explícito de uma tarefa posterior (o mobile perdeu o efeito 3D
 * de vez, virou "um card por vez"):
 *
 * - DESKTOP: `posRef` cresce continuamente (`VELOCIDADE_DESKTOP_PX_S`),
 *   a fileira desliza sem parar, cada cartão recebe um transform 3D
 *   individual (perspective/translateZ/rotateY/rotateZ) recalculado a
 *   cada frame a partir da distância até o centro da janela.
 * - MOBILE: SEM efeito 3D nenhum (o loop de transform por cartão é
 *   pulado inteiro). `indiceMobileRef` guarda o card "alvo" (avança 1 a
 *   cada `INTERVALO_AUTOAVANCO_MOBILE_MS`, ou por arrasto/teclado);
 *   `posAlvoRef = indiceMobileRef * passoPx` é o destino, e `posRef`
 *   desliza suavemente até lá pela MESMA suavização exponencial
 *   (TAU_RAPIDO) usada em todo o resto do arquivo — não precisa de
 *   `transition` CSS separada, é só mais uma forma de mover a mesma
 *   variável que o desktop já move via velocidade.
 *
 * Os dois motores compartilham a MESMA técnica de loop infinito: a
 * fileira renderiza a lista duplicada (2 cópias, ver `cursosDuplicados`),
 * `posRef`/`indiceMobileRef` crescem sem limite reservado, e só quando
 * cruzam a marca de UMA volta completa (`larguraVoltaRef`/`cursos.length`)
 * é que sofrem um reset "invisível" (a 2ª cópia é pixel-idêntica à 1ª,
 * então subtrair uma volta inteira de tudo ao mesmo tempo não move nada
 * na tela).
 *
 * Cada CARTÃO tem dois wrappers: um externo (entrada — opacity/scale/
 * translateY/rotateX, controlado por CSS transition + classe, uma vez
 * só) e um interno (efeito 3D contínuo, SÓ no desktop — escrito direto
 * no DOM via ref a cada frame). Separar os dois evita que a transição
 * CSS de entrada e a escrita every-frame do rAF disputem a mesma
 * propriedade `transform` do mesmo elemento.
 *
 * Arrastar (Pointer Events, mouse e toque): no desktop, o offset segue o
 * ponteiro 1:1 e vira inércia ao soltar (decai com TAU_RAPIDO enquanto o
 * autoplay normal retoma); no mobile, o offset também segue o ponteiro
 * 1:1 durante o arrasto, mas ao soltar o carrossel SEMPRE assenta
 * (snap) no card mais próximo — ou no vizinho, se o arrasto foi rápido/
 * longo o bastante (`LIMIAR_ARRASTO_RAPIDO_PXS`) — e o auto-avanço só
 * volta depois de `RETOMAR_APOS_ARRASTO_MS`. Um arrasto maior que
 * `LIMIAR_CANCELAR_CLIQUE_PX` cancela o clique seguinte (nenhum link
 * dentro do card hoje, mas a salvaguarda já existe pra quando tiver).
 *
 * `prefers-reduced-motion`: nem o loop nem os transforms 3D rodam — a
 * fileira (só uma cópia da lista, sem duplicar pro loop) vira uma faixa
 * comum com `overflow-x-auto` + `scroll-snap` (arrasto/scroll NATIVO do
 * navegador — já é "só arrasto manual, sem auto-avanço" de graça),
 * cartões sem inclinação nenhuma; a entrada não anima (cards já nascem
 * no estado final).
 */
export default function CursosSection({ categorias }: { categorias: { id: string; nome: string }[] }) {
  const nomesNichos = categorias.length > 0 ? categorias.map((c) => c.nome) : NICHOS_FALLBACK;
  const totalNichos = nomesNichos.length;

  const cursos: Curso[] = useMemo(() => {
    // `base` nasce sem `image` (nenhuma capa real cadastrada aqui ainda) —
    // separado do `?? TEMP_COVER` de propósito: quando um curso ganhar
    // uma capa real (editar `image` aqui em cima), o fallback abaixo já
    // recua sozinho pra ela, sem precisar tocar em mais nada.
    const base: Curso[] = nomesNichos.map((nome) => ({ slug: slugify(nome), title: nome }));
    return base.map((curso) => ({ ...curso, image: curso.image ?? TEMP_COVER }));
  }, [nomesNichos]);
  // 2 cópias consecutivas — com 13 itens, uma cópia já cobre bem mais que
  // 2x a largura de qualquer janela real (mesmo em 2560px), então 2
  // cópias bastam pro loop nunca "ficar sem cartão" enquanto a posição
  // transita dentro de uma volta. A 2ª cópia é só visual (aria-hidden).
  const cursosDuplicados = useMemo(() => [...cursos, ...cursos], [cursos]);

  const [montado, setMontado] = useState(false);
  const [reduzido, setReduzido] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const [imagensComErro, setImagensComErro] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const cardInternoRefs = useRef<(HTMLDivElement | null)[]>([]);

  const posRef = useRef(0); // px acumulados da fileira (desktop: cresce contínuo; mobile: "persegue" posAlvoRef)
  const posAlvoRef = useRef(0); // SÓ mobile — destino de `posRef` (indiceMobileRef * passoPx)
  const indiceMobileRef = useRef(0); // SÓ mobile — índice "lógico" do card alvo, cresce sem limite (ver reset de 1 volta, no passo())
  const proximoAvancoMobileRef = useRef(0); // SÓ mobile — timestamp (performance.now()) do próximo auto-avanço permitido
  const larguraVoltaRef = useRef(0); // largura de 1 cópia da lista (px) — recalculada em resize/mount
  const multiplicadorAtualRef = useRef(0); // 0..1, suavizado a cada frame em direção ao alvo
  const multiplicadorAlvoRef = useRef(1);
  const inerciaVelRef = useRef(0); // px/s "extra" deixado pelo arrasto no DESKTOP, decaindo até 0
  const entradaInicioRef = useRef<number | null>(null);
  const ultimoFrameRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const ehMobileRef = useRef(false);
  const visivelRef = useRef(false);
  const abaOcultaRef = useRef(false);
  const entradaDisparadaRef = useRef(false);

  const arrastandoRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const ultimoPointerXRef = useRef(0);
  const ultimoPointerTempoRef = useRef(0);
  const distanciaArrastoRef = useRef(0); // soma de |deltaX| do arrasto atual — pra cancelar o clique seguinte (item 6) e decidir "arrasto rápido" no mobile
  const velocidadeArrastoRef = useRef(0); // px/s do último trecho do arrasto — usada só na hora de soltar, pra decidir snap no mobile

  useEffect(() => {
    setMontado(true);
    setReduzido(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // Recalcula alvo do multiplicador de velocidade sempre que qualquer um
  // destes 3 fatores muda (hover é tratado à parte, via handlers — não
  // precisa de estado React pra isso, só grava direto no ref). Vale pros
  // DOIS motores (desktop e mobile) — o mobile só tenta auto-avançar
  // quando este multiplicador está perto de 1 (ver passo()).
  const atualizarAlvo = useCallback(() => {
    multiplicadorAlvoRef.current = pausado || !visivelRef.current || abaOcultaRef.current ? 0 : 1;
  }, [pausado]);

  useEffect(() => {
    atualizarAlvo();
  }, [atualizarAlvo]);

  // Visibilidade da SEÇÃO (pausa contínua fora de tela) + disparo ÚNICO da
  // animação de entrada (threshold 0.25) — um observer só, dois efeitos.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visivelRef.current = entry.isIntersecting;
        atualizarAlvo();
        if (!entradaDisparadaRef.current && entry.intersectionRatio >= 0.25) {
          entradaDisparadaRef.current = true;
          if (reduzido) {
            setEntrando(true);
          } else {
            entradaInicioRef.current = performance.now();
            setEntrando(true);
          }
        }
      },
      { threshold: [0, 0.25] }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduzido]);

  // Aba oculta — pausa o autoplay (pedido explícito), sem depender de a
  // seção estar ou não visível (as duas condições se somam no `atualizarAlvo`).
  useEffect(() => {
    function aoMudarVisibilidade() {
      abaOcultaRef.current = document.hidden;
      atualizarAlvo();
    }
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    return () => document.removeEventListener('visibilitychange', aoMudarVisibilidade);
  }, [atualizarAlvo]);

  // Mede a largura de UMA volta (a lista original, não duplicada) e se a
  // largura da janela está abaixo do breakpoint mobile — refeito no
  // mount e em todo resize, nunca hardcoded. Também detecta a TROCA entre
  // mobile/desktop (os dois motores usam `posRef` com semânticas
  // diferentes — contínuo vs. por índice — então cruzar o breakpoint
  // zera tudo pra não herdar um valor sem sentido do motor anterior).
  useEffect(() => {
    if (reduzido) return; // sem loop/duplicação no reduced-motion — nada pra medir

    function medir() {
      const novoMobile = window.innerWidth < BREAKPOINT_MOBILE;
      if (novoMobile !== ehMobileRef.current) {
        ehMobileRef.current = novoMobile;
        posRef.current = 0;
        posAlvoRef.current = 0;
        indiceMobileRef.current = 0;
        proximoAvancoMobileRef.current = performance.now() + INTERVALO_AUTOAVANCO_MOBILE_MS;
        if (trackRef.current) trackRef.current.style.transform = 'translate3d(0px, 0, 0)';
      }

      const metade = cardInternoRefs.current.length / 2;
      if (metade === 0) return;
      // Largura de 1 volta = posição inicial do primeiro card da 2ª cópia
      // (índice `metade`) menos a posição do primeiro card da 1ª cópia —
      // mede o espaço real ocupado por uma cópia inteira, gap incluído,
      // sem precisar somar largura+gap de cada card manualmente. Sobe DOIS
      // níveis a partir do ref (que aponta pro wrapper 3D interno):
      // wrapper 3D -> wrapper de entrada -> item de fato posicionado pelo
      // `flex` da fileira (o único cujo offsetLeft reflete a posição real
      // dele na fileira).
      const primeiro = cardInternoRefs.current[0]?.parentElement?.parentElement;
      const primeiroDaSegundaCopia = cardInternoRefs.current[metade]?.parentElement?.parentElement;
      if (primeiro && primeiroDaSegundaCopia) {
        larguraVoltaRef.current = primeiroDaSegundaCopia.offsetLeft - primeiro.offsetLeft;
      }
    }
    medir();
    window.addEventListener('resize', medir, { passive: true });
    return () => window.removeEventListener('resize', medir);
  }, [cursosDuplicados.length, reduzido]);

  // Loop principal — só roda se montado, sem reduced-motion e a lista não
  // estiver vazia (nunca deveria, mas é uma checagem barata).
  useEffect(() => {
    if (!montado || reduzido || cursosDuplicados.length === 0) return;

    function passo(agora: number) {
      rafRef.current = requestAnimationFrame(passo);

      if (ultimoFrameRef.current === null) ultimoFrameRef.current = agora;
      const dt = Math.min(0.05, (agora - ultimoFrameRef.current) / 1000); // clamp: aba minimizada/voltando não gera um "salto" gigante
      ultimoFrameRef.current = agora;

      const larguraVolta = larguraVoltaRef.current;
      if (larguraVolta <= 0) return;

      // Suaviza o multiplicador de velocidade em direção ao alvo (hover/
      // pausa/visibilidade) — exponencial, independente de frame rate.
      // Vale pros dois motores.
      const fatorSuavizacao = 1 - Math.exp(-dt / TAU_RAPIDO);
      multiplicadorAtualRef.current += (multiplicadorAlvoRef.current - multiplicadorAtualRef.current) * fatorSuavizacao;

      if (ehMobileRef.current) {
        // ---------------- MOTOR MOBILE — um card por vez, sem 3D ----------------
        const passoPx = larguraVolta / cursos.length;

        if (!arrastandoRef.current) {
          // Auto-avanço: só dispara quando o multiplicador já está quase
          // todo "ligado" (não pausado/oculto/fora de tela) E já passou
          // do horário agendado (proximoAvancoMobileRef — também usado
          // pra segurar o retorno "alguns segundos" depois de um arrasto,
          // ver aoSoltarPonteiro).
          if (multiplicadorAtualRef.current > 0.5 && agora >= proximoAvancoMobileRef.current) {
            indiceMobileRef.current += 1;
            posAlvoRef.current = indiceMobileRef.current * passoPx;
            proximoAvancoMobileRef.current = agora + INTERVALO_AUTOAVANCO_MOBILE_MS;
          }
          // Desliza suavemente até o alvo (mesma suavização exponencial
          // do resto do arquivo) — nenhuma `transition` CSS entra aqui,
          // é só mais um jeito de mover a mesma `posRef` que o desktop
          // move via velocidade constante.
          posRef.current += (posAlvoRef.current - posRef.current) * fatorSuavizacao;
        }

        // Reset "invisível" de 1 volta completa: quando o índice cruza pro
        // fim da 2ª cópia, volta pro equivalente na 1ª — só quando o
        // deslize já ASSENTOU no alvo (senão o reset aconteceria no meio
        // de uma transição visível).
        if (indiceMobileRef.current >= cursos.length && Math.abs(posAlvoRef.current - posRef.current) < 0.5) {
          indiceMobileRef.current -= cursos.length;
          posAlvoRef.current -= larguraVolta;
          posRef.current -= larguraVolta;
        }

        if (trackRef.current) trackRef.current.style.transform = `translate3d(${-posRef.current}px, 0, 0)`;
        // SEM efeito 3D nenhum no mobile (pedido explícito) — o loop de
        // transform por cartão, mais abaixo, é só pro desktop.
        return;
      }

      // ---------------- MOTOR DESKTOP — fileira contínua + 3D ----------------
      // Progresso da aceleração inicial (fase 3 da entrada) — cronometrado
      // uma vez só, nunca reinicia.
      let progressoEntrada = 1;
      if (entradaInicioRef.current !== null) {
        const t = Math.min(1, (agora - entradaInicioRef.current) / DURACAO_ACEL_ENTRADA_MS);
        progressoEntrada = easeOutCubic(t);
      }

      if (!arrastandoRef.current) {
        const velocidadeAutoplay = VELOCIDADE_DESKTOP_PX_S * progressoEntrada * multiplicadorAtualRef.current;
        posRef.current += (velocidadeAutoplay + inerciaVelRef.current) * dt;
        // Inércia decai até 0 com a mesma constante de tempo do resto.
        inerciaVelRef.current += (0 - inerciaVelRef.current) * fatorSuavizacao;
      }

      // Normaliza pra dentro de [0, larguraVolta) — módulo que também
      // funciona pra valores negativos (arrasto pra trás).
      posRef.current = ((posRef.current % larguraVolta) + larguraVolta) % larguraVolta;

      if (trackRef.current) {
        trackRef.current.style.transform = `translate3d(${-posRef.current}px, 0, 0)`;
      }

      // Efeito 3D por cartão — lê a posição JÁ COM a translação da
      // fileira acima aplicada (getBoundingClientRect reflete o transform
      // recém-escrito). Só 1 leitura de geometria por cartão por frame
      // (a largura sai da mesma leitura, via rect.width — não precisa de
      // um cache à parte só pra isso).
      const larguraJanela = window.innerWidth;
      const centroJanela = larguraJanela / 2;

      for (let i = 0; i < cardInternoRefs.current.length; i++) {
        const el = cardInternoRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const centroCard = rect.left + rect.width / 2;
        const n = clamp((centroCard - centroJanela) / (larguraJanela / 2), -N_LIMITE, N_LIMITE);
        const translateZ = Math.pow(Math.abs(n), 2) * TRANSLATE_Z_MAX_DESKTOP;
        const rotateY = n * -ROTATE_Y_MAX_DESKTOP;
        const rotateZ = ROTATE_Z_VARIACOES[i % ROTATE_Z_VARIACOES.length];
        el.style.transform = `perspective(${PERSPECTIVE_DESKTOP}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
      }
    }

    rafRef.current = requestAnimationFrame(passo);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      ultimoFrameRef.current = null;
    };
  }, [montado, reduzido, cursosDuplicados.length]);

  // Hover (desktop) — pausa suave enquanto o ponteiro está sobre o
  // carrossel. `ehMobileRef` também cobre "tablet/mobile", onde hover não
  // existe de verdade (touch dispara mouseenter/leave de forma
  // inconsistente entre navegadores) — por segurança, só aplica a pausa
  // por hover se NÃO for mobile. Nenhuma pausa NOVA adicionada aqui
  // (pedido explícito) — este comportamento já existia antes.
  function aoEntrarMouse() {
    if (ehMobileRef.current) return;
    multiplicadorAlvoRef.current = 0;
  }
  function aoSairMouse() {
    if (ehMobileRef.current) return;
    if (!pausado) atualizarAlvo();
  }

  // Arrastar — mouse ou toque, via Pointer Events (unifica os dois).
  function aoPressionarPonteiro(e: React.PointerEvent) {
    arrastandoRef.current = true;
    pointerIdRef.current = e.pointerId;
    ultimoPointerXRef.current = e.clientX;
    ultimoPointerTempoRef.current = performance.now();
    inerciaVelRef.current = 0;
    velocidadeArrastoRef.current = 0;
    distanciaArrastoRef.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function aoMoverPonteiro(e: React.PointerEvent) {
    if (!arrastandoRef.current || e.pointerId !== pointerIdRef.current) return;
    const agora = performance.now();
    const deltaX = e.clientX - ultimoPointerXRef.current;
    const deltaT = Math.max(0.001, (agora - ultimoPointerTempoRef.current) / 1000);
    // Arrastar pra esquerda (deltaX negativo) avança a fileira (mesma
    // direção do autoplay) — no mobile, escreve direto em `posRef`
    // (posAlvoRef fica pra trás até soltar — ver aoSoltarPonteiro, que
    // recalcula os dois a partir de onde o dedo deixou).
    posRef.current -= deltaX;
    distanciaArrastoRef.current += Math.abs(deltaX);
    // Suaviza a estimativa de velocidade (evita que um único frame de
    // mouse "trêmulo" vire um arremesso exagerado) — usada tanto pra
    // inércia (desktop) quanto pra decidir "arrasto rápido" (mobile).
    const velInstantanea = -deltaX / deltaT;
    velocidadeArrastoRef.current = velocidadeArrastoRef.current * 0.5 + velInstantanea * 0.5;
    inerciaVelRef.current = velocidadeArrastoRef.current;
    ultimoPointerXRef.current = e.clientX;
    ultimoPointerTempoRef.current = agora;
  }
  function aoSoltarPonteiro(e: React.PointerEvent) {
    if (e.pointerId !== pointerIdRef.current) return;
    arrastandoRef.current = false;
    pointerIdRef.current = null;

    if (ehMobileRef.current) {
      // Snap pro card mais próximo — ou pro vizinho, se o arrasto foi
      // rápido o bastante (pedido explícito: "um arrasto rápido ou longo
      // vai para o próximo/anterior"), mesmo sem ter passado da metade.
      const passoPx = larguraVoltaRef.current / cursos.length;
      if (passoPx > 0) {
        const indiceContinuo = posRef.current / passoPx;
        let indiceAlvo = Math.round(indiceContinuo);
        const rapidoDemais = Math.abs(velocidadeArrastoRef.current) > LIMIAR_ARRASTO_RAPIDO_PXS;
        if (rapidoDemais) {
          // Arremesso rápido: garante que avança PELO MENOS 1 card na
          // direção do gesto, mesmo que o arredondamento acima tenha
          // ficado no mesmo índice de onde começou.
          const direcao = velocidadeArrastoRef.current > 0 ? 1 : -1;
          const indiceInicio = Math.round(posAlvoRef.current / passoPx);
          if (indiceAlvo === indiceInicio) indiceAlvo = indiceInicio + direcao;
        }
        indiceMobileRef.current = indiceAlvo;
        posAlvoRef.current = indiceAlvo * passoPx;
      }
      // "Retoma alguns segundos depois de soltar" (pedido explícito) —
      // empurra o próximo auto-avanço pra frente, em vez de retomar na
      // hora.
      proximoAvancoMobileRef.current = performance.now() + RETOMAR_APOS_ARRASTO_MS;
    } else {
      atualizarAlvo();
    }
  }

  // Cancela o clique seguinte se o arrasto passou do limiar (pedido
  // explícito, item 6) — capture-phase: intercepta ANTES do clique chegar
  // em qualquer link/botão real que um card venha a ter no futuro (hoje
  // nenhum card tem link próprio, mas a salvaguarda já fica pronta).
  function aoClicarCapturado(e: React.MouseEvent) {
    if (distanciaArrastoRef.current > LIMIAR_CANCELAR_CLIQUE_PX) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // Setas do teclado, com o carrossel focado. Mobile: avança/volta 1 card
  // (mesmo "motor" do auto-avanço — só muda o índice/alvo). Desktop: nudge
  // livre em `posRef` (não precisa ser exato — é só um atalho, o
  // arrasto/autoplay continuam sendo o mecanismo principal).
  function aoTeclar(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const direcao = e.key === 'ArrowRight' ? 1 : -1;
    if (ehMobileRef.current) {
      const passoPx = larguraVoltaRef.current / cursos.length;
      indiceMobileRef.current += direcao;
      posAlvoRef.current = indiceMobileRef.current * passoPx;
      proximoAvancoMobileRef.current = performance.now() + RETOMAR_APOS_ARRASTO_MS;
    } else {
      posRef.current += 300 * direcao;
    }
  }

  function marcarErroImagem(slug: string) {
    setImagensComErro((prev) => {
      if (prev.has(slug)) return prev;
      const proximo = new Set(prev);
      proximo.add(slug);
      return proximo;
    });
  }

  return (
    // py-16 lg:py-24 — MESMO ritmo vertical que NumerosSection.tsx já usa
    // (`<Container className="py-16 lg:py-24">`, o padrão real do site).
    // Aplicado no wrapper MAIS externo (não só no Container do
    // cabeçalho): cobre o respiro tanto ACIMA do cabeçalho quanto ABAIXO
    // do carrossel (que é full-bleed, fora do Container) — um <Container>
    // sozinho só teria dado o respiro de cima.
    <div className="py-16 lg:py-24">
      <Container>
        {/* Um ÚNICO botão "Ver planos" (pedido explícito — era o par
            "Criar minha conta grátis"/"Já tenho conta") — âncora pra
            #planos (id real da seção de planos, LandingPageClient.tsx),
            MESMO mecanismo de rolagem suave + offset do menu que o
            "Saiba mais" da seção de números já usa (SectionHeader.tsx,
            BotaoAcao detecta o "#" e chama scrollSuaveParaSecao). Sem
            `actions.secondary`: SectionHeader só renderiza o primário. */}
        <SectionHeader
          eyebrow="Explore os [[cursos]]"
          title="Encontre o [[curso]] ideal para você"
          description={`Cursos gravados em ${totalNichos} nichos para você começar pelo assunto que mais faz sentido para o seu momento.`}
          align="center"
          actions={{ primary: { label: 'Ver planos', href: '#planos' } }}
        />
      </Container>

      {/* Viewport do carrossel — largura TOTAL da janela (fora do
          Container acima, de propósito: nenhum max-w/px envolvendo este
          div, então ele herda 100% da largura do <main>, sem nenhum
          truque de "sangria" com margin negativo — a seção em si não tem
          padding lateral nenhum, ver LandingPageClient.tsx).
          `overflow-x-clip`: os cards das PONTAS crescem visualmente em
          cima do efeito 3D (só desktop), e `overflow-hidden` cortava esse
          crescimento em cima/embaixo; `overflow-x-clip` recorta só o eixo
          horizontal — nada de scroll horizontal na página — deixando o Y
          livre. mask-image (WebkitMask pro Safari) esmaece as duas pontas
          horizontais pra um fade suave em vez de um corte seco —
          independe do overflow, continua funcionando igual. */}
      <div
        ref={containerRef}
        role="region"
        aria-roledescription="carrossel"
        aria-label="Cursos disponíveis"
        tabIndex={0}
        onKeyDown={aoTeclar}
        onClickCapture={reduzido ? undefined : aoClicarCapturado}
        className={cn(
          'relative mt-10 select-none py-8 outline-none focus-visible:ring-2 focus-visible:ring-primary/60 md:mt-14',
          reduzido ? 'overflow-x-auto' : 'overflow-x-clip',
          !reduzido && montado && 'cursor-grab active:cursor-grabbing'
        )}
        style={
          reduzido
            ? undefined
            : {
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
                maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
                touchAction: 'pan-y',
              }
        }
        onMouseEnter={aoEntrarMouse}
        onMouseLeave={aoSairMouse}
        onPointerDown={reduzido ? undefined : aoPressionarPonteiro}
        onPointerMove={reduzido ? undefined : aoMoverPonteiro}
        onPointerUp={reduzido ? undefined : aoSoltarPonteiro}
        onPointerCancel={reduzido ? undefined : aoSoltarPonteiro}
      >
        {/* Fileira — no modo normal, a posição é 100% controlada pelo rAF
            (transform escrito via ref, nunca via state/className) e por
            isso não precisa de nenhuma classe de posicionamento aqui além
            de `flex`. No reduced-motion, vira uma faixa comum com scroll
            nativo + snap (pedido explícito) — só 1 cópia da lista, sem
            duplicar (não existe loop pra "costurar" ali). */}
        <div
          ref={trackRef}
          className={cn(
            'flex w-max gap-6 md:gap-10',
            reduzido && 'snap-x snap-mandatory overflow-x-auto scroll-px-4 px-4 pb-2'
          )}
        >
          {(reduzido ? cursos : cursosDuplicados).map((curso, i) => {
            const Icone = ICONE_POR_SLUG[curso.slug] ?? ICONE_PADRAO;
            const temImagem = !!curso.image && !imagensComErro.has(curso.slug);
            // Só a 2ª metade (cópia duplicada) é decorativa pra leitor de
            // tela — a 1ª continua navegável normalmente.
            const decorativo = !reduzido && i >= cursos.length;

            return (
              <div
                key={`${curso.slug}-${i}`}
                aria-hidden={decorativo || undefined}
                className={cn('shrink-0', CARD_WIDTH_CLASSES, reduzido && 'snap-center')}
              >
                {/* WRAPPER EXTERNO — animação de ENTRADA (fase 1, "placas"
                    vazias aparecendo): opacity/scale/translateY/rotateX,
                    transição CSS comum (nunca tocada pelo rAF). Stagger de
                    70ms por índice — usa `i % cursos.length` pra a 2ª
                    cópia repetir o MESMO atraso da 1ª (senão a cópia
                    inteira "atrasaria" tudo de novo, criando uma entrada
                    visualmente estranha do meio da fileira em diante). */}
                <div
                  className="transition-[opacity,transform] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]"
                  style={{
                    transitionDelay: reduzido ? undefined : `${(i % cursos.length) * 70}ms`,
                    opacity: reduzido || entrando ? 1 : 0,
                    transform:
                      reduzido || entrando
                        ? 'perspective(800px) scale(1) translateY(0px) rotateX(0deg)'
                        : 'perspective(800px) scale(0.85) translateY(40px) rotateX(15deg)',
                  }}
                >
                  {/* WRAPPER INTERNO — efeito 3D CONTÍNUO (SÓ desktop,
                      perspective/translateZ/rotateY/rotateZ), escrito a
                      cada frame pelo rAF via ref (cardInternoRefs) — nunca
                      por classe/state React; no mobile este elemento
                      nunca recebe transform nenhum (o loop de rAF pula a
                      escrita inteira, ver `passo()`), então fica
                      "reto" (sem perspective/rotateY/translateZ),
                      exatamente igual em qualquer card. Sem NENHUM
                      hover: de cor/elevação (removido — pedido explícito
                      de uma tarefa posterior: "o card deve ficar igual
                      com e sem mouse em cima"). will-change +
                      backface-visibility: hidden evitam flicker/
                      serrilhado durante a rotação 3D em alguns
                      navegadores (desktop). */}
                  <div
                    ref={(el) => {
                      cardInternoRefs.current[i] = el;
                    }}
                    className="relative overflow-hidden rounded-2xl border border-black/10 bg-gray-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.15),0_24px_48px_-12px_rgba(0,0,0,0.25)] dark:border-white/10 dark:bg-[#161616] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5),0_24px_48px_-12px_rgba(0,0,0,0.6)]"
                    style={{
                      // width: 100% — preenche o pai (que TEM largura de
                      // verdade, via CARD_WIDTH_CLASSES no item da
                      // fileira, acima) pra o `aspectRatio` abaixo ter uma
                      // base de cálculo.
                      width: '100%',
                      aspectRatio: COVER_ASPECT,
                      willChange: reduzido ? undefined : 'transform',
                      backfaceVisibility: 'hidden',
                    }}
                  >
                    {/* Realce sutil no topo (brilho, simula a "espessura"
                        do card junto com a sombra em camadas acima). */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/[0.08] to-transparent dark:from-white/[0.06]"
                    />

                    {/* Shimmer — só antes do conteúdo "carregar" (fase 2
                        da entrada), nunca com reduced-motion. */}
                    {!reduzido && !entrando && (
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 animate-[shimmer-sweep_1.6s_linear_infinite] bg-[length:200%_100%] bg-[linear-gradient(100deg,transparent_30%,rgba(255,255,255,0.14)_50%,transparent_70%)] dark:bg-[linear-gradient(100deg,transparent_30%,rgba(255,255,255,0.08)_50%,transparent_70%)]"
                      />
                    )}

                    {/* Conteúdo — fase 2 da entrada (fade + blur),
                        stagger 80ms, começando ~300ms depois da fase 1. */}
                    <div
                      className="absolute inset-0 transition-[opacity,filter] duration-[600ms] ease-out"
                      style={{
                        transitionDelay: reduzido ? undefined : `${300 + (i % cursos.length) * 80}ms`,
                        opacity: reduzido || entrando ? 1 : 0,
                        filter: reduzido || entrando ? 'blur(0px)' : 'blur(14px)',
                      }}
                    >
                      {temImagem ? (
                        // priority só nos primeiros cards (pedido
                        // explícito — "apenas nos primeiros cards
                        // visíveis"): `i < 6` cobre o que já nasce visível
                        // em qualquer largura real. `priority`/
                        // `loading="lazy"` são MUTUAMENTE EXCLUSIVOS no
                        // next/image — nunca os dois juntos. draggable=
                        // {false} (pedido explícito, item 6): o navegador
                        // não inicia o arrasto NATIVO de imagem por cima
                        // do nosso arrasto via Pointer Events.
                        <Image
                          src={curso.image!}
                          alt={curso.title}
                          fill
                          sizes="(max-width: 768px) 78vw, clamp(220px, 22vw, 380px)"
                          priority={i < 6}
                          loading={i < 6 ? undefined : 'lazy'}
                          draggable={false}
                          className="object-cover"
                          onError={() => marcarErroImagem(curso.slug)}
                        />
                      ) : (
                        // Card PROVISÓRIO (sem capa real ainda): degradê
                        // escuro com brilho vermelho + ícone linear do
                        // nicho, centralizado, e o nome do curso em baixo
                        // sobre outro degradê (legibilidade garantida em
                        // qualquer cor de fundo).
                        <div className="relative flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(ellipse_120%_80%_at_50%_20%,#2a1414_0%,#161616_60%)]">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 shadow-[0_0_36px_-6px_rgba(229,9,20,0.6)] sm:h-20 sm:w-20">
                            <Icone className="h-8 w-8 text-primary sm:h-10 sm:w-10" strokeWidth={1.5} aria-hidden="true" />
                          </div>
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-4 pt-10">
                            <p className="text-center text-sm font-semibold leading-snug text-white sm:text-base">{curso.title}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Botão pausar/retomar — só existe fora do reduced-motion (nada
            de autoplay pra pausar naquele modo). Canto inferior direito
            do VIEWPORT (não da janela — `absolute` dentro do container
            `relative` acima). No mobile, pausar este botão TAMBÉM para o
            auto-avanço (pedido explícito) — já é o caso, porque o mobile
            olha pro MESMO `multiplicadorAtualRef` que esse botão controla
            via `pausado`/`atualizarAlvo`, nenhuma lógica nova precisou
            ser criada. */}
        {!reduzido && (
          <button
            type="button"
            onClick={() => setPausado((v) => !v)}
            aria-label={pausado ? 'Retomar o carrossel' : 'Pausar o carrossel'}
            aria-pressed={pausado}
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 dark:bg-white/10 dark:hover:bg-white/20"
          >
            {pausado ? <Play size={16} /> : <Pause size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}
