'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { cn, scrollSuaveParaSecao } from '@/lib/utils';
import Container from '@/components/institucional/Container';
import BrandLogo from '@/components/institucional/BrandLogo';

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
  { id: 'planos', label: 'Planos' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'ajuda', label: 'Ajuda' },
] as const;

// "Diferenciais" saiu SÓ daqui (pedido explícito desta tarefa — o pill
// reduzido, após o scroll, não tinha espaço pra logo + 7 itens + botões
// sem colar/quebrar linha): a seção e o item continuam existindo no resto
// da página e no footer (LandingPageClient.tsx/LandingFooter.tsx), só não
// tem mais atalho próprio no menu do topo.

/**
 * Header fixo/flutuante da landing institucional (/ — pedido explícito: pra
 * QUALQUER visitante, logado ou não, sem redirect automático nenhum, ver
 * app/page.tsx). Diferente do Header.tsx da área de membros (login
 * obrigatório, outra paleta, outro propósito) — este é público, com
 * scroll/menu de página única e alternância de tema, então não faz sentido
 * reaproveitar aquele componente; existe um próprio aqui.
 *
 * Header fluido (pedido explícito desta tarefa — substituiu o pill que
 * antes tinha SEMPRE o mesmo tamanho): no topo (scroll = 0) ocupa a largura
 * total da tela, sem fundo/borda, colado no topo. Ao rolar (comFundo, ver
 * useEffect abaixo), encolhe pra um pill centralizado (max-w menor,
 * cantos arredondados, margem do topo) com fundo (blur + cor sólida
 * translúcida) — largura, padding do wrapper externo e tamanho da logo
 * transitam juntos (duration-300/500 ease-in-out) nas duas direções.
 *
 * Agora SEGUE o tema claro/escuro da página (era sempre escuro/texto
 * sempre claro, decisão revertida nesta tarefa por deixar o menu ilegível
 * no tema claro — texto claro sobre o fundo branco da landing): cores via
 * `dark:` (mesma estratégia de LandingPageClient.tsx), incluindo o fundo do
 * pill ao rolar. A logo continua um problema à parte por ser uma imagem
 * (não pinta com classe de texto) — ver BrandLogo.tsx.
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
  // links. O scroll em si (scrollSuaveParaSecao) foi extraído pra
  // lib/utils.ts nesta tarefa, pra ser reaproveitado também pelo botão
  // "Saiba mais" da seção de números (ver SectionHeader.tsx) sem duplicar
  // a lógica.
  function irParaSecao(id: string) {
    setMenuAberto(false);
    scrollSuaveParaSecao(id);
  }

  const BotaoTema = ({ className }: { className?: string }) => (
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-black/5 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white',
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
      <header
        className={cn(
          'pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center transition-[padding] duration-300 ease-in-out',
          comFundo ? 'px-3 pt-3 sm:px-4 sm:pt-4' : 'px-0 pt-0'
        )}
      >
        {/* max-w-6xl SÓ quando reduzido (era incondicional — regressão
            pega nesta tarefa: no topo da página, em telas bem largas
            (>1152px), o header devia ocupar a largura TOTAL da viewport,
            sem faixas vazias nas bordas — "no topo ocupa a largura total
            da tela" já documentado no topo do componente; max-w-6xl
            incondicional quebrava isso silenciosamente em telas grandes
            no estado normal, sem efeito visível em telas menores que
            1152px, por isso passou despercebido até agora). */}
        <div
          className={cn(
            'pointer-events-auto w-full border transition-all duration-300 ease-in-out',
            comFundo
              ? 'max-w-6xl rounded-full border-black/5 bg-white/80 shadow-lg shadow-black/5 backdrop-blur-md dark:border-white/10 dark:bg-black/60 dark:shadow-black/20'
              : 'max-w-full rounded-none border-transparent bg-transparent'
          )}
        >
          <Container className="flex h-16 items-center justify-between">
            {/* ESQUERDA — logo completa (desktop sempre; mobile só no
                estado NORMAL) crossfading com favicon+"Início" (mobile só
                no estado REDUZIDO — pedido explícito desta tarefa,
                substitui o pill separado da versão anterior). grid +
                col-start-1/row-start-1 nos dois <span> (mesma técnica já
                usada no flip do card de login — ver
                components/LoginPageClient.tsx): ocupam a MESMA célula,
                um por cima do outro, e trocam de lugar com fade de
                opacidade em vez de um "pulo" via display/hidden. */}
            <a
              href="#inicio"
              onClick={(e) => {
                e.preventDefault();
                irParaSecao('inicio');
              }}
              className="relative grid shrink-0"
            >
              {/* Logo completa "MEMBERSFLIX" (BrandLogo.tsx: chip escuro
                  atrás só no tema claro, ver o componente). Sempre visível
                  no desktop (md:opacity-100/md:max-w-none vencem `comFundo`
                  a partir de md); no mobile, só no estado normal.
                  overflow-hidden + max-w (era só opacity — causa raiz de
                  um bug relatado nesta tarefa): no mobile reduzido, com
                  tema claro, o chip de BrandLogo (bg-[#141414] px-3 py-1.5,
                  só existe no tema claro) deixava este <span> ~24px mais
                  largo que no escuro; mesmo com opacity-0, ele continuava
                  ocupando espaço na célula do grid (que sempre acompanha o
                  filho MAIS largo), empurrando o botão/tema/hambúrguer
                  (shrink-0, do outro lado) pra fora da borda direita do
                  pill — só no claro, porque só ali o chip existe. Encolher
                  o max-width JUNTO com a opacidade (em vez de só a
                  opacidade) faz a variante INATIVA nunca contribuir
                  largura nenhuma pro grid, em qualquer tema. */}
              <span
                className={cn(
                  'col-start-1 row-start-1 overflow-hidden transition-all duration-300 ease-in-out',
                  comFundo
                    ? 'pointer-events-none max-w-0 opacity-0 md:pointer-events-auto md:max-w-[220px] md:opacity-100'
                    : 'pointer-events-auto max-w-[220px] opacity-100'
                )}
              >
                <BrandLogo imgClassName={cn('w-auto object-contain transition-all duration-300 ease-in-out', comFundo ? 'h-7' : 'h-6')} />
              </span>
              {/* Favicon (logohome.png — MESMO arquivo já usado no
                  projeto, não um ícone novo) + "Início" — só mobile
                  (md:hidden incondicional: no desktop esta variante nunca
                  aparece, só a logo completa acima) e só no estado
                  reduzido. whitespace-nowrap + shrink-0 no texto: nunca
                  quebra linha (pedido explícito). Mesmo tratamento de
                  max-w acima (ver comentário): colapsa a 0 no estado
                  normal, pra nunca contribuir largura à toa. */}
              <span
                className={cn(
                  'col-start-1 row-start-1 flex items-center gap-2 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out md:hidden',
                  comFundo ? 'pointer-events-auto max-w-[160px] opacity-100' : 'pointer-events-none max-w-0 opacity-0'
                )}
              >
                <Image src="/imagens/logohome.png" alt="MembersFlix" width={48} height={48} className="h-6 w-auto shrink-0 object-contain" />
                <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">Início</span>
              </span>
            </a>

            {/* CENTRO — menu (desktop only, md:flex). shrink-0 nos itens +
                whitespace-nowrap: nenhum item quebra linha por conta
                própria; ml-8/mr-6 (pedido explícito, item 2): respiro
                MÍNIMO garantido entre a logo e "Início", e entre "Ajuda" e
                o botão de tema — margem, diferente de gap num
                justify-between, não encolhe a zero quando o pill fica
                mais estreito (estado reduzido). */}
            <nav className="ml-8 mr-6 hidden min-w-0 items-center gap-6 md:flex lg:gap-8">
              {ITENS_MENU.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    irParaSecao(item.id);
                  }}
                  className={cn(
                    'shrink-0 whitespace-nowrap text-sm font-medium transition-colors',
                    secaoAtiva === item.id
                      ? 'text-primary'
                      : 'text-gray-700 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white'
                  )}
                >
                  {item.label}
                </a>
              ))}
            </nav>

            {/* DIREITA — tema + Entrar/Criar conta grátis (desktop) / conta
                compacta + tema + hambúrguer (mobile) */}
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden items-center gap-2 md:flex">
                <BotaoTema />
                {destinoLogado ? (
                  <Link href={destinoLogado} className="btn-primary shrink-0 whitespace-nowrap">
                    Ir para a plataforma
                  </Link>
                ) : (
                  <>
                    {/* Mesmo CSS do botão "Já tenho conta" do hero (pedido
                        explícito, item 3): fundo transparente, borda
                        visível — texto/borda adaptam ao tema (item 4), não
                        mais sempre claros. shrink-0 + whitespace-nowrap
                        (pedido explícito, item 2 desta tarefa): nunca mais
                        quebra em várias linhas dentro do pill reduzido. */}
                    <Link
                      href="/login"
                      className="shrink-0 whitespace-nowrap rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-black/5 dark:border-white/30 dark:text-white dark:hover:bg-white/10"
                    >
                      Entrar
                    </Link>
                    {/* ?form=cadastro — LoginPageClient lê essa query na
                        montagem e chama o MESMO handleFlip que o link
                        "Cadastra-se" já usa, abrindo direto no lado de
                        cadastro do card com flip. shrink-0 + whitespace-
                        nowrap: mesmo motivo do "Entrar" acima. */}
                    <Link href="/login?form=cadastro" className="btn-primary shrink-0 whitespace-nowrap">
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
                  className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-black/5 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
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
                'rounded-xl px-4 py-3.5 text-sm font-medium transition-colors',
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
            <Link href={destinoLogado} onClick={() => setMenuAberto(false)} className="btn-primary block w-full py-3 text-center text-sm">
              Ir para a plataforma
            </Link>
          ) : (
            <>
              <Link
                href="/login?form=cadastro"
                onClick={() => setMenuAberto(false)}
                className="btn-primary block w-full py-3 text-center text-sm"
              >
                Criar conta grátis
              </Link>
              <Link
                href="/login"
                onClick={() => setMenuAberto(false)}
                className="block w-full rounded-full border border-white/30 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-white/10"
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
