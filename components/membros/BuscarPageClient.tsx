'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AccessModal from '@/components/membros/AccessModal';
import TodosCursosPorCategoria from '@/components/membros/TodosCursosPorCategoria';
import { filtrarCursos, agruparPorCategoria } from '@/hooks/useCursoFiltro';
import type { Curso } from '@/types';

// Tela de busca dedicada — acessada pelo ícone de lupa do bottom nav mobile
// e pela busca/filtro do Header (comum às duas larguras agora). Sem
// banner/hero e sem "Meus Cursos" de propósito: só "Todos os Cursos" já
// filtrado, agrupado por categoria.
//
// Puramente "de leitura": não tem UI própria de busca/filtro nesta página
// nenhuma largura de tela — o único jeito de mudar busca/categoria/
// instrutor é o Header (que escreve na URL e navega pra cá). Isso evitava
// duplicar a mesma UI (antes o mobile tinha um HomeSearchFilter próprio
// aqui, porque o header mobile da época não tinha busca/filtro nenhum —
// removido junto da unificação do header). O estado vem direto da URL
// (useSearchParams, ?q=/categoria=/instrutor=) — como esse hook é reativo,
// a tela refiltra sozinha a cada mudança na URL, sem precisar remontar, o
// que também é o que faz o estado sobreviver a reload e ser compartilhável
// por link.
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
  const searchParams = useSearchParams();

  const busca = searchParams.get('q') ?? '';
  const categoriaIds = useMemo(() => searchParams.get('categoria')?.split(',').filter(Boolean) ?? [], [searchParams]);
  const instrutorNomes = useMemo(() => searchParams.get('instrutor')?.split(',').filter(Boolean) ?? [], [searchParams]);
  const filtroAtivo = busca.trim() !== '' || categoriaIds.length > 0 || instrutorNomes.length > 0;

  const cursosFiltrados = useMemo(
    () => filtrarCursos(todosCursos, { busca, categoriaIds, instrutorNomes }),
    [todosCursos, busca, categoriaIds, instrutorNomes]
  );
  const gruposPorCategoria = useMemo(() => agruparPorCategoria(cursosFiltrados), [cursosFiltrados]);

  return (
    <div className="px-4 py-6 pb-12 sm:px-16">
      {/* pb-24 extra do <main> (app/membros/layout.tsx) já cobre a bottom
          nav flutuante — nada específico pra fazer aqui além do padding
          normal da página. */}
      <TodosCursosPorCategoria
        titulo="Todos os Cursos"
        grupos={gruposPorCategoria}
        acessos={acessos}
        progressoPorCurso={progressoPorCurso}
        onClickLocked={setModalCurso}
        emptyMessage={filtroAtivo ? 'Nenhum curso encontrado com esse filtro.' : 'Use a busca ou o filtro pra encontrar um curso.'}
      />

      <AccessModal open={!!modalCurso} onClose={() => setModalCurso(null)} curso={modalCurso} numeroWhatsapp={numeroWhatsapp} />
    </div>
  );
}
