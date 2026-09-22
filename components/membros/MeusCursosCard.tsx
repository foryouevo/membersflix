'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import Carousel from '@/components/membros/Carousel';
import CardTitulo from '@/components/membros/CardTitulo';
import { cn, formatTitulo } from '@/lib/utils';

// Largura de cada card do carrossel — 1 por vez no mobile (<lg), EXATAMENTE
// 3 a partir de lg (pedido explícito desta tarefa). calc((100%-2rem)/3) em
// vez de uma porcentagem fixa tipo 31% (era assim antes, mesma conta
// aproximada que CursosRecomendados.tsx ainda usa): 31% era só uma
// ESTIMATIVA pra "sobrar espaço pro gap sem estourar 100%" — sub-
// dimensionava os cards (sobrava vão vazio: 3×31%=93%, faltando 7% de
// largura) e, dependendo da largura real do container, também podia
// deixar entrar uma tira do 4º card. calc() calcula o valor EXATO: 100%
// menos os 2 gaps de 1rem/16px entre os 3 cards (gap-4 do trackClassName,
// já dentro da faixa 16-20px pedida — mantido), dividido por 3 — os 3
// cards preenchem 100% da linha, nem mais nem menos, sem sobra nem 4º
// card cortado.
const ITEM_BASIS_CLASSES = 'flex-[0_0_100%] lg:flex-[0_0_calc((100%-2rem)/3)]';

export type MeuCursoItem = {
  id: string;
  // Pra montar o link pro curso por slug (/curso/[slug] — pedido de uma
  // tarefa posterior, era /membros/curso/[id]) sem precisar do id.
  slug: string;
  titulo: string;
  thumbnail_url: string | null;
  capa_url: string | null;
  instrutor_nome: string | null;
  categoriaNome: string | null;
  bloqueado: boolean;
  // Novos nesta tarefa (redesign seguindo a imagem de referência) — dados
  // reais já calculados em app/membros/perfil/page.tsx (mesmos mapas usados
  // pras métricas do topo), não inventados: total de aulas do curso e
  // progresso individual do aluno nele (%).
  totalAulas: number;
  progressoPct: number;
};

/**
 * "Meu(s) Curso(s)" da tela de Perfil — client component por causa dos
 * estados locais: categoria selecionada, busca por texto e se a busca/o
 * filtro estão abertos (nenhum deles existe em outro lugar pra
 * reaproveitar; exclusivos deste card, não afetam nenhuma outra tela —
 * pedido explícito).
 *
 * Categoria: "Todos" + uma opção por categoria REAL entre os cursos que o
 * aluno possui (liberados ou bloqueados) — nunca uma lista fixa/inventada.
 * Combina com a busca por texto já existente (E, não OU): a categoria
 * restringe o universo, a busca filtra dentro dele.
 *
 * `lg:h-full` no card + `lg:flex-1 lg:justify-center` na área de resultado
 * (pedido desta tarefa — numa tarefa anterior isso tinha sido removido pra
 * matar um retângulo vazio embaixo do carrossel, mas aí a coluna esquerda
 * passava a terminar mais curta que a direita): o card volta a ocupar a
 * altura cheia da coluna (ver app/membros/perfil/page.tsx), só que agora o
 * carrossel fica CENTRALIZADO verticalmente dentro do espaço disponível —
 * a sobra de altura (quando a coluna direita tem mais conteúdo) vira
 * respiro simétrico em cima/embaixo do carrossel, não mais um bloco vazio
 * concentrado só no final.
 *
 * Busca/filtro por trás de ícones (pedido de uma tarefa anterior, no lugar
 * do campo fixo + abas que ficavam sempre visíveis): mesmo estado/lógica de
 * sempre (`busca`, `abaCategoria` — nada mudou em COMO filtram, só em como
 * os controles aparecem). Ícone de filtro reaproveita o mesmo
 * SlidersHorizontal do menu superior (Header.tsx) pra manter o padrão
 * visual, mas com um dropdown próprio aqui — mais simples que o
 * <FiltroModal> do header (que é multi-seleção categoria+instrutor
 * navegando por URL); este é local, categoria única, mesma escolha que as
 * abas antigas já ofereciam.
 *
 * Listagem em CARROSSEL (pedido de uma tarefa anterior, no lugar do
 * grid+paginação numérica de antes) — reaproveita o Carousel.tsx já
 * existente na plataforma (Embla: setas + swipe/drag), o MESMO usado em
 * "Cursos Recomendados" logo abaixo (ver CursosRecomendados.tsx) — o
 * pedido citava "Swiper.js", mas essa lib nunca foi dependência deste
 * projeto (só embla-carousel-react está instalada, documentado ali
 * mesmo); reaproveitar o carrossel que já existe em vez de introduzir uma
 * segunda lib pro mesmo papel segue a restrição explícita de não duplicar
 * componentes. 1 curso por vez abaixo de lg, 3 a partir de lg (ver
 * ITEM_BASIS_CLASSES) — a lógica de busca/filtro em si não muda nada, só
 * a forma de exibir o resultado.
 *
 * Setas do carrossel: `hideHeader` faz o Carousel não desenhar seu
 * cabeçalho/setas internos; `navControlsRef` expõe as MESMAS funções de
 * navegação (nada duplicado) pros botões deste componente chamarem;
 * `onPodeNavegarChange` espelha se há pra onde navegar, controlando se as
 * setas aparecem. Duas posições diferentes por breakpoint (pedido de uma
 * tarefa posterior): a partir de lg, na linha do título, junto da
 * lupa/filtro (`hidden lg:flex`). No mobile, essa linha já não tem folga
 * (ocupada por busca/filtro), então as setas vão SOBREPOSTAS nas laterais
 * do carrossel (`lg:hidden`, fundo bg-black/60 — ver JSX mais abaixo) —
 * ADICIONAL ao swipe por toque, que continua funcionando normalmente.
 */
