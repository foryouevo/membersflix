'use client';

import { useState } from 'react';
import AccessModal from '@/components/membros/AccessModal';
import HomeSearchFilter from '@/components/membros/HomeSearchFilter';
import TodosCursosPorCategoria from '@/components/membros/TodosCursosPorCategoria';
import { useCursoFiltro } from '@/hooks/useCursoFiltro';
import type { Curso } from '@/types';

// Tela de busca dedicada — acessada pelo ícone de lupa no bottom nav
// (mobile, BottomNav.tsx) e pela busca/filtro do DesktopHeader (desktop —
// que só navega pra cá, não filtra nada por conta própria). Sem banner/hero
// e sem "Meus Cursos" de propósito: só busca + filtro (sempre visíveis,
// largura cheia) e "Todos os Cursos" já filtrado, agrupado por categoria.
// Mesma lógica de filtro/agrupamento da Home (useCursoFiltro), só que aqui
// ela está sempre "em uso" — não existe estado "sem busca ativa" nessa
// tela, é isso que ela é. Pode chegar já semeada via URL (?q=/categoria=/
// instrutor=) quando quem mandou pra cá foi o DesktopHeader — ver
// buscaInicial/categoriaIdsInicial/instrutorNomesInicial abaixo.
export default function BuscarPageClient({
  todosCursos,
  acessos,
  progressoPorCurso,
  numeroWhatsapp,
  buscaInicial,
  categoriaIdsInicial,
  instrutorNomesInicial,
}: {
  todosCursos: Curso[];
  acessos: Record<string, boolean>;
  progressoPorCurso: Record<string, number>;
  numeroWhatsapp: string | null;
  // Semente do filtro vinda da URL (?q=/categoria=/instrutor=) — ver
  // app/membros/buscar/page.tsx. O DesktopHeader manda o aluno pra cá já
  // com isso preenchido; o ícone de lupa do bottom nav mobile não passa
  // nada, então chega tudo vazio (comportamento de sempre).
  buscaInicial?: string;
  categoriaIdsInicial?: string[];
  instrutorNomesInicial?: string[];
}) {
  const [modalCurso, setModalCurso] = useState<Curso | null>(null);

  const {
    busca,
    setBusca,
    categoriaFiltro,
    toggleCategoriaFiltro,
    instrutorFiltro,
    toggleInstrutorFiltro,
    limparFiltros,
    filtroAtivo,
    categoriasDisponiveis,
    instrutoresDisponiveis,
    gruposPorCategoria,
  } = useCursoFiltro(todosCursos, undefined, {
    busca: buscaInicial,
    categoriaIds: categoriaIdsInicial,
    instrutorNomes: instrutorNomesInicial,
  });

  return (
    <div className="px-4 py-6 pb-12 sm:px-16">
      {/* pb-24 extra do <main> (app/membros/layout.tsx) já cobre a bottom
          nav flutuante — nada específico pra fazer aqui além do padding
          normal da página. */}
      <div className="mb-6">
        <HomeSearchFilter
          query={busca}
          onQueryChange={setBusca}
          categorias={categoriasDisponiveis}
          categoriaIds={categoriaFiltro}
          onToggleCategoria={toggleCategoriaFiltro}
          instrutores={instrutoresDisponiveis}
          instrutorNomes={instrutorFiltro}
          onToggleInstrutor={toggleInstrutorFiltro}
          onLimparFiltros={limparFiltros}
          fullWidth
        />
      </div>

      <TodosCursosPorCategoria
        titulo="Todos os Cursos"
        grupos={gruposPorCategoria}
        acessos={acessos}
        progressoPorCurso={progressoPorCurso}
        onClickLocked={setModalCurso}
        emptyMessage={filtroAtivo ? 'Nenhum curso encontrado com esse filtro.' : 'Digite algo ou use os filtros pra buscar um curso.'}
      />

      <AccessModal open={!!modalCurso} onClose={() => setModalCurso(null)} curso={modalCurso} numeroWhatsapp={numeroWhatsapp} />
    </div>
  );
}
