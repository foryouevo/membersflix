'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, MessageCircle, X } from 'lucide-react';
import { buildSupportWhatsappLink, cn } from '@/lib/utils';

// Raio/circunferência do anel de progresso (botão "voltar ao topo") — SVG
// fixo 40x40, raio 18 (deixa ~2px de folga pro stroke de 3 não cortar a
// borda do círculo). circunferência = 2πr, usada tanto no strokeDasharray
// (comprimento total do traço) quanto no strokeDashoffset (quanto desse
// traço fica "escondido", ou seja, o inverso do progresso).
const RAIO = 18;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

/**
 * Dois botões fixos no canto inferior direito (pedido explícito), sempre
 * por cima do conteúdo (z-40 — abaixo do header, z-50, que ainda deve
 * vencer se algum dia se sobrepuserem, embora hoje não aconteça: o header
 * fica no topo, estes no rodapé da viewport):
 *
 * - "Voltar ao topo": só aparece depois de rolar ~300px (fade), tem um
 *   anel de progresso (SVG stroke-dasharray) mostrando quanto da página já
 *   foi rolado, e leva de volta ao topo com scroll suave ao clicar.
 * - "Suporte": sempre visível, maior/vermelho (mais em destaque), abre o
 *   pop-up de ajuda ancorado logo acima dele.
 *
 * `numeroWhatsapp` vem do servidor (app/page.tsx busca em
 * `configuracoes`, MESMA coluna usada em todo o resto da plataforma —
 * ver /suporte) — nenhum número novo inventado aqui.
 */
export default function LandingFloatingActions({ numeroWhatsapp }: { numeroWhatsapp: string | null }) {
  const [progresso, setProgresso] = useState(0); // 0-100
  const [mostrarTopo, setMostrarTopo] = useState(false);
  const [popupAberto, setPopupAberto] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const botaoSuporteRef = useRef<HTMLButtonElement>(null);

  // BUG encontrado testando esta tarefa: o aviso de cookies
  // (CookieConsentBanner.tsx, sitewide, canto inferior direito, z-[9999] —
  // o mais alto da plataforma, de propósito, por exigência legal/LGPD)
  // ocupa exatamente o mesmo canto que estes botões flutuantes (bottom-6
  // right-6, z-40) — na primeira visita (antes de aceitar/rejeitar),
  // clicar em "Suporte" na verdade clicava por baixo do card de cookies.
  // Como esses dois componentes não têm nenhuma relação/estado
  // compartilhado hoje, a correção fica aqui (o componente mais novo se
  // afasta, não o aviso legal, que não pode ficar escondido): observa se o
  // card do aviso está no DOM (ele desmonta sozinho ao aceitar/rejeitar,
  // ver CookieConsentBanner.tsx) e sobe os botões enquanto ele existir.
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

  // Fecha o pop-up ao clicar fora (mesmo padrão click-outside já usado no
  // resto do projeto — ver FiltroModal.tsx/Header.tsx da área de membros)
  // ou pressionar ESC.
  useEffect(() => {
    if (!popupAberto) return;
    function handleClickFora(e: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        botaoSuporteRef.current &&
        !botaoSuporteRef.current.contains(e.target as Node)
      ) {
        setPopupAberto(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setPopupAberto(false);
    }
    document.addEventListener('mousedown', handleClickFora);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickFora);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [popupAberto]);

  const whatsappLink = numeroWhatsapp
    ? buildSupportWhatsappLink(numeroWhatsapp, 'Olá, vim pelo site e preciso de ajuda.')
    : null;

  return (
    // bottom-6 -> bottom-72 (18rem/288px, folga suficiente pro card do
    // aviso de cookies mesmo na versão mais alta dele, mobile — ver
    // comentário do estado avisoCookiesVisivel, acima) enquanto o aviso
    // estiver na tela; volta ao normal sozinho assim que a pessoa
    // aceitar/rejeitar (ele desmonta) — transition-all anima a subida/
    // descida em vez de "pular".
    <div
      className={cn(
        'fixed right-6 z-40 flex flex-col items-center gap-3 transition-all duration-300',
        avisoCookiesVisivel ? 'bottom-72' : 'bottom-6'
      )}
    >
      {/* Pop-up de suporte — ancorado logo acima do botão de chat (ver
          comentário do componente, acima). */}
      {popupAberto && (
        <div
          ref={popupRef}
          className="absolute bottom-[calc(100%+0.75rem)] right-0 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-[#141414] sm:w-80"
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

          {/* /suporte (não só #ajuda): tem a mesma FAQ da seção "Perguntas
              Frequentes" da landing e MAIS os canais de contato/formulário
              — destino mais completo pra quem clicar aqui a partir de
              qualquer ponto da página, não só de dentro da seção #ajuda. */}
          <Link href="/suporte" onClick={() => setPopupAberto(false)} className="block">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Ficou com dúvidas?</p>
            <p className="text-sm text-gray-500 transition-colors hover:text-primary dark:text-gray-400">
              Acesse nossa Central de Ajuda
            </p>
          </Link>
        </div>
      )}

      {/* Botão "voltar ao topo" — fade in/out (pedido explícito) via
          opacity + pointer-events (nunca sai do DOM: manter montado evita
          ficar remontando o SVG a cada 300px cruzado). */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Voltar ao topo"
        className={cn(
          'relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg ring-1 ring-gray-200 transition-opacity duration-300 dark:bg-[#141414] dark:text-white dark:ring-white/10',
          mostrarTopo ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
          <circle cx="20" cy="20" r={RAIO} fill="none" strokeWidth="3" className="stroke-gray-200 dark:stroke-white/10" />
          <circle
            cx="20"
            cy="20"
            r={RAIO}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            className="stroke-primary transition-[stroke-dashoffset] duration-150 ease-out"
            strokeDasharray={CIRCUNFERENCIA}
            strokeDashoffset={CIRCUNFERENCIA - (progresso / 100) * CIRCUNFERENCIA}
          />
        </svg>
        <ArrowUp size={18} />
      </button>

      {/* Botão "suporte" — sempre visível, maior e em destaque (vermelho da
          marca), pedido explícito. */}
      <button
        ref={botaoSuporteRef}
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