export default function MeusCursosCard({ cursos }: { cursos: MeuCursoItem[] }) {
  const [busca, setBusca] = useState('');
  const [abaCategoria, setAbaCategoria] = useState('Todos');
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [filtroAberto, setFiltroAberto] = useState(false);
  const filtroWrapRef = useRef<HTMLDivElement>(null);
  // Ponte com o Carousel (ver comentário acima e em Carousel.tsx): ref
  // imperativa com as funções de navegação (populada pelo próprio
  // Carousel) + estado espelhado de "tem pra onde navegar", que decide se
  // as setas aparecem aqui no cabeçalho.
  const carrosselNavRef = useRef<{ irParaAnterior: () => void; irParaProxima: () => void } | null>(null);
  const [carrosselPodeNavegar, setCarrosselPodeNavegar] = useState(false);

  const categorias = useMemo(() => {
    const nomes = new Set(cursos.map((c) => c.categoriaNome).filter((n): n is string => !!n));
    return ['Todos', ...Array.from(nomes).sort((a, b) => a.localeCompare(b))];
  }, [cursos]);

  const filtrados = useMemo(() => {
    const porCategoria = abaCategoria === 'Todos' ? cursos : cursos.filter((c) => c.categoriaNome === abaCategoria);
    const termo = busca.trim().toLowerCase();
    if (!termo) return porCategoria;
    return porCategoria.filter((c) => [c.titulo, c.categoriaNome, c.instrutor_nome].some((campo) => campo?.toLowerCase().includes(termo)));
  }, [cursos, abaCategoria, busca]);

  function handleBuscaChange(value: string) {
    setBusca(value);
  }

  function handleAbaChange(aba: string) {
    setAbaCategoria(aba);
  }

  // Fecha o campo de busca expandido e limpa o termo — reabrir sempre
  // parte de um campo vazio (mesma sensação de "abrir a busca do zero" do
  // ícone equivalente no Header, ver components/membros/Header.tsx).
  function handleFecharBusca() {
    setBuscaAberta(false);
    handleBuscaChange('');
  }

  // Fecha o dropdown de categoria ao clicar fora dele ou apertar Esc —
  // mesmo padrão já usado pro painel de filtro do Header (filtroWrapRef
  // lá, ver Header.tsx).
  useEffect(() => {
    if (!filtroAberto) return;
    function handleClickFora(e: MouseEvent) {
      if (filtroWrapRef.current && !filtroWrapRef.current.contains(e.target as Node)) setFiltroAberto(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setFiltroAberto(false);
    }
    document.addEventListener('mousedown', handleClickFora);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickFora);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [filtroAberto]);

  return (
    // lg:flex lg:h-full lg:flex-col DE VOLTA (pedido desta tarefa): uma
    // tarefa anterior tinha removido isso pra matar um retângulo vazio que
    // sobrava embaixo do carrossel — mas aí a coluna esquerda passava a
    // terminar mais curta que a direita, o que essa tarefa pediu pra
    // corrigir. A diferença agora é ONDE a sobra de altura vai: o cabeçalho
    // fica lg:shrink-0 (tamanho fixo) e a área de baixo (cabeçalho ao
    // carrossel) é lg:flex-1 lg:justify-center — ela SIM estica até o teto
    // da coluna (igualando a altura com a direita), mas com o carrossel
    // centralizado dentro dela, em vez de "colado" no topo com um bloco de
    // vazio sobrando embaixo. É respiro simétrico (em cima e embaixo do
    // carrossel), não mais uma sobra concentrada no final — sem inventar
    // conteúdo que não existe (a lógica do carrossel/busca/filtro continua
    // idêntica) pra "preencher" um espaço que só existe porque a coluna
    // vizinha tem mais conteúdo.
    <div className="rounded-lg bg-card p-5 lg:flex lg:h-full lg:flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 lg:shrink-0">
        <CardTitulo>Meu(s) Curso(s)</CardTitulo>

        {cursos.length > 0 && (
          <div className="flex items-center gap-2">
            {/* Busca: ícone <-> campo expansível (mesmo comportamento do
                ícone de busca do Header em telas largas) — a lógica de
                busca em si (`busca`/handleBuscaChange) não muda nada, só a
                forma como o campo aparece. */}
            <div
              className={cn(
                'flex items-center rounded-full [transition:background-color_0.25s_ease]',
                buscaAberta && 'bg-surface-high'
              )}
            >
              {buscaAberta ? (
                <>
                  <Search size={16} className="ml-3 shrink-0 text-on-variant" />
                  <input
                    autoFocus
                    type="text"
                    value={busca}
                    onChange={(e) => handleBuscaChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Escape' && handleFecharBusca()}
                    placeholder="Buscar por curso, categoria ou instrutor..."
                    className="w-40 bg-transparent px-2 py-1.5 text-sm text-white outline-none placeholder:text-on-variant sm:w-56"
                  />
                  <button
                    type="button"
                    onClick={handleFecharBusca}
                    aria-label="Fechar busca"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-variant transition-colors hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setBuscaAberta(true)}
                  aria-label="Buscar cursos"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-high text-on-variant transition-colors hover:bg-surface-container hover:text-white"
                >
                  <Search size={18} />
                </button>
              )}
            </div>

            {/* Filtro de categoria — só aparece se houver mais de 1
                categoria real entre os cursos do aluno (mesma condição de
                quando isso eram abas: com só "Todos" pra mostrar, o filtro
                não ajudaria em nada). */}
            {categorias.length > 2 && (
              <div ref={filtroWrapRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setFiltroAberto((v) => !v)}
                  aria-label="Filtrar por categoria"
                  aria-expanded={filtroAberto}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full bg-surface-high transition-colors hover:bg-surface-container hover:text-white',
                    abaCategoria !== 'Todos' ? 'text-primary' : 'text-on-variant'
                  )}
                >
                  <SlidersHorizontal size={18} />
                </button>

                {filtroAberto && (
                  <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-lg border border-border/60 bg-card p-1.5 shadow-overlay">
                    {categorias.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          handleAbaChange(cat);
                          setFiltroAberto(false);
                        }}
                        className={cn(
                          'block w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                          abaCategoria === cat ? 'bg-primary text-white' : 'text-on-variant hover:bg-surface-high hover:text-white'
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Setas do carrossel NA LINHA DO TÍTULO — só a partir de lg.
                Mesmo estilo circular (h-9 w-9, bg-surface-high) da
                lupa/filtro ao lado. Diferente de "Cursos Recomendados"
                (que tem essa mesma linha livre em qualquer largura): aqui
                o mobile já usa esse espaço pros ícones de busca/filtro, sem
                folga pras setas também — por isso no mobile elas vão
                SOBREPOSTAS nas laterais do carrossel, mais abaixo (pedido
                desta tarefa), não aqui. Só aparecem quando o Carousel
                avisa (via onPodeNavegarChange) que há mais cursos do que
                cabem de uma vez. irParaAnterior/irParaProxima vêm do
                próprio Carousel (navControlsRef, ver Carousel.tsx) —
                nenhuma lógica de navegação duplicada aqui. */}
            {carrosselPodeNavegar && (
              <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
                <button
                  type="button"
                  onClick={() => carrosselNavRef.current?.irParaAnterior()}
                  aria-label="Cursos anteriores"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-high text-on-variant transition-colors hover:bg-surface-container hover:text-white"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => carrosselNavRef.current?.irParaProxima()}
                  aria-label="Próximos cursos"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-high text-on-variant transition-colors hover:bg-surface-container hover:text-white"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* lg:justify-center: quando a coluna reserva mais altura do que o
          carrossel (1 linha, altura fixa) realmente precisa, a sobra fica
          dividida em cima/embaixo dele em vez de virar um bloco vazio só
          no final (ver comentário no topo do componente). lg:min-w-0: este
          bloco volta a ser item de um flex container (o card, lg:flex-col
          de novo) — mesma proteção contra overflow de largura já aplicada
          nos outros elos dessa cadeia numa tarefa anterior. */}
      <div className="lg:flex lg:min-h-0 lg:min-w-0 lg:flex-1 lg:flex-col lg:justify-center">
        {cursos.length === 0 ? (
          <p className="text-sm text-on-variant">Você ainda não possui cursos.</p>
        ) : filtrados.length === 0 ? (
          <p className="text-sm text-on-variant">Nenhum curso encontrado para "{busca}".</p>
        ) : (
          <div className="relative">
            <Carousel
              items={filtrados}
              getKey={(curso) => curso.id}
              title={null}
              emptyMessage="Você ainda não possui cursos."
              // w-full min-w-0 no outer/viewport (mesmo ajuste preventivo
              // feito em CursosRecomendados.tsx, que teve esse bug de
              // overflow de verdade nesta tarefa): garante que o Carousel
              // nunca tente crescer além da largura que este card já
              // reservou pra ele, mesmo que a lista de "Meus Cursos" cresça
              // bastante.
              outerClassName="flex w-full min-w-0 flex-col"
              viewportClassName="w-full min-w-0 overflow-hidden"
              trackClassName="flex gap-4 px-2 py-2"
              itemClassName={`${ITEM_BASIS_CLASSES} min-w-0`}
              // hideHeader: as setas do desktop ficam no cabeçalho lá em
              // cima, junto da lupa/filtro — sem isso sobraria aqui uma
              // linha vazia (era exatamente o "espaço que sobrava" de uma
              // tarefa anterior).
              hideHeader
              navControlsRef={carrosselNavRef}
              onPodeNavegarChange={setCarrosselPodeNavegar}
              renderItem={(curso) => <CardMeuCurso curso={curso} />}
            />

            {/* Setas SOBREPOSTAS nas laterais do carrossel — só no mobile
                (lg:hidden; a partir de lg as setas já estão na linha do
                título, ver acima). Pedido desta tarefa: aqui não há espaço
                na linha do título pras setas (já ocupada por busca/
                filtro), então elas vão por cima da própria área dos
                cards, padrão "Netflix" — fundo preto semi-transparente
                (bg-black/60, não bg-surface-high como as outras) pra
                não se confundir com a thumbnail colorida por trás, em
                qualquer curso. ADICIONAL ao swipe por toque, que continua
                funcionando normalmente (o Embla não distingue a origem do
                scroll) — mesmas funções irParaAnterior/irParaProxima do
                Carousel (navControlsRef), nenhuma lógica de navegação
                duplicada. z-10 garante que ficam acima das thumbnails. */}
            {carrosselPodeNavegar && (
              <>
                <button
                  type="button"
                  onClick={() => carrosselNavRef.current?.irParaAnterior()}
                  aria-label="Cursos anteriores"
                  className="absolute left-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 lg:hidden"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => carrosselNavRef.current?.irParaProxima()}
                  aria-label="Próximos cursos"
                  className="absolute right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 lg:hidden"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Card do grid (item 4 do pedido) — não reaproveita CourseCard.tsx (o card
// de curso "oficial" usado na Home/Busca/Meus Cursos) porque os campos
// exibidos aqui são diferentes (categoria + nº de aulas, progresso em %
// sempre visível) e mudar CourseCard pra isso afetaria aquelas outras
// telas, fora do escopo deste pedido. Reaproveita sim o comportamento de
// navegação (Link direto pra /curso/[slug] — essa página já resolve
// sozinha o caso de curso bloqueado, sem precisar de modal aqui).
function CardMeuCurso({ curso }: { curso: MeuCursoItem }) {
  const imagem = curso.thumbnail_url || curso.capa_url;
  return (
    // curso.slug || fallback pro id: mesma proteção de CourseCard.tsx —
    // enquanto a migration 011 (coluna slug) não rodar em produção,
    // curso.slug chega undefined aqui também.
    <Link href={curso.slug ? `/curso/${curso.slug}` : `/membros/curso/${curso.id}`} className="group block">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-surface-high">
        {imagem ? (
          <Image
            src={imagem}
            alt={curso.titulo}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes="320px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-on-variant">
            <Play size={24} />
          </div>
        )}
        <span
          className={cn(
            'absolute left-2 top-2 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide',
            curso.bloqueado ? 'bg-secondary-container text-secondary' : 'bg-primary text-white'
          )}
        >
          {curso.bloqueado ? 'Bloqueado' : 'Liberado'}
        </span>
      </div>

      <p className="mt-2 truncate text-[0.7rem] font-semibold uppercase tracking-wide text-on-variant">
        {curso.categoriaNome ?? 'Sem categoria'} · {curso.totalAulas} {curso.totalAulas === 1 ? 'aula' : 'aulas'}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-white">{formatTitulo(curso.titulo)}</p>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-high">
          <div className="h-full rounded-full bg-primary" style={{ width: `${curso.progressoPct}%` }} />
        </div>
        <span className="shrink-0 text-[0.7rem] text-on-variant">Concluído {curso.progressoPct}%</span>
      </div>
    </Link>
  );
}
