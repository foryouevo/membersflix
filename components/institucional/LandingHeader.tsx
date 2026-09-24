'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

// 7 itens do menu (era 6 — ganhou "Cursos", pedido desta tarefa) — id =
// seção correspondente (ver SECOES/LABELS_SECAO em LandingPageClient.tsx,
// que tem 9 seções ao todo; "palavras" e "numeros" não têm item de menu
// próprio, de propósito). Array único, usado tanto pro menu desktop quanto
// pro painel mobile, pra nunca ficarem dessincronizados.
const ITENS_MENU = [
  { id: 'inicio', label: 'Início' },
  { id: 'plataforma', label: 'Plataforma' },
  { id: 'cursos', label: 'Cursos' },
  { id: 'diferenciais', label: 'Diferenciais' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'planos', label: 'Planos' },
  { id: 'ajuda', label: 'Ajuda' },
] as const;

/**
 * Header fixo da landing institucional (/ — pedido explícito: pra QUALQUER
 * visitante, logado ou não, sem redirect automático nenhum, ver
 * app/page.tsx). Diferente do Header.tsx da área de membros (login
 * obrigatório, outra paleta, outro propósito) — este é público, com
 * scroll/menu de página única e alternância de tema, então não faz sentido
 * reaproveitar aquele componente; existe um próprio aqui.
 *
 * `secaoAtiva` (scroll spy) é controlado pelo PAI (LandingPageClient — um
 * IntersectionObserver observando as 9 seções) e só passado pra cá pra
 * destacar o item correspondente; este componente não observa nada sozinho,
 * evitando dois observers concorrentes.
 *
 * `destinoLogado`: null pra visitante deslogado (mostra "Entrar"/"Criar
 * conta grátis", como sempre); '/inicio' ou '/admin/dashboard' quando já existe
 * sessão — aí os dois botões viram um só, "Ir para a plataforma".
 */
