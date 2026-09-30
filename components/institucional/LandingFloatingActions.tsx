'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, MessageCircle, X } from 'lucide-react';
import { buildSupportWhatsappLink, cn, scrollSuaveParaSecao } from '@/lib/utils';

// Raio/circunferência do anel de progresso (botão "voltar ao topo") — SVG
// fixo 56x56 (MESMO tamanho do botão de suporte, pedido explícito desta
// tarefa — item 6, era 40x40/h-11 w-11, menor que o de suporte), raio 24
// (deixa ~4px de folga pro stroke de 3 não cortar a borda do círculo).
// circunferência = 2πr, usada tanto no strokeDasharray (comprimento total
// do traço) quanto no strokeDashoffset (quanto desse traço fica
// "escondido", ou seja, o inverso do progresso).
const RAIO = 24;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

// easeInOutCubic — usado pela animação de scroll própria (ver rolarAoTopo,
// abaixo): acelera no início e desacelera no fim, sem o "arranque seco" de
// um scroll linear.
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Botões fixos no canto inferior direito (z-40 — abaixo do header, z-50,
 * que ainda deve vencer se algum dia se sobrepuserem):
 *
 * - "Voltar ao topo": só aparece depois de rolar ~300px (fade), tem um
 *   anel de progresso (SVG stroke-dasharray) mostrando quanto da página já
 *   foi rolado, e leva de volta ao topo com uma animação própria (ver
 *   rolarAoTopo, abaixo) — SÓ depende da posição de scroll, nunca do
 *   estado do pop-up (bug relatado nesta tarefa: uma instrução de uma
 *   tarefa anterior escondia este botão enquanto o pop-up estava aberto;
 *   essa regra saiu — os dois ficam sempre empilhados, voltar ao topo em
 *   cima).
 * - "Suporte": sempre visível, vermelho (mais em destaque), abre/fecha o
 *   pop-up de ajuda.
 *
 * Os dois botões formam um grupo PRÓPRIO (gap-3, ~12px fixo entre eles); o
 * pop-up fica fora do fluxo (position: absolute, `bottom-full` do grupo —
 * ancorado acima dos DOIS botões, `right-0` pra alinhar a borda direita,
 * `mb-3` de folga) e nunca empurra/cobre nenhum dos dois, aberto ou
 * fechado. Fechado, fica invisible+pointer-events-none (não reserva
 * espaço nem intercepta clique).
 *
 * `numeroWhatsapp` vem do servidor (app/page.tsx busca em
 * `configuracoes`, MESMA coluna usada em todo o resto da plataforma —
 * ver /suporte) — nenhum número novo inventado aqui.
 */
