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
  hrefsPorCurso,
}: {
  todosCursos: Curso[];
  acessos: Record<string, boolean>;
  progressoPorCurso: Record<string, number>;
  numeroWhatsapp: string | null;
  // Repassado pra TodosCursosPorCategoria (ver comentário lá — dicionário
  // curso.id -> href, não uma função, por causa da fronteira Server/Client
  // Component) — default é a rota clássica, usada por /membros/buscar sem
  // passar nada; a rota nova (/cursos) passa a versão por slug.
  hrefsPorCurso?: Record<string, string>;
}) {
  const [modalCurso, setModalCurso] = useState<Curso | null>(null);
  const searchParams = useSearchParams();

  const busca = searchParams.get('q') ?? '';
  // categoriaSlugs (era categoriaIds — pedido de uma tarefa posterior):
  // a URL agora carrega slugs (?categoria=criacao-de-sites), não ids —
  // ver comentário completo em hooks/useCursoFiltro.ts (FiltroCursos).
  const categoriaSlugs = useMemo(() => searchParams.get('categoria')?.split(',').filter(Boolean) ?? [], [searchParams]);
  const instrutorNomes = useMemo(() => searchParams.get('instrutor')?.split(',').filter(Boolean) ?? [], [searchParams]);
  const filtroAtivo = busca.trim() !== '' || categoriaSlugs.length > 0 || instrutorNomes.length > 0;

  const cursosFiltrados = useMemo(
    () => filtrarCursos(todosCursos, { busca, categoriaSlugs, instrutorNomes }),
    [todosCursos, busca, categoriaSlugs, instrutorNomes]
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
        hrefsPorCurso={hrefsPorCurso}
      />

      <AccessModal open={!!modalCurso} onClose={() => setModalCurso(null)} curso={modalCurso} numeroWhatsapp={numeroWhatsapp} />
    </div>
  );
}