export default function LandingHeader({ secaoAtiva, destinoLogado }: { secaoAtiva: string | null; destinoLogado: string | null }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const { theme, setTheme } = useTheme();
  // next-themes só sabe o tema real DEPOIS de montar no client (o server não
  // tem acesso a localStorage) — até lá, `theme` pode vir undefined/errado.
  // Sem esse guard, o ícone (Sun/Moon) podia piscar/trocar sozinho no
  // primeiro render, ou causar mismatch de hidratação.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  // Header "encolhe" ao rolar (pedido explícito): passivo (não bloqueia o
  // scroll) e já inicializa lendo window.scrollY (não só 0) — sem isso, dar
  // F5 com a página já rolada deixaria o header grande por um instante até
  // o primeiro evento de scroll disparar. 8px de folga (>8, não >0): evita
  // ficar alternando classe a cada pixel por causa de bounce/rubber-band
  // scroll (iOS) no topo da página.
  const [encolhido, setEncolhido] = useState(false);
  useEffect(() => {
    function medir() {
      setEncolhido(window.scrollY > 8);
    }
    medir();
    window.addEventListener('scroll', medir, { passive: true });
    return () => window.removeEventListener('scroll', medir);
  }, []);

  // Fecha o painel mobile ao clicar num link (senão ficaria aberto por
  // cima da seção pra qual acabou de navegar) — mesmo handler pra todos os
  // links, só chama scrollParaSecao e fecha.
  function irParaSecao(id: string) {
    setMenuAberto(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const BotaoTema = () => (
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
    >
      {/* Só renderiza o ícone real depois de montar (ver comentário acima)
          — antes disso, um placeholder do mesmo tamanho evita "pulo" de
          layout quando o ícone real aparece. */}
      {montado ? theme === 'dark' ? <Sun size={18} /> : <Moon size={18} /> : <span className="block h-[18px] w-[18px]" />}
    </button>
  );

  return (
    // border-b some quando não encolhido (topo, sobre o hero) — só aparece
    // junto do fundo blur ao rolar, pra não desenhar uma linha reta em cima
    // do conteúdo do hero antes de haver qualquer scroll.
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b bg-white/80 backdrop-blur-md transition-[border-color] duration-300 dark:bg-black/70',
        encolhido ? 'border-gray-200 dark:border-white/10' : 'border-transparent'
      )}
    >
      {/* h-16 -> h-12 ao rolar (pedido explícito — "menu recolhe ao rolar
          a página", padding vertical mais fino) — transition-all cobre a
          altura, então some a necessidade de animar padding-y à parte. */}
      <div
        className={cn(
          'mx-auto flex max-w-6xl items-center justify-between px-4 transition-all duration-300 sm:px-6 lg:px-8',
          encolhido ? 'h-12' : 'h-16'
        )}
      >
        {/* ESQUERDA — logo */}
        {/* bg-gray-900 dark:bg-transparent: o arquivo /logo.png (mesmo de
            sempre) tem a parte "MEMBERS" em branco — sempre visível sobre o
            fundo escuro do resto do app, mas invisível num header claro
            (esta é a primeira tela do projeto com tema light). Um chip
            escuro por trás só no tema light resolve sem precisar de um
            arquivo de logo novo. */}
        <a
          href="#inicio"
          onClick={(e) => {
            e.preventDefault();
            irParaSecao('inicio');
          }}
          className="shrink-0 rounded-md bg-gray-900 px-2.5 py-1.5 dark:bg-transparent dark:px-0 dark:py-0"
        >
          {/* h-6 -> h-5 ao rolar: reduz levemente junto do header (pedido
              explícito — "pode diminuir levemente o tamanho da logo"). */}
          <Image
            src="/logo.png"
            alt="MembersFlix"
            width={160}
            height={32}
            priority
            className={cn('w-auto object-contain transition-all duration-300', encolhido ? 'h-5' : 'h-6')}
          />
        </a>

        {/* CENTRO — menu (desktop only, md:flex) */}
        <nav className="hidden items-center gap-8 md:flex">
          {ITENS_MENU.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                irParaSecao(item.id);
              }}
              className={cn(
                'font-medium transition-all duration-300',
                encolhido ? 'text-[0.8rem]' : 'text-sm',
                secaoAtiva === item.id
                  ? 'text-primary'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* DIREITA — tema + Entrar/Criar conta (desktop) / hambúrguer (mobile) */}
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <BotaoTema />
            {destinoLogado ? (
              <Link href={destinoLogado} className="btn-primary">
                Ir para a plataforma
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:text-primary dark:text-gray-200"
                >
                  Entrar
                </Link>
                {/* ?form=cadastro — LoginPageClient lê essa query na
                    montagem e chama o MESMO handleFlip que o link
                    "Cadastra-se" já usa, abrindo direto no lado de
                    cadastro do card com flip. */}
                <Link href="/login?form=cadastro" className="btn-primary">Criar conta grátis</Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMenuAberto((v) => !v)}
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuAberto}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10 md:hidden"
          >
            {menuAberto ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Painel mobile — grid-template-rows 0fr->1fr (mesma técnica já usada
          no FAQ de /suporte e na busca mobile do Header da área de membros:
          só CSS, sem medir altura em pixels via JS). */}
      <div
        className={cn(
          'grid overflow-hidden border-t border-gray-200 bg-white transition-[grid-template-rows] duration-300 ease-out dark:border-white/10 dark:bg-black md:hidden',
          menuAberto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <nav className="flex flex-col gap-1 px-4 py-3">
            {ITENS_MENU.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  irParaSecao(item.id);
                }}
                className={cn(
                  'rounded px-3 py-2.5 text-sm font-medium transition-colors',
                  secaoAtiva === item.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10'
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3 border-t border-gray-200 px-4 py-3 dark:border-white/10">
            <BotaoTema />
            {destinoLogado ? (
              <Link
                href={destinoLogado}
                onClick={() => setMenuAberto(false)}
                className="btn-primary flex-1 text-center"
              >
                Ir para a plataforma
              </Link>
            ) : (
              <>
                {/* Sem reaproveitar .btn-secondary aqui (globals.css):
                    aquela classe assume fundo escuro (border-white/20 +
                    text-white) — certa no resto do app, que é sempre dark,
                    mas invisível sobre um fundo claro no tema light desta
                    landing. Estilo próprio, ciente dos dois temas. */}
                <Link
                  href="/login"
                  onClick={() => setMenuAberto(false)}
                  className="flex-1 rounded border border-gray-300 px-4 py-2 text-center text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-white/20 dark:text-gray-200 dark:hover:bg-white/10"
                >
                  Entrar
                </Link>
                <Link href="/login?form=cadastro" onClick={() => setMenuAberto(false)} className="btn-primary flex-1 text-center">Criar conta grátis</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
