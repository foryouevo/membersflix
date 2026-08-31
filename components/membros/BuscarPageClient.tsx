'use client';

import { useState } from 'react';
import AccessModal from '@/components/membros/AccessModal';
import HomeSearchFilter from '@/components/membros/HomeSearchFilter';
import TodosCursosPorCategoria from '@/components/membros/TodosCursosPorCategoria';
import { useCursoFiltro } from '@/hooks/useCursoFiltro';
import type { Curso } from '@/types';

// Tela de busca dedicada (mobile) — acessada pelo ícone de lupa no bottom
// nav (MembrosSidebar). Sem banner/hero e sem "Meus Cursos" de propósito:
// só busca + filtro (sempre visíveis, largura cheia — ao contrário da barra
// flutuante compacta da Home) e "Todos os Cursos" já filtrado, agrupado por
// categoria. Mesma lógica de filtro/agrupamento da Home (useCursoFiltro),
// só que aqui ela está sempre "em uso" — não existe estado "sem busca
// ativa" nessa tela, é isso que ela é.
export default function BuscarPageClient({
  todosCursos,
  acessos,
  progressoPorCurso,
  numeroWhatsapp,
}: {
  todosCursos: Curso[];
  acessos: Record<string, boolean>;
  progressoPorCurso: Record<string, number>;
  numeroWhatsapp: string | null;
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
  } = useCursoFiltro(todosCursos);

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
