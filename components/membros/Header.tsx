'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Search, SlidersHorizontal, User, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useHeaderScrolled } from '@/hooks/useHeaderScrolled';
import { buildSupportWhatsappLink, cn } from '@/lib/utils';
import FiltroModal from '@/components/membros/FiltroModal';
import type { Profile } from '@/types';

/**
 * Header único, global, presente em toda página sob app/membros/layout.tsx
 * (fixed no topo) — antes eram DOIS componentes separados (MobileHeader +
 * DesktopHeader, um `md:hidden` e outro `hidden md:flex`), unificados aqui
 * por pedido explícito: uma lógica só de busca/filtro/perfil pras duas
 * larguras de tela, diferenças resolvidas por classes responsivas dentro
 * deste mesmo componente, não por dois componentes.
 *
 * Lado esquerdo muda por breakpoint: no mobile (abaixo de 768px), só o
 * favicon + texto "Início" (`md:hidden`), sempre visível — não é mais
 * condicionado à rota atual como era no MobileHeader antigo (lá só aparecia
 * na própria Home; aqui aparece em toda página, igual a como a logo
 * completa do desktop também é sempre visível, não só na Home). No
 * desktop/tablet (`hidden md:flex`), a logo completa "MEMBERSFLIX" + a
 * navegação em linha (Início/Meus Cursos/Meu Perfil/Suporte, destaque
 * vermelho no ativo) — exatamente como já era.
 *
 * Lado direito sempre visível nas duas larguras, sem duplicar a LÓGICA de
 * busca/filtro/perfil nenhuma vez — só a apresentação de dois deles muda
 * por breakpoint (pedido explícito):
 * - Busca: no desktop, ícone + input que expande INLINE ao lado dele
 *   (`buscaAberta`, dispara sozinha 300ms depois de parar de digitar,
 *   como sempre); no mobile, o ícone (que vira um X enquanto aberto) abre
 *   uma SEGUNDA barra fixa de largura total logo abaixo do header
 *   (`buscaMobileAberta`, controlado pelo pai — MembrosChrome.tsx — que
 *   também empurra o <main> pra baixo dela, ver comentário lá) — reaproveita
 *   o mesmo `busca`/handleBuscaChange/irParaBusca dos dois jeitos, só a UI
 *   que é outra.
 * - Filtro (categoria/instrutor): mesmo `<FiltroModal>` nas duas larguras,
 *   mesmo estado (`filtroModalAberto`) — é o componente que resolve
 *   sozinho, por dentro, se aparece como dropdown ancorado ao ícone
 *   (desktop) ou bottom sheet full-width (mobile, ver FiltroModal.tsx).
 * - Perfil: dropdown "Meu Perfil"/"Sair" idêntico, sem diferença nenhuma
 *   por breakpoint.
 *
 * A fileira de chips de categoria que existia solta abaixo do header no
 * mobile (CategoriaChipsMobile, removida — VitrinePageClient.tsx) foi
 * substituída pelo menu de filtros acima, comum às duas larguras.
 *
 * Sem background no topo (transparente) e sempre fixo, com o mesmo estado
 * de scroll nas duas larguras (useHeaderScrolled — hooks/useHeaderScrolled.ts):
 * rolou a página, o fundo vira preto semi-transparente (bg-black/95), com
 * transição suave; no topo volta a ficar transparente (o brilho vermelho
 * radial que o MobileHeader antigo somava só nele foi descontinuado — um
 * header só, um efeito só). Páginas com hero de tela cheia (Home, detalhes
 * do curso) cancelam a folga de <main> (-mt-14/md:-mt-20 no wrapper do
 * hero) pra imagem/gradiente do banner "sangrarem" por trás do header; o
 * conteúdo de texto/card dentro do hero repõe a folga (pt-14/md:pt-20) pra
 * não ficar coberto. Páginas sem hero (busca, perfil, meus-cursos,
 * categorias) não cancelam nada. drop-shadow nos itens de texto/logo/ícone:
 * sem fundo, esse é o jeito de manter contraste em cima de qualquer coisa
 * que role por trás.
 *
 * h-14 (mobile, 56px) / md:h-24 (desktop, 96px): altura FIXA nas duas
 * larguras — é o que garante que a folga reservada nas outras páginas
 * (pt-14/md:pt-20 em <main>, VitrinePageClient, CursoDetalheClient,
 * PlayerPageClient) bate com a altura de verdade do header. h-14 mantém o
 * valor que o MobileHeader antigo já tinha (nada precisou mudar nas folgas
 * mobile existentes); h-24/md:pt-20 já tinham uma folga de 16px sobrando
 * antes desta tarefa (desvio pré-existente, fora do escopo daqui — não
 * mexido).
 *
 * Busca/filtro aqui não filtram nenhuma lista local (esse header existe em
 * toda página, não só na Home) — eles escrevem direto na URL da tela de
 * busca dedicada (/membros/buscar?q=/categoria=/instrutor=), navegando pra
 * lá se for preciso. Do outro lado, BuscarPageClient lê essa URL via
 * useSearchParams (reativo — refiltra sozinho a cada mudança, sem precisar
 * remontar), então essa tela nunca guarda a busca/filtro "sujos"
 * localmente — se o usuário sair no meio e voltar, ou compartilhar o link,
 * o resultado bate exatamente com o que a URL diz.
 */
