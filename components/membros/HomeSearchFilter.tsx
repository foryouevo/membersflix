'use client';

import { useEffect, useRef, useState } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Busca (por título) + filtro (categoria/instrutor, seleção múltipla) —
// reaproveitada no DesktopHeader (barra fixa no topo, desktop/tablet — só
// navega pra tela de busca, não filtra nada por conta própria) e na tela de
// busca dedicada (BuscarPageClient — `fullWidth`, filtra de verdade). Estado
// controlado pelo pai, que decide o que fazer com ele; este componente só é
// a UI. Mesmo padrão de dropdown com click-outside já usado no menu do
// avatar (UserAvatarMenu — menuRef + listener de mousedown), reaproveitado
// aqui pro painel de filtro. Sem padding/posicionamento de página aqui —
// quem posiciona é o componente pai.
export default function HomeSearchFilter({
  query,
  onQueryChange,
  categorias,
  categoriaIds,
  onToggleCategoria,
  instrutores,
  instrutorNomes,
  onToggleInstrutor,
  onLimparFiltros,
  fullWidth = false,
  onSubmit,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  categorias: { id: string; nome: string }[];
  categoriaIds: string[];
  onToggleCategoria: (id: string) => void;
  instrutores: string[];
  instrutorNomes: string[];
  onToggleInstrutor: (nome: string) => void;
  onLimparFiltros: () => void;
  // Home (padrão, false): input com largura fixa (w-56), flutuando sobre o
  // banner. Tela de busca dedicada (true): input ocupa 100% do espaço
  // disponível, lado a lado com o botão de filtro — pedido explícito da
  // tarefa ("ocupando 100% da largura disponível").
  fullWidth?: boolean;
  // Opcional: Enter no input dispara isso. Home/tela de busca filtram em
  // tempo real (useMemo a cada tecla) e não precisam disso; o DesktopHeader
  // usa pra navegar pra /membros/buscar só quando o aluno confirma a busca
  // (não a cada tecla — aqui não tem lista local pra filtrar de verdade).
  onSubmit?: () => void;
}) {
  const [filtroAberto, setFiltroAberto] = useState(false);
  const filtroRef = useRef<HTMLDivElement>(null);
  const filtroAtivo = categoriaIds.length > 0 || instrutorNomes.length > 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filtroRef.current && !filtroRef.current.contains(e.target as Node)) {
        setFiltroAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('flex items-center gap-2', fullWidth && 'w-full')}>
      {/* Sem debounce de propósito: o volume de cursos da plataforma é
          pequeno (dezenas, não milhares), então filtrar em cada tecla via
          useMemo no pai já é instantâneo — debounce só adicionaria
          complexidade sem ganho perceptível aqui. */}
      <div className={cn('relative min-w-0', fullWidth && 'flex-1')}>
        {/* z-10 + ícone depois de conferir: em alguns navegadores
            `input[type=search]` aplica `-webkit-appearance: searchfield`,
            que reserva o próprio padding/decoração nativa por cima do
            conteúdo absoluto e escondia esse ícone — por isso o input
            abaixo usa type="text" (com inputMode="search" só pra manter o
            teclado de busca no mobile), sem esse estilo nativo brigando com
            o SVG. */}
        <Search size={14} className="pointer-events-none absolute left-[0.925rem] top-1/2 z-10 -translate-y-1/2 text-on-variant" />
        <input
          type="text"
          inputMode="search"
          autoComplete="off"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit?.();
          }}
          placeholder="Buscar cursos..."
          aria-label="Buscar curso"
          // bg-surface-high = mesmo #2a2a2a pedido (token já existente no
          // tema, ver tailwind.config.ts) — sem border (border-0). Fundo
          // opaco agora, então o backdrop-blur de antes não fazia mais
          // sentido (só tem efeito sobre fundo translúcido) e saiu. Focus
          // vira ring (box-shadow), não border — com border-0 uma mudança
          // só de border-color no focus não apareceria.
          // py-[0.775rem] é só mobile (abaixo de 640px — mesmo corte
          // base/sm: já usado no resto deste componente); sm:py-[0.575rem]
          // restaura o padding vertical original a partir daí, então
          // desktop/tablet (onde esse input só aparece flutuando sobre o
          // banner, hidden md:block no VitrinePageClient) não muda em nada.
          className={cn(
            'rounded-full border-0 bg-surface-high py-[0.775rem] pl-10 pr-2 text-xs text-white placeholder:text-on-variant focus:outline-none focus:ring-1 focus:ring-primary sm:py-[0.575rem] sm:text-sm',
            fullWidth ? 'w-full' : 'w-56'
          )}
        />
      </div>

      <div ref={filtroRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setFiltroAberto((v) => !v)}
          aria-label="Filtrar cursos"
          aria-expanded={filtroAberto}
          className={cn(
            // h-10 w-10 (2.5rem) é só mobile (abaixo de 640px); sm:h-9 sm:w-9
            // mantém o tamanho original a partir daí — desktop/tablet
            // (onde esse botão só aparece junto do input flutuante sobre o
            // banner, hidden md:block no VitrinePageClient) não muda em nada.
            'flex h-10 w-10 items-center justify-center rounded-full border-0 transition-colors sm:h-9 sm:w-9',
            // Ativo mantém o vermelho de destaque já usado — só o inativo
            // (padrão) usa o novo #2a2a2a (bg-surface-high) do item 3.
            filtroAtivo ? 'bg-primary/20 text-primary' : 'bg-surface-high text-on-variant hover:text-white'
          )}
        >
          <Filter size={14} />
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
                        onChange={() => onToggleCategoria(c.id)}
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
                        onChange={() => onToggleInstrutor(nome)}
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
                onClick={onLimparFiltros}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <X size={12} /> Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