export default function LandingFloatingActions({ numeroWhatsapp }: { numeroWhatsapp: string | null }) {
  const [progresso, setProgresso] = useState(0); // 0-100
  const [mostrarTopo, setMostrarTopo] = useState(false);
  const [popupAberto, setPopupAberto] = useState(false);
  // Guarda o id do requestAnimationFrame em curso — permite cancelar a
  // animação de "voltar ao topo" (ver rolarAoTopo) se o usuário interagir
  // com a página no meio do caminho (scroll/toque/teclado, pedido
  // explícito desta tarefa).
  const animacaoRef = useRef<number | null>(null);

  // BUG encontrado numa tarefa anterior: o aviso de cookies
  // (CookieConsentBanner.tsx, sitewide, canto inferior direito, z-[9999] —
  // o mais alto da plataforma, de propósito, por exigência legal/LGPD)
  // ocupa exatamente o mesmo canto que estes botões flutuantes — na
  // primeira visita (antes de aceitar/rejeitar), clicar em "Suporte" na
  // verdade clicava por baixo do card de cookies. Observa se o card do
  // aviso está no DOM (ele desmonta sozinho ao aceitar/rejeitar, ver
  // CookieConsentBanner.tsx) e sobe os botões enquanto ele existir.
  const [avisoCookiesVisivel, setAvisoCookiesVisivel] = useState(false);
  useEffect(() => {
    function medir() {
      setAvisoCookiesVisivel(!!document.querySelector('[aria-label="Consentimento de cookies"]'));
    }
    medir();
    const observer = new MutationObserver(medir);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function medir() {
      const alturaTotal = document.documentElement.scrollHeight - window.innerHeight;
      const pct = alturaTotal > 0 ? (window.scrollY / alturaTotal) * 100 : 0;
      setProgresso(Math.min(100, Math.max(0, pct)));
      setMostrarTopo(window.scrollY > 300);
    }
    medir();
    window.addEventListener('scroll', medir, { passive: true });
    window.addEventListener('resize', medir);
    return () => {
      window.removeEventListener('scroll', medir);
      window.removeEventListener('resize', medir);
    };
  }, []);

  // Fecha o pop-up com ESC (clicar fora não precisa de listener próprio
  // agora — sem `absolute`, o pop-up é só mais um item do fluxo normal,
  // clicar em QUALQUER lugar fora dele já não faz nada por padrão; ESC
  // continua sendo o único atalho de teclado que precisa de handler).
  useEffect(() => {
    if (!popupAberto) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setPopupAberto(false);
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [popupAberto]);

  const whatsappLink = numeroWhatsapp
    ? buildSupportWhatsappLink(numeroWhatsapp, 'Olá, vim pelo site e preciso de ajuda.')
    : null;

  // Cancela a animação em andamento (ver rolarAoTopo) — chamado tanto por
  // ela mesma ao terminar quanto pelos listeners de interação abaixo.
  function cancelarAnimacao() {
    if (animacaoRef.current !== null) {
      cancelAnimationFrame(animacaoRef.current);
      animacaoRef.current = null;
    }
  }

  // Animação de scroll PRÓPRIA (pedido explícito desta tarefa) — não
  // depende de `window.scrollTo({ behavior: 'smooth' })`: além do
  // navegador poder ignorar/atenuar esse comportamento (ex.: usuário com
  // scroll-behavior customizado, alguma extensão, ou simplesmente uma
  // implementação "instantânea" em navegadores mais antigos), assim fica
  // garantido o mesmo easing/duração em qualquer lugar. 900-1200ms com
  // easeInOutCubic: acelera saindo, desacelera chegando no topo — não é
  // scroll linear.
  //
  // `prefers-reduced-motion`: pula direto pro topo sem animação (pedido
  // explícito). Cancela se o usuário interagir durante o movimento (roda o
  // mouse, toca a tela ou usa o teclado) — sinal de que ele queria assumir
  // o controle do scroll de novo, não brigar com uma animação em curso.
  function rolarAoTopo() {
    cancelarAnimacao();

    const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const origem = window.scrollY;
    if (reduzMovimento || origem === 0) {
      window.scrollTo(0, 0);
      return;
    }

    const duracao = 1000;
    const inicio = performance.now();

    // wheel/touchmove/keydown (setas, Page Up/Down, Home/End, Espaço) —
    // qualquer sinal de que o usuário está tentando rolar por conta
    // própria cancela o rAF em curso E remove os três listeners (só disparam
    // uma vez por animação — sem isso ficariam presos ouvindo pra sempre
    // depois de uma interrupção).
    function cancelarPorInteracao() {
      cancelarAnimacao();
      limparListeners();
    }
    function limparListeners() {
      window.removeEventListener('wheel', cancelarPorInteracao);
      window.removeEventListener('touchmove', cancelarPorInteracao);
      window.removeEventListener('keydown', cancelarPorInteracao);
    }
    window.addEventListener('wheel', cancelarPorInteracao, { passive: true });
    window.addEventListener('touchmove', cancelarPorInteracao, { passive: true });
    window.addEventListener('keydown', cancelarPorInteracao);

    function passo(agora: number) {
      const decorrido = agora - inicio;
      const t = Math.min(1, decorrido / duracao);
      window.scrollTo(0, Math.round(origem * (1 - easeInOutCubic(t))));

      if (t < 1) {
        animacaoRef.current = requestAnimationFrame(passo);
      } else {
        animacaoRef.current = null;
        limparListeners();
      }
    }

    animacaoRef.current = requestAnimationFrame(passo);
  }

  // Limpa qualquer rAF pendente se o componente desmontar no meio da
  // animação (nunca deveria acontecer nesta página de seção única, mas é
  // o padrão correto pra um efeito com requestAnimationFrame).
  useEffect(() => cancelarAnimacao, []);

  return (
    <div
      className={cn('fixed right-6 z-40 transition-all duration-300', avisoCookiesVisivel ? 'bottom-72' : 'bottom-6')}
    >
      {/* Grupo dos dois botões — `relative` só pra ancorar o pop-up
          (absolute, ver abaixo) a ele; items-end alinha os dois botões
          circulares pela borda direita (idênticos, não faz diferença hoje,
          mas mantém o padrão caso um dia um deles mude de largura). gap-3
          (~12px, pedido explícito) — FIXO, nunca muda com o pop-up
          abrindo/fechando, já que o pop-up não é mais item deste flex. */}
      <div className="relative flex flex-col items-end gap-3">
        {/* Botão "voltar ao topo" — fade in/out via opacity (nunca sai do
            DOM: manter montado evita remontar o SVG a cada 300px
            cruzado). SÓ depende de `mostrarTopo` (posição de scroll) —
            pedido explícito desta tarefa: NÃO some mais quando o pop-up
            está aberto (era `mostrarTopo && !popupAberto`); o pop-up nasce
            ACIMA dos dois botões (bottom-full do grupo), então não precisa
            escondê-lo pra não cobrir. */}
        <button
          type="button"
          onClick={rolarAoTopo}
          aria-label="Voltar ao topo"
          className={cn(
            'relative flex h-14 w-14 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg ring-1 ring-gray-200 transition-opacity duration-300 dark:bg-[#141414] dark:text-white dark:ring-white/10',
            mostrarTopo ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
        >
          <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
            <circle cx="28" cy="28" r={RAIO} fill="none" strokeWidth="3" className="stroke-gray-200 dark:stroke-white/10" />
            <circle
              cx="28"
              cy="28"
              r={RAIO}
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              className="stroke-primary transition-[stroke-dashoffset] duration-150 ease-out"
              strokeDasharray={CIRCUNFERENCIA}
              strokeDashoffset={CIRCUNFERENCIA - (progresso / 100) * CIRCUNFERENCIA}
            />
          </svg>
          <ArrowUp size={22} />
        </button>

        {/* Botão "suporte" — sempre visível, em destaque (vermelho da
            marca). btn-glow (pedido explícito de uma tarefa posterior —
            "o botão circular vermelho flutuante do chat também"):
            hover:scale-105/transition-transform removidos (conflitavam —
            "nenhum transform no botão" com o novo efeito). */}
        <button
          type="button"
          onClick={() => setPopupAberto((v) => !v)}
          aria-label={popupAberto ? 'Fechar suporte' : 'Falar com o suporte'}
          aria-expanded={popupAberto}
          className="btn-glow flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30"
        >
          {popupAberto ? <X size={24} /> : <MessageCircle size={24} />}
        </button>

        {/* Pop-up de suporte — `absolute`, ancorado ACIMA do grupo inteiro
            (bottom-full do wrapper `relative` acima + mb-3 de respiro,
            right-0 pra alinhar a borda direita com os botões): fora do
            fluxo normal, então nunca empurra/afasta os dois botões, abra
            ou feche. SEMPRE montado (não desmonta ao fechar) — abrir/
            fechar é só opacity + scale + translate-y por classe (pedido
            explícito, ~300ms ease-out). Fechado: invisible (não só
            pointer-events-none) tira do fluxo de tab/leitor de tela e
            garante que não reserva espaço nenhum, sem desmontar. */}
        <div
          className={cn(
            'absolute bottom-full right-0 mb-3 w-72 origin-bottom-right rounded-xl border border-gray-200 bg-white p-4 shadow-2xl transition-[opacity,transform] duration-300 ease-out dark:border-white/10 dark:bg-[#141414] sm:w-80',
            popupAberto ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none invisible translate-y-2 scale-95 opacity-0'
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Precisa de ajuda?</h3>
            <button
              type="button"
              onClick={() => setPopupAberto(false)}
              aria-label="Fechar"
              className="text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {whatsappLink ? (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setPopupAberto(false)}
              className="btn-primary btn-glow flex w-full items-center justify-center gap-2"
            >
              <MessageCircle size={16} />
              Falar com o suporte
            </a>
          ) : (
            <p className="rounded bg-gray-100 px-3 py-2 text-xs text-gray-500 dark:bg-white/5 dark:text-gray-400">
              Número de suporte não configurado.
            </p>
          )}

          <div className="my-4 h-px bg-gray-200 dark:bg-white/10" />

          {/* #perguntas-frequentes (era link pra /suporte — pedido
              explícito de uma tarefa anterior: rola até a seção "Perguntas
              Frequentes" na PRÓPRIA landing em vez de navegar pra outra
              página; id corrigido nesta tarefa — a seção virou
              "perguntas-frequentes" numa tarefa posterior, ver
              LandingPageClient.tsx/LandingHeader.tsx, mas este botão ainda
              apontava pro id antigo "ajuda", então nunca rolava pra lugar
              nenhum). scrollSuaveParaSecao (lib/utils.ts, MESMA função que
              os links do menu usam) no lugar de um scrollIntoView próprio
              — reaproveita o mecanismo existente em vez de duplicar. */}
          <button
            type="button"
            onClick={() => {
              setPopupAberto(false);
              scrollSuaveParaSecao('perguntas-frequentes');
            }}
            className="block w-full text-left"
          >
            <p className="text-sm font-medium text-gray-900 dark:text-white">Ficou com dúvidas?</p>
            <p className="text-sm text-gray-500 transition-colors hover:text-primary dark:text-gray-400">
              Acesse nossa Central de Ajuda
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
