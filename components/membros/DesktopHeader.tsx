'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Search, SlidersHorizontal, User, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useHeaderScrolled } from '@/hooks/useHeaderScrolled';
import { buildSupportWhatsappLink, cn } from '@/lib/utils';
import type { Profile } from '@/types';

/**
 * Header horizontal fixo no topo, estilo Netflix — substitui a sidebar
 * lateral em desktop/tablet (`hidden md:flex`; abaixo de 768px continua o
 * MobileHeader + bottom nav de sempre, ver app/membros/layout.tsx). Logo à
 * esquerda, itens de navegação em linha (destaque vermelho no ativo, mesmo
 * critério de rota que a bottom nav mobile já usa), e um grupo de 3 ícones
 * à direita: busca (expansível, embutida aqui — não é mais o componente
 * HomeSearchFilter, que continua existindo só pro input mobile de
 * BuscarPageClient), filtro (categoria/instrutor, painel próprio) e perfil
 * (botão com dropdown "Meu Perfil"/"Sair", não é mais o UserAvatarMenu —
 * esse componente continua em uso só no MobileHeader).
 *
 * Sem background no topo (transparente) e sempre fixo — igual em espírito
 * ao MobileHeader, inclusive no estado de scroll: rolou a página (useHeaderScrolled
 * — hooks/useHeaderScrolled.ts, mesmo hook do MobileHeader), o fundo vira
 * preto semi-transparente (bg-black/95 = rgb(0 0 0 / 0.95), sem o brilho
 * vermelho radial que o mobile soma — aqui é só o preto liso), com
 * transição suave; no topo volta a ficar transparente. Páginas com hero de
 * tela cheia (Home, detalhes
 * do curso) cancelam a folga de <main> (md:-mt-16 no wrapper do hero, em vez
 * de md:mt-0) pra imagem/gradiente do banner "sangrarem" por trás do
 * header, mesmo efeito que o mobile já tinha; o conteúdo de texto/card dentro
 * do hero repõe a folga (md:pt-16) pra não ficar coberto. Páginas sem hero
 * (busca, perfil, meus-cursos, categorias) não têm nada pra sangrar atrás
 * do header — continuam só com a folga padrão de <main> (md:pt-16), sem
 * cancelamento nenhum. drop-shadow nos itens de texto/logo/ícone: sem
 * fundo, esse é o jeito de manter contraste em cima de qualquer coisa que
 * role por trás (imagem clara, capa de curso etc.).
 *
 * Busca/filtro aqui não filtram nenhuma lista local (esse header existe em
 * toda página, não só na Home) — eles escrevem direto na URL da tela de
 * busca dedicada (/membros/buscar?q=/categoria=/instrutor=), navegando pra
 * lá se for preciso. Busca: dispara sozinha 300ms depois de parar de
 * digitar (debounce — `router.replace`, não `push`, pra não empilhar uma
 * entrada de histórico por tecla), com Enter como atalho pra ir na hora,
 * cancelando o debounce pendente. Filtro (categoria/instrutor): sempre
 * imediato, sem debounce, desde antes. Do outro lado, BuscarPageClient lê
 * essa URL via useSearchParams (reativo — refiltra sozinho a cada mudança,
 * sem precisar remontar), então essa tela nunca guarda a busca/filtro
 * "sujos" localmente — se o usuário sair no meio e voltar, ou compartilhar
 * o link, o resultado bate exatamente com o que a URL diz.
 */