export default function Header({
  profile,
  numeroWhatsapp,
  categorias,
  instrutores,
  buscaMobileAberta,
  onBuscaMobileAbertaChange,
  filtroModalAberto,
  onFiltroModalAbertoChange,
}: {
  profile: Pick<Profile, 'nome' | 'avatar_url'> | null;
  numeroWhatsapp: string | null;
  // Agrupada por nome (dado legado tem linhas duplicadas de categoria) — ver
  // comentário em app/membros/layout.tsx. `ids`: todas as linhas daquele
  // nome, tratadas como uma seleção só.
  categorias: { id: string; nome: string; ids: string[] }[];
  instrutores: string[];
  // Estado da barra de busca mobile (controlado pelo pai — MembrosChrome.tsx
  // — porque abrir/fechar precisa empurrar o <main> pra baixo, um irmão
  // deste componente, não um filho; ver comentário de MembrosChrome.tsx).
  // Não confundir com `buscaAberta` abaixo, que é só a expansão inline do
  // desktop, autocontida, sem efeito nenhum fora deste componente.
  buscaMobileAberta: boolean;
  onBuscaMobileAbertaChange: (open: boolean) => void;
  // Estado do painel de filtro — também controlado pelo pai (MembrosChrome),
  // pelo mesmo motivo de buscaMobileAberta: enquanto o bottom sheet mobile
  // do FiltroModal está aberto, o BottomNav (irmão deste componente, outra
  // árvore) precisa se esconder, senão fica por cima do footer "Limpar
  // filtros"/"Aplicar" (bug relatado — z-index sozinho não resolve porque
  // este header é `position:fixed` com z-index próprio, o que cria um
  // stacking context isolado que prende o FiltroModal por dentro dele; ver
  // comentário de MembrosChrome.tsx pro detalhe completo).
  filtroModalAberto: boolean;
  onFiltroModalAbertoChange: (open: boolean) => void;
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

  // Busca mobile — barra de largura total abaixo do header (não é a mesma
  // UI do desktop acima: lá o input expande inline ao lado do ícone; aqui é
  // uma segunda barra fixa, mt-14, que empurra o <main> pra baixo — ver
  // MembrosChrome.tsx). Reaproveita `busca`/handleBuscaChange/irParaBusca
  // (abaixo) — mesma lógica de busca de sempre, só troca a apresentação.
  // Foco automático 300ms depois de abrir, mesmo motivo/duração do desktop
  // (abrirBusca, acima): esperar a animação de abertura terminar antes do
  // cursor aparecer.
  const buscaMobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (buscaMobileAberta) {
      const t = setTimeout(() => buscaMobileInputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [buscaMobileAberta]);

  // Fecha sozinha ao navegar (ex: aluno abriu a busca, desistiu e tocou
  // direto num card visível embaixo dela) — sem isso ficaria "aberta" numa
  // página totalmente diferente depois da navegação.
  useEffect(() => {
    onBuscaMobileAbertaChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Painel de categoria/instrutor por trás do ícone de filtro (FiltroModal,
  // abaixo) — dropdown ancorado ao ícone. Fechamento por clique fora + ESC é
  // tratado aqui (mesmo padrão do menu de perfil logo abaixo: um ref por
  // cima de botão+painel, um listener só) — o X interno do painel chama
  // onClose direto. `filtroModalAberto` em si é controlado pelo pai (ver
  // comentário do prop, acima).
  const filtroWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filtroWrapRef.current && !filtroWrapRef.current.contains(e.target as Node)) {
        onFiltroModalAbertoChange(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onFiltroModalAbertoChange(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onFiltroModalAbertoChange]);

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
  // hora). Filtro (categoria/instrutor) não passa por aqui: handleAplicarFiltros
  // já navega direto, sem debounce — aplicar um filtro já era "na hora"
  // desde antes.
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

  // Chamado pelo FiltroModal ao clicar em "Aplicar" — a seleção fica "em
  // rascunho" dentro do modal (ver FiltroModal.tsx) até esse momento; aqui
  // só sincroniza esse resultado final no estado local (pro ícone/estado
  // "ativo" do botão) e navega, mesma lógica de sempre (irParaBusca).
  function handleAplicarFiltros(novoCategoriaIds: string[], novoInstrutorNomes: string[]) {
    setCategoriaIds(novoCategoriaIds);
    setInstrutorNomes(novoInstrutorNomes);
    irParaBusca({ categoriaIds: novoCategoriaIds, instrutorNomes: novoInstrutorNomes });
    onFiltroModalAbertoChange(false);
  }

  // Menu do ícone de perfil: "Meu Perfil" (link) + "Sair" (signOut do
  // Supabase + redireciona pro login).
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
  // precisa vencer incondicionalmente). Hover (só quando NÃO ativo): branco
  // + rgba(255,255,255,0.1) (bg-white/10). Só aparece no desktop (nav
  // hidden md:flex, abaixo) — no mobile a navegação continua sendo a
  // BottomNav.
  function itemClasses(active: boolean) {
    return cn(
      'rounded-full px-4 py-1.5 text-base font-medium drop-shadow-md [transition:color_0.25s_ease,background-color_0.25s_ease]',
      active ? '!bg-white/20 !text-white' : 'text-on-variant hover:bg-white/10 hover:text-white'
    );
  }

  // A página do player já tem seu próprio botão de voltar flutuando sobre o
  // vídeo e gerencia a própria altura de tela — uma barra de navegação
  // persistente por cima brigaria com a experiência imersiva do player,
  // então o header simplesmente não renderiza nessa rota (mobile e desktop
  // — antes eram dois `if` iguais, um em cada componente; agora é um só).
  // Depois de todos os hooks (Rules of Hooks: um `return null` condicional
  // ANTES dos useState quebraria a ordem deles entre renders, já que
  // `pathname` pode mudar sem desmontar este componente — ele vive no
  // layout, não na página).
  if (pathname.startsWith('/membros/player')) return null;

  return (
    // Fragment: o header fixo em si + a barra de busca mobile (segunda
    // div fixa, mt-14 — precisa ser irmã do header, não filha, porque sua
    // altura entra na conta de quanto o <main> precisa "descer" enquanto
    // aberta; ver comentário dela abaixo e de MembrosChrome.tsx).
    <>
      {/* fixed + z-30: sempre no topo, em toda página, nas duas larguras
          (sem `hidden`/`md:hidden` — antes eram dois componentes que se
          excluíam por breakpoint, agora é um só, sempre montado).
          Transparente no topo (scroll = 0) / bg-black/95 rolado, com
          transição suave.

          h-14 (mobile, 56px) + px-4 py-3 (igual ao MobileHeader antigo) /
          md:h-24 (desktop, 96px) + md:px-16 md:py-6 (igual ao DesktopHeader
          antigo) — gap-3/md:gap-6 entre os grupos (esquerda/direita no
          mobile; logo/nav/direita no desktop). */}
      <div
        className={cn(
          'fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 px-4 py-3 transition-colors duration-[250ms] ease-out md:h-24 md:gap-6 md:px-16 md:py-6',
          scrolled ? 'bg-black/95' : 'bg-transparent'
        )}
      >
      {/* Mobile (md:hidden): favicon + "Início", sempre visível — não a
          logo completa "MEMBERSFLIX" (essa é só desktop, ao lado). */}
      <Link href="/membros/vitrine" aria-label="Início" className="flex shrink-0 items-center gap-2 drop-shadow-md md:hidden">
        <Image src="/imagens/logohome.png" alt="" width={28} height={28} className="h-7 w-auto object-contain" />
        <span className="text-base font-bold text-white">Início</span>
      </Link>

      {/* Desktop/tablet (hidden md:block): logo completa, como já era. */}
      <Link href="/membros/vitrine" className="hidden shrink-0 drop-shadow-md md:block">
        <Image src="/logo.png" alt="MembersFlix" width={140} height={32} priority className="h-[1.7rem] w-auto object-contain" />
      </Link>

      {/* Navegação em linha — só desktop/tablet (hidden md:flex); no mobile
          quem navega entre seções é a BottomNav (fixed embaixo), sem
          duplicar aqui. */}
      <nav className="hidden shrink-0 items-center gap-2 md:flex">
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

      {/* Grupo de ícones: busca, filtro (categoria/instrutor, painel
          próprio) e perfil (botão com menu — "Meu Perfil"/"Sair"). Filtro e
          perfil são IDÊNTICOS nas duas larguras, mesmo componente/
          comportamento, sem `hidden` nenhum — cada painel resolve sua
          própria apresentação por breakpoint por dentro (FiltroModal.tsx:
          dropdown no desktop, bottom sheet no mobile). Busca é a exceção
          (pedido explícito): o ícone/UI mudam de verdade por largura — ver
          os dois blocos logo abaixo (botão mobile + div desktop, cada um
          com seu `hidden`/`md:hidden`/`md:flex`). Botões circulares
          2.25rem (h-9 w-9), fundo transparente, cor branca a 70%
          (text-white/70) — vira branco sólido + fundo branco a 10% no
          hover, com a mesma transição de 0.25s/ease dos links do menu.
          gap-3 = 0.75rem entre os três. */}
      <div className="flex flex-1 items-center justify-end gap-3">
        {/* Mobile: ícone único (md:hidden) que alterna Search/X — abre/fecha
            a barra de busca de largura total logo abaixo do header (fixed,
            fora deste grupo, ver bloco depois deste <div> do header). Não é
            o mesmo botão/estado do desktop ao lado (buscaAberta): lá o
            input expande inline, aqui é uma barra separada que empurra o
            <main> pra baixo (item explícito do pedido) — por isso os dois
            convivem sem se misturar, cada um só no seu breakpoint. */}
        <button
          type="button"
          onClick={() => onBuscaMobileAbertaChange(!buscaMobileAberta)}
          aria-label={buscaMobileAberta ? 'Fechar busca' : 'Buscar cursos'}
          aria-expanded={buscaMobileAberta}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-transparent text-white/70 [transition:color_0.25s_ease,background-color_0.25s_ease] hover:bg-white/10 hover:text-white md:hidden"
        >
          {buscaMobileAberta ? <X size={20} /> : <Search size={20} />}
        </button>

        {/* Desktop: ícone + input expansível inline — inalterado, só ganhou
            `hidden md:flex` (era `flex` incondicional) pra não competir com
            o botão mobile acima, que cobre o mesmo papel só que com uma
            apresentação totalmente diferente nessa largura. */}
        <div
          ref={buscaWrapRef}
          className={cn(
            'hidden items-center rounded-full [transition:background-color_0.25s_ease] md:flex',
            buscaAberta && 'bg-white/10'
          )}
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
            onClick={() => onFiltroModalAbertoChange(!filtroModalAberto)}
            aria-label="Filtrar cursos"
            aria-expanded={filtroModalAberto}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full bg-transparent [transition:color_0.25s_ease,background-color_0.25s_ease] hover:bg-white/10 hover:text-white',
              filtroAtivo ? 'text-primary' : 'text-white/70'
            )}
          >
            <SlidersHorizontal size={20} />
          </button>

          <FiltroModal
            open={filtroModalAberto}
            onClose={() => onFiltroModalAbertoChange(false)}
            categorias={categorias}
            instrutores={instrutores}
            categoriaIdsAtivos={categoriaIds}
            instrutorNomesAtivos={instrutorNomes}
            onApply={handleAplicarFiltros}
          />
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
              mesmo padrão visual do resto do dropdown já usado na
              plataforma (bg-surface-high). Só "Sair da conta" agora ("Meu
              Perfil" removido por pedido explícito — a rota
              /membros/perfil segue acessível pelo item de navegação do
              desktop, logo acima, e pelo BottomNav no mobile, então não
              ficou órfã). Rótulo "Sair da conta" (era só "Sair") por
              pedido explícito — mesmo texto que o botão de sair da tela de
              perfil (app/membros/perfil/page.tsx) já usa. */}
          {perfilMenuAberto && (
            <div className="absolute right-0 top-full z-30 mt-3 w-48 overflow-hidden rounded-lg border border-white/10 bg-surface-high shadow-overlay">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-error transition-colors duration-200 hover:bg-white/10"
              >
                <LogOut size={16} /> Sair da conta
              </button>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Barra de busca mobile — segunda faixa fixa, colada embaixo do
          header (top-14, logo abaixo dos 56px dele), md:hidden (no desktop
          a busca continua só a inline acima, item explícito do pedido).
          w-full: ocupa 100% da largura da tela (item 1). Animação de
          abertura via grid-template-rows 0fr -> 1fr (grid-rows-[0fr] /
          grid-rows-[1fr]): jeito só-CSS de animar até uma altura "auto" sem
          precisar medir pixels em JS — o <div> logo dentro precisa de
          min-h-0 + overflow-hidden pra essa técnica funcionar (senão o
          conteúdo não encolhe abaixo da própria altura intrínseca). h-9
          (36px) no input + py-2.5 (10px em cima/embaixo) = 56px de conteúdo
          quando aberta — mesma altura do header (h-14) —, por isso
          pt-28 (14+14) é exatamente o valor certo que MembrosChrome.tsx
          soma no <main> enquanto isso estiver aberto (empurra o conteúdo
          pra baixo em vez de sobrepor os cards, item 5 do pedido). */}
      <div
        className={cn(
          'fixed inset-x-0 top-14 z-30 grid transition-[grid-template-rows] duration-300 ease-out md:hidden',
          buscaMobileAberta ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-4 py-2.5">
            {/* Sem botão de fechar dentro do input: o próprio ícone no
                header (acima) já vira um X enquanto isso está aberto — um
                segundo "X" aqui dentro seria redundante (o pedido permite
                UM dos dois, não os dois juntos). */}
            <input
              ref={buscaMobileInputRef}
              type="text"
              inputMode="search"
              autoComplete="off"
              value={busca}
              onChange={(e) => handleBuscaChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (buscaDebounceRef.current) clearTimeout(buscaDebounceRef.current);
                  irParaBusca({});
                  onBuscaMobileAbertaChange(false);
                }
                if (e.key === 'Escape') {
                  if (buscaDebounceRef.current) clearTimeout(buscaDebounceRef.current);
                  onBuscaMobileAbertaChange(false);
                }
              }}
              placeholder="Buscar cursos..."
              aria-label="Buscar cursos"
              className="h-9 w-full rounded-full border-0 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-white/50 focus:ring-1 focus:ring-white/20"
            />
          </div>
        </div>
      </div>
    </>
  );
}
