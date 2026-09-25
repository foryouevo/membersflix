'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, MessageCircle, X } from 'lucide-react';
import { buildSupportWhatsappLink, cn } from '@/lib/utils';

// Raio/circunferência do anel de progresso (botão "voltar ao topo") — SVG
// fixo 56x56 (MESMO tamanho do botão de suporte, pedido explícito desta
// tarefa — item 6, era 40x40/h-11 w-11, menor que o de suporte), raio 24
// (deixa ~4px de folga pro stroke de 3 não cortar a borda do círculo).
// circunferência = 2πr, usada tanto no strokeDasharray (comprimento total
// do traço) quanto no strokeDashoffset (quanto desse traço fica
// "escondido", ou seja, o inverso do progresso).
const RAIO = 24;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

/**
 * Botões fixos no canto inferior direito (z-40 — abaixo do header, z-50,
 * que ainda deve vencer se algum dia se sobrepuserem):
 *
 * - "Voltar ao topo": só aparece depois de rolar ~300px (fade), tem um
 *   anel de progresso (SVG stroke-dasharray) mostrando quanto da página já
 *   foi rolado, e leva de volta ao topo com scroll suave ao clicar. MESMO
 *   tamanho do botão de suporte agora (item 6).
 * - "Suporte": sempre visível, vermelho (mais em destaque), abre/fecha o
 *   pop-up de ajuda.
 *
 * Pop-up ABAIXO do botão de voltar ao topo, ACIMA do de suporte (pedido
 * explícito, item 7 — antes ficava por cima de tudo, sobrepondo o botão de
 * voltar ao topo): os três (botão topo, pop-up condicional, botão suporte)
 * são itens NORMAIS de um mesmo flex-col (não mais `absolute`) — como o
 * container é ancorado por `bottom` (não por `top`), ele cresce PRA CIMA
 * quando o pop-up aparece; o botão de suporte (último item) nunca muda de
 * lugar na tela, e o pop-up nasce exatamente entre os dois botões, sem
 * sobrepor nenhum dos dois.
 *
 * `numeroWhatsapp` vem do servidor (app/page.tsx busca em
 * `configuracoes`, MESMA coluna usada em todo o resto da plataforma —
 * ver /suporte) — nenhum número novo inventado aqui.
 */
export default function LandingFloatingActions({ numeroWhatsapp }: { numeroWhatsapp: string | null }) {
  const [progresso, setProgresso] = useState(0); // 0-100
  const [mostrarTopo, setMostrarTopo] = useState(false);
  const [popupAberto, setPopupAberto] = useState(false);

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

  return (
    // items-end: alinha os botões circulares (56px) e o pop-up (bem mais
    // largo) pela borda DIREITA — botões e card ficam "grudados" no mesmo
    // canto, em vez de centralizados um sobre o outro.
    <div
      className={cn(
        'fixed right-6 z-40 flex flex-col items-end gap-3 transition-all duration-300',
        avisoCookiesVisivel ? 'bottom-72' : 'bottom-6'
      )}
    >
      {/* Botão "voltar ao topo" — fade in/out (pedido explícito) via
          opacity + pointer-events (nunca sai do DOM: manter montado evita
          ficar remontando o SVG a cada 300px cruzado). h-14 w-14: MESMO
          tamanho do botão de suporte (item 6). */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
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

      {/* Pop-up de suporte — item de fluxo normal (não mais `absolute`,
          ver comentário do componente acima), entre os dois botões. */}
      {popupAberto && (
        <div className="w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-[#141414] sm:w-80">
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
              className="btn-primary flex w-full items-center justify-center gap-2"
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

          {/* #ajuda (era link pra /suporte — pedido explícito desta
              tarefa): rola até a seção "Perguntas Frequentes" na PRÓPRIA
              landing em vez de navegar pra outra página. */}
          <button
            type="button"
            onClick={() => {
              setPopupAberto(false);
              document.getElementById('ajuda')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="block w-full text-left"
          >
            <p className="text-sm font-medium text-gray-900 dark:text-white">Ficou com dúvidas?</p>
            <p className="text-sm text-gray-500 transition-colors hover:text-primary dark:text-gray-400">
              Acesse nossa Central de Ajuda
            </p>
          </button>
        </div>
      )}

      {/* Botão "suporte" — sempre visível, em destaque (vermelho da
          marca). h-14 w-14: mesmo tamanho do botão de voltar ao topo
          (item 6, já era esse tamanho, não mudou). */}
      <button
        type="button"
        onClick={() => setPopupAberto((v) => !v)}
        aria-label={popupAberto ? 'Fechar suporte' : 'Falar com o suporte'}
        aria-expanded={popupAberto}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-transform hover:scale-105"
      >
        {popupAberto ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