export default function DesktopHeader({
  profile,
  numeroWhatsapp,
  categorias,
  instrutores,
}: {
  profile: Pick<Profile, 'nome' | 'avatar_url'> | null;
  numeroWhatsapp: string | null;
  categorias: { id: string; nome: string }[];
  instrutores: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const scrolled = useHeaderScrolled();
  const suporteLink = numeroWhatsapp ? buildSupportWhatsappLink(numeroWhatsapp) : null;

  // Estado só de "staging" pro input/painel — a filtragem de verdade
  // acontece na tela de busca, pra onde toda mudança aqui navega (ver
  // comentário do componente acima).
  const [busca, setBusca] = useState('');
  const [categoriaIds, setCategoriaIds] = useState<string[]>([]);
  const [instrutorNomes, setInstrutorNomes] = useState<string[]>([]);
  const filtroAtivo = categoriaIds.length > 0 || instrutorNomes.length > 0;

  // Busca expansível: só o ícone da lupa por padrão; abre um input inline
  // ao lado dele (width 0 -> 12rem, animado) e ganha foco só depois da
  // animação terminar (300ms — senão o cursor "pisca" num campo que ainda
  // está com width:0/opacity:0, efeito estranho). Clicar fora com o campo
  // vazio recolhe sozinho; com texto digitado, fica aberto (o aluno pode
  // ter clicado fora sem querer no meio de escrever).
  const [buscaAberta, setBuscaAberta] = useState(false);
  const buscaWrapRef = useRef<HTMLDivElement>(null);
  const buscaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (buscaWrapRef.current && !buscaWrapRef.current.contains(e.target as Node) && !busca.trim()) {
        setBuscaAberta(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [busca]);

  function abrirBusca() {
    setBuscaAberta(true);
    setTimeout(() => buscaInputRef.current?.focus(), 300);
  }

  // Painel de categoria/instrutor por trás do ícone de filtro — mesma lógica
  // de toggle/navegação já usada aqui (toggleCategoria/toggleInstrutor
  // abaixo), só que com o gatilho sendo um botão circular isolado em vez do
  // botão emparelhado com o input de busca (era assim no HomeSearchFilter,
  // que continua existindo do jeito que estava — ainda é usado por
  // BuscarPageClient — só não é mais o que este header renderiza).
  const [filtroAberto, setFiltroAberto] = useState(false);
  const filtroWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filtroWrapRef.current && !filtroWrapRef.current.contains(e.target as Node)) {
        setFiltroAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // router.replace (não push): busca em tempo real gera uma atualização de
  // URL a cada pausa na digitação — com push, cada uma dessas viraria uma
  // entrada no histórico, e o botão "voltar" do navegador ficaria inútil
  // (precisaria de uma entrada por letra digitada pra sair da busca).
  // replace mantém só a navegação real (entrar/sair da tela de busca) no
  // histórico.
  function irParaBusca(next: { busca?: string; categoriaIds?: string[]; instrutorNomes?: string[] }) {
    const alvoBusca = next.busca ?? busca;
    const alvoCategoriaIds = next.categoriaIds ?? categoriaIds;
    const alvoInstrutorNomes = next.instrutorNomes ?? instrutorNomes;

    const params = new URLSearchParams();
    if (alvoBusca.trim()) params.set('q', alvoBusca.trim());
    if (alvoCategoriaIds.length > 0) params.set('categoria', alvoCategoriaIds.join(','));
    if (alvoInstrutorNomes.length > 0) params.set('instrutor', alvoInstrutorNomes.join(','));

    const query = params.toString();
    router.replace(`/membros/buscar${query ? `?${query}` : ''}`);
  }

  // Debounce de 300ms: dispara sozinho conforme a pessoa digita, sem
  // precisar de Enter (Enter continua funcionando, como atalho — ver
  // onKeyDown do input abaixo — cancelando o debounce pendente e indo na
  // hora). Filtro (categoria/instrutor) não passa por aqui: toggleCategoria/
  // toggleInstrutor já chamam irParaBusca direto, sem debounce — selecionar
  // um filtro já era "na hora" desde antes.
  const buscaDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    return () => {
      if (buscaDebounceRef.current) clearTimeout(buscaDebounceRef.current);
    };
  }, []);

  function handleBuscaChange(value: string) {
    setBusca(value);
    if (buscaDebounceRef.current) clearTimeout(buscaDebounceRef.current);
    buscaDebounceRef.current = setTimeout(() => irParaBusca({ busca: value }), 300);
  }

  function toggleCategoria(id: string) {
    const next = categoriaIds.includes(id) ? categoriaIds.filter((x) => x !== id) : [...categoriaIds, id];
    setCategoriaIds(next);
    irParaBusca({ categoriaIds: next });
  }

  function toggleInstrutor(nome: string) {
    const next = instrutorNomes.includes(nome) ? instrutorNomes.filter((x) => x !== nome) : [...instrutorNomes, nome];
    setInstrutorNomes(next);
    irParaBusca({ instrutorNomes: next });
  }

  // Menu do ícone de perfil: "Meu Perfil" (link) + "Sair" (signOut do
  // Supabase + redireciona pro login) — antes era um Link direto pra
  // /membros/perfil sem opção de sair por aqui (o "Sair" tinha ficado só na
  // própria página de perfil).
  const [perfilMenuAberto, setPerfilMenuAberto] = useState(false);
  const perfilMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (perfilMenuRef.current && !perfilMenuRef.current.contains(e.target as Node)) setPerfilMenuAberto(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setPerfilMenuAberto(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  // Pílula arredondada em todo item (padding sempre presente, mesmo
  // inativo — assim o texto não "pula" de posição quando vira o ativo/hover,
  // só a cor de fundo/texto mudam). Ativo: branco + fundo
  // rgba(255,255,255,0.2) (bg-white/20, !important porque essa cor de fundo
  // precisa vencer incondicionalmente — mesmo raciocínio já usado nos
  // outros lugares desta plataforma que precisaram de !border-*/!bg-* pra
  // não perder pra alguma outra regra). Hover (só quando NÃO ativo): branco
  // + rgba(255,255,255,0.1) (bg-white/10). transition explícita
  // (color/background-color, 0.25s ease) em vez do genérico
  // `transition-colors` do Tailwind (que usa a duração/easing padrão dele,
  // não bate com o 0.25s/ease pedido aqui). drop-shadow: sem background no
  // header (estado padrão, no topo da página), o texto senta direto em cima
  // do que rolar por trás — a sombra mantém contraste mesmo sobre fundo
  // claro.
  function itemClasses(active: boolean) {
    return cn(
      'rounded-full px-4 py-1.5 text-base font-medium drop-shadow-md [transition:color_0.25s_ease,background-color_0.25s_ease]',
      active ? '!bg-white/20 !text-white' : 'text-on-variant hover:bg-white/10 hover:text-white'
    );
  }

  // Mesmo motivo do MobileHeader: a página do player já tem seu próprio
  // botão de voltar flutuando sobre o vídeo e gerencia a própria altura de
  // tela — uma barra de navegação persistente por cima brigaria com a
  // experiência imersiva do player, então o header simplesmente não
  // renderiza nessa rota. Depois de todos os hooks (Rules of Hooks: um
  // `return null` condicional ANTES dos useState quebraria a ordem deles
  // entre renders, já que `pathname` pode mudar sem desmontar este
  // componente — ele vive no layout, não na página).
  if (pathname.startsWith('/membros/player')) return null;

  return (
    // fixed + z-30: sempre no topo, em toda página (mesma posição de
    // sempre). Transparente no topo (scroll = 0) / bg-black/95 rolado —
    // rgb(0 0 0 / 0.95), combina com o tom escuro do tema (bg-background é
    // #0f0f0f, quase preto puro) sem contrastar feio com o resto do app.
    // transition-colors + duration-[250ms] ease-out: mesma transição do
    // MobileHeader, pra troca não ficar abrupta.
    //
    // py-6 (1.5rem, topo/base) + pl-16/pr-16 (4rem, laterais) — lateral
    // maior que vertical de propósito (pedido explícito). h-24 (6rem/96px,
    // pedido explícito de novo — já tinha sido h-24 antes, depois baixado
    // pra h-20/80px, agora voltou): manter uma altura FIXA (não deixar
    // intrínseca) é o que garante que a folga reservada nas outras páginas
    // bate com a altura de verdade do header — só que agora ela NÃO bate
    // mais: HEADER_HEIGHT_PX em VitrinePageClient/CursoDetalheClient/
    // PlayerPageClient/app/membros/layout.tsx (md:pt-20/md:-mt-20, 80px)
    // ainda está reservando o valor antigo — precisa voltar pra
    // md:pt-24/md:-mt-24 pra não sobrar/faltar 16px entre o header e o
    // conteúdo. items-center continua centralizando logo/nav/busca/avatar
    // dentro dela.
    <div
      className={cn(
        'fixed inset-x-0 top-0 z-30 hidden h-24 items-center gap-6 py-6 pl-16 pr-16 transition-colors duration-[250ms] ease-out md:flex',
        scrolled ? 'bg-black/95' : 'bg-transparent'
      )}
    >
      <Link href="/membros/vitrine" className="shrink-0 drop-shadow-md">
        <Image src="/logo.png" alt="MembersFlix" width={140} height={32} priority className="h-[1.7rem] w-auto object-contain" />
      </Link>

      <nav className="flex shrink-0 items-center gap-2">
        <Link href="/membros/vitrine" className={itemClasses(pathname.startsWith('/membros/vitrine'))}>
          Início
        </Link>
        <Link href="/membros/meus-cursos" className={itemClasses(pathname.startsWith('/membros/meus-cursos'))}>
          Meus Cursos
        </Link>
        <Link href="/membros/perfil" className={itemClasses(pathname.startsWith('/membros/perfil'))}>
          Meu Perfil
        </Link>
        {suporteLink ? (
          <a href={suporteLink} target="_blank" rel="noopener noreferrer" className={itemClasses(false)}>
            Suporte
          </a>
        ) : (
          <span
            title="Número de suporte não configurado pelo admin"
            className="cursor-not-allowed text-sm font-medium text-on-variant/50 drop-shadow-md"
          >
            Suporte
          </span>
        )}
      </nav>

      {/* Grupo de ícones: busca (expansível, dispara sozinha 300ms depois de
          parar de digitar), filtro (categoria/instrutor, sempre imediato) e
          perfil (agora um botão com menu — "Meu Perfil"/"Sair" — em vez de
          link direto). Botões circulares 2.25rem (h-9 w-9), fundo
          transparente, cor branca a 70% (text-white/70) — vira branco
          sólido + fundo branco a 10% no hover, com a mesma transição de
          0.25s/ease dos links do menu. gap-3 = 0.75rem entre os três. */}
      <div className="flex flex-1 items-center justify-end gap-3">
        <div
          ref={buscaWrapRef}
          className={cn('flex items-center rounded-full [transition:background-color_0.25s_ease]', buscaAberta && 'bg-white/10')}
        >
          <button
            type="button"
            onClick={() => (buscaAberta ? irParaBusca({}) : abrirBusca())}
            aria-label="Buscar cursos"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-transparent text-white/70 [transition:color_0.25s_ease,background-color_0.25s_ease] hover:bg-white/10 hover:text-white"
          >
            <Search size={20} />
          </button>
          <input
            ref={buscaInputRef}
            type="text"
            inputMode="search"
            autoComplete="off"
            value={busca}
            onChange={(e) => handleBuscaChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (buscaDebounceRef.current) clearTimeout(buscaDebounceRef.current);
                irParaBusca({});
              }
              if (e.key === 'Escape') {
                if (buscaDebounceRef.current) clearTimeout(buscaDebounceRef.current);
                setBusca('');
                setBuscaAberta(false);
              }
            }}
            placeholder="Buscar cursos..."
            aria-label="Buscar cursos"
            className={cn(
              'overflow-hidden bg-transparent text-sm text-white outline-none placeholder:text-white/50 [transition:width_0.3s_ease,opacity_0.3s_ease,padding_0.3s_ease]',
              buscaAberta ? 'w-48 px-3 opacity-100' : 'w-0 px-0 opacity-0'
            )}
          />
        </div>

        <div ref={filtroWrapRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setFiltroAberto((v) => !v)}
            aria-label="Filtrar cursos"
            aria-expanded={filtroAberto}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full bg-transparent [transition:color_0.25s_ease,background-color_0.25s_ease] hover:bg-white/10 hover:text-white',
              filtroAtivo ? 'text-primary' : 'text-white/70'
            )}
          >
            <SlidersHorizontal size={20} />
          </button>

          {filtroAberto && (
            <div className="absolute right-0 top-full z-30 mt-4 w-[17rem] space-y-3 rounded-lg border border-border/60 bg-surface-high p-4 shadow-overlay">
              <div>
                <p className="mb-1.5 text-xs font-medium text-on-variant">Categoria</p>
                <div className="max-h-32 space-y-1.5 overflow-y-auto pr-1">
                  {categorias.length === 0 ? (
                    <p className="text-xs text-on-variant/70">Nenhuma categoria.</p>
                  ) : (
                    categorias.map((c) => (
                      <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm text-on-surface">
                        <input
                          type="checkbox"
                          checked={categoriaIds.includes(c.id)}
                          onChange={() => toggleCategoria(c.id)}
                          className="h-3.5 w-3.5 shrink-0 rounded border-border/60 accent-primary"
                        />
                        {c.nome}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium text-on-variant">Instrutor</p>
                <div className="max-h-32 space-y-1.5 overflow-y-auto pr-1">
                  {instrutores.length === 0 ? (
                    <p className="text-xs text-on-variant/70">Nenhum instrutor.</p>
                  ) : (
                    instrutores.map((nome) => (
                      <label key={nome} className="flex cursor-pointer items-center gap-2 text-sm text-on-surface">
                        <input
                          type="checkbox"
                          checked={instrutorNomes.includes(nome)}
                          onChange={() => toggleInstrutor(nome)}
                          className="h-3.5 w-3.5 shrink-0 rounded border-border/60 accent-primary"
                        />
                        {nome}
                      </label>
                    ))
                  )}
                </div>
              </div>

              {filtroAtivo && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoriaIds([]);
                    setInstrutorNomes([]);
                    irParaBusca({ categoriaIds: [], instrutorNomes: [] });
                  }}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <X size={12} /> Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>

        <div ref={perfilMenuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setPerfilMenuAberto((v) => !v)}
            aria-label="Menu do usuário"
            aria-expanded={perfilMenuAberto}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full bg-transparent [transition:color_0.25s_ease,background-color_0.25s_ease] hover:bg-white/10 hover:text-white',
              pathname.startsWith('/membros/perfil') || perfilMenuAberto ? 'text-primary' : 'text-white/70'
            )}
          >
            <User size={20} />
          </button>

          {/* Fundo escuro, borda sutil rgba(255,255,255,0.1) (border-white/10),
              cantos arredondados, item com hover + transição de 0.2s —
              pedido explícito, mesmo padrão visual do resto do dropdown já
              usado na plataforma (bg-surface-high), só a cor da borda que
              é a literal pedida em vez de border-border/60. */}
          {perfilMenuAberto && (
            <div className="absolute right-0 top-full z-30 mt-3 w-48 overflow-hidden rounded-lg border border-white/10 bg-surface-high shadow-overlay">
              <Link
                href="/membros/perfil"
                onClick={() => setPerfilMenuAberto(false)}
                className="flex items-center gap-2 px-4 py-3 text-sm text-on-surface transition-colors duration-200 hover:bg-white/10"
              >
                <User size={16} /> Meu Perfil
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-error transition-colors duration-200 hover:bg-white/10"
              >
                <LogOut size={16} /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
