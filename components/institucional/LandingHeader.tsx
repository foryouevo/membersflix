'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Container from '@/components/institucional/Container';

// 7 itens do menu, NESTA ordem (pedido explícito desta tarefa: "Clientes"
// e "Planos" trocaram de lugar — Planos agora vem ANTES de Clientes). id =
// seção correspondente (ver SECOES/LABELS_SECAO em LandingPageClient.tsx,
// que tem 9 seções ao todo; "palavras" e "numeros" não têm item de menu
// próprio, de propósito). Array único, usado tanto pro menu desktop quanto
// pro painel mobile, pra nunca ficarem dessincronizados.
const ITENS_MENU = [
  { id: 'inicio', label: 'Início' },
  { id: 'plataforma', label: 'Plataforma' },
  { id: 'cursos', label: 'Cursos' },
  { id: 'diferenciais', label: 'Diferenciais' },
  { id: 'planos', label: 'Planos' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'ajuda', label: 'Ajuda' },
] as const;

/**
 * Header fixo/flutuante da landing institucional (/ — pedido explícito: pra
 * QUALQUER visitante, logado ou não, sem redirect automático nenhum, ver
 * app/page.tsx). Diferente do Header.tsx da área de membros (login
 * obrigatório, outra paleta, outro propósito) — este é público, com
 * scroll/menu de página única e alternância de tema, então não faz sentido
 * reaproveitar aquele componente; existe um próprio aqui.
 *
 * Visual "pill" flutuante (pedido explícito, referência: Cakto) — SEMPRE
 * com o mesmo tamanho/padding em qualquer estado de scroll (pedido
 * explícito: "não deve encolher, só o background aparece/intensifica"),
 * bordas arredondadas (rounded-full), com uma margem em relação ao topo/
 * bordas da tela. É por isso que o header, diferente do resto da landing
 * (que acompanha o toggle light/dark), tem cor PRÓPRIA e fixa (sempre
 * escuro, texto sempre claro) — decisão de design tomada aqui: um pill
 * flutuante translúcido só funciona visualmente sobre QUALQUER conteúdo
 * (claro ou escuro) por baixo dele se ele mesmo não mudar de cor com o
 * tema da página.
 *
 * `secaoAtiva` (scroll spy) é controlado pelo PAI (LandingPageClient — um
 * IntersectionObserver observando as 9 seções) e só passado pra cá pra
 * destacar o item correspondente; este componente não observa nada sozinho,
 * evitando dois observers concorrentes.
 *
 * `destinoLogado`: null pra visitante deslogado (mostra "Entrar"/"Criar
 * conta grátis", como sempre); '/inicio' ou '/admin/dashboard' quando já
 * existe sessão — aí os botões viram um único "Ir para a plataforma".
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

  // Fundo do pill aparece/intensifica ao rolar (pedido explícito — item 4:
  // transparente no topo, com fundo a partir do primeiro scroll). Só
  // controla o BACKGROUND agora — tamanho/padding do pill nunca mudam (item
  // 5, última exigência: "não deve encolher... só o background deve
  // aparecer/intensificar"). 8px de folga (>8, não >0): evita alternar
  // classe a cada pixel por causa de bounce/rubber-band scroll (iOS) no
  // topo da página. Já inicializa lendo window.scrollY (não só 0) — sem
  // isso, dar F5 com a página já rolada deixaria o header transparente por
  // um instante até o primeiro evento de scroll disparar.
  const [comFundo, setComFundo] = useState(false);
  useEffect(() => {
    function medir() {
      setComFundo(window.scrollY > 8);
    }
    medir();
    window.addEventListener('scroll', medir, { passive: true });
    return () => window.removeEventListener('scroll', medir);
  }, []);

  // Trava o scroll do body enquanto o menu mobile (agora tela cheia, item 9)
  // está aberto — sem isso, dava pra rolar o conteúdo POR TRÁS do overlay.
  useEffect(() => {
    if (!menuAberto) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuAberto]);

  // Fecha o menu mobile ao clicar num link (senão ficaria aberto por cima
  // da seção pra qual acabou de navegar) — mesmo handler pra todos os
  // links, só chama scrollIntoView e fecha.
  function irParaSecao(id: string) {
    setMenuAberto(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const BotaoTema = ({ className }: { className?: string }) => (
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-white/10 hover:text-white',
        className
      )}
    >
      {/* Só renderiza o ícone real depois de montar (ver comentário acima)
          — antes disso, um placeholder do mesmo tamanho evita "pulo" de
          layout quando o ícone real aparece. */}
      {montado ? theme === 'dark' ? <Sun size={18} /> : <Moon size={18} /> : <span className="block h-[18px] w-[18px]" />}
    </button>
  );

  // Botão de conta compacto (mobile, ao lado do hambúrguer — item 8):
  // "Criar conta" se deslogado, "Entrar" (ou "Ir p/ plataforma", já
  // logado) se não. Só texto/link mais estreito que os botões grandes de
  // dentro do menu tela cheia — cabe ao lado do ícone de menu na barra.
  const BotaoContaCompacto = () => (
    <Link
      href={destinoLogado ?? '/login?form=cadastro'}
      className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
    >
      {destinoLogado ? 'Plataforma' : 'Criar conta'}
    </Link>
  );

  return (
    <>
      {/* <header> semântico (era uma <div> solta) envolvendo o wrapper
          fixo — corrige regressão de acessibilidade: sem essa tag, leitores
          de tela/navegação por landmark perdiam a referência de "cabeçalho
          da página". Wrapper interno só pra centralizar o pill com uma
          margem do topo/bordas da tela (pedido explícito — "flutuante, não
          colado no topo da viewport"). pointer-events-none aqui +
          pointer-events-auto no pill: a faixa vazia ao redor do pill
          (esquerda/direita, acima dele) não deveria capturar clique nenhum. */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-4 sm:pt-4">
        <div
          className={cn(
            'pointer-events-auto w-full max-w-6xl rounded-full border transition-colors duration-300',
            comFundo ? 'border-white/10 bg-black/60 shadow-lg shadow-black/20 backdrop-blur-md' : 'border-transparent bg-transparent'
          )}
        >
          {/* h-16 fixo em QUALQUER estado de scroll (pedido explícito, item
              5 — "não deve encolher"). Container: mesmo max-width/padding
              lateral usado no resto da landing (item 2). */}
          <Container className="flex h-16 items-center justify-between">
            {/* ESQUERDA — logo. Sem chip escuro por trás (era necessário
                quando o header acompanhava o tema light/dark da página —
                agora ele é sempre escuro, então a logo — que tem a parte
                "MEMBERS" em branco — já fica legível sozinha, sempre. */}
            <a
              href="#inicio"
              onClick={(e) => {
                e.preventDefault();
                irParaSecao('inicio');
              }}
              className="shrink-0"
            >
              <Image src="/logo.png" alt="MembersFlix" width={160} height={32} priority className="h-6 w-auto object-contain" />
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
                    'text-sm font-medium transition-colors',
                    secaoAtiva === item.id ? 'text-primary' : 'text-gray-300 hover:text-white'
                  )}
                >
                  {item.label}
                </a>
              ))}
            </nav>

            {/* DIREITA — tema + Entrar/Criar conta grátis (desktop) / conta
                compacta + tema + hambúrguer (mobile) */}
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 md:flex">
                <BotaoTema />
                {destinoLogado ? (
                  <Link href={destinoLogado} className="btn-primary">
                    Ir para a plataforma
                  </Link>
                ) : (
                  <>
                    {/* Mesmo CSS do botão "Já tenho conta" do hero (pedido
                        explícito, item 3): fundo transparente, borda
                        visível, texto branco — antes era só texto/link
                        sem borda nenhuma. rounded-full (não `rounded`):
                        combina com o resto do pill. */}
                    <Link
                      href="/login"
                      className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                    >
                      Entrar
                    </Link>
                    {/* ?form=cadastro — LoginPageClient lê essa query na
                        montagem e chama o MESMO handleFlip que o link
                        "Cadastra-se" já usa, abrindo direto no lado de
                        cadastro do card com flip. */}
                    <Link href="/login?form=cadastro" className="btn-primary">
                      Criar conta grátis
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile: botão de conta compacto + tema, do LADO do
                  hambúrguer (pedido explícito, item 8 — antes só existiam
                  dentro do painel/menu). */}
              <div className="flex items-center gap-1.5 md:hidden">
                <BotaoContaCompacto />
                <BotaoTema />
                <button
                  type="button"
                  onClick={() => setMenuAberto(true)}
                  aria-label="Abrir menu"
                  aria-expanded={menuAberto}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white"
                >
                  <Menu size={22} />
                </button>
              </div>
            </div>
          </Container>
        </div>
      </header>

      {/* Menu mobile em TELA CHEIA (pedido explícito, item 9 — era um
          painel dropdown pequeno abaixo do header). 100dvh (não só
          inset-0/h-full): mesma técnica já usada na tela de login pra
          acompanhar a barra de endereço do navegador mobile
          aparecendo/sumindo (ver components/LoginPageClient.tsx).
          Overlay cobrindo tudo, sempre montado no DOM (visibility/opacity
          controlam abrir/fechar, não display:none/unmount) — evita
          reconstruir a lista a cada abertura e permite uma transição de
          fade em vez de aparecer/sumir seco. */}
      <div
        className={cn(
          'fixed inset-0 z-[60] flex h-dvh flex-col bg-black transition-opacity duration-200 md:hidden',
          menuAberto ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-4">
          <Image src="/logo.png" alt="MembersFlix" width={160} height={32} className="h-6 w-auto object-contain" />
          <button
            type="button"
            onClick={() => setMenuAberto(false)}
            aria-label="Fechar menu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-300 hover:bg-white/10 hover:text-white"
          >
            <X size={22} />
          </button>
        </div>

        {/* Itens do menu — cada um em seu próprio "card" arredondado
            (referência visual: Kirvano), na mesma ordem corrigida do item
            1. overflow-y-auto: se a lista de 7 itens + os 2 botões finais
            não couberem numa tela muito baixa, rola só esta área (nunca
            trava o botão de fechar/logo do topo). */}
        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
          {ITENS_MENU.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                irParaSecao(item.id);
              }}
              className={cn(
                'rounded-xl px-4 py-3.5 text-base font-medium transition-colors',
                secaoAtiva === item.id ? 'bg-primary/15 text-primary' : 'bg-white/5 text-white hover:bg-white/10'
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Rodapé do menu tela cheia — Criar conta grátis / Entrar
            empilhados, largura total (pedido explícito, item 9). Logado:
            um botão só, "Ir para a plataforma". */}
        <div className="shrink-0 space-y-2.5 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2">
          {destinoLogado ? (
            <Link href={destinoLogado} onClick={() => setMenuAberto(false)} className="btn-primary block w-full py-3 text-center text-base">
              Ir para a plataforma
            </Link>
          ) : (
            <>
              <Link
                href="/login?form=cadastro"
                onClick={() => setMenuAberto(false)}
                className="btn-primary block w-full py-3 text-center text-base"
              >
                Criar conta grátis
              </Link>
              <Link
                href="/login"
                onClick={() => setMenuAberto(false)}
                className="block w-full rounded-full border border-white/30 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                Entrar
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
