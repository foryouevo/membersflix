'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AccessModal from '@/components/membros/AccessModal';
import HomeSearchFilter from '@/components/membros/HomeSearchFilter';
import TodosCursosPorCategoria from '@/components/membros/TodosCursosPorCategoria';
import { filtrarCursos, agruparPorCategoria, listarCategoriasDisponiveis, listarInstrutoresDisponiveis } from '@/hooks/useCursoFiltro';
import type { Curso } from '@/types';

// Tela de busca dedicada — acessada pelo ícone de lupa do bottom nav mobile
// e pela busca/filtro do DesktopHeader (desktop). Sem banner/hero e sem
// "Meus Cursos" de propósito: só "Todos os Cursos" já filtrado, agrupado
// por categoria.
//
// O estado de busca/filtro não mora mais em useState local seguido de
// navegação: vem direto da URL (useSearchParams, ?q=/categoria=/instrutor=)
// — como esse hook é reativo, a tela refiltra sozinha a cada mudança na URL
// (inclusive as que o DesktopHeader dispara em tempo real, debounced — ver
// DesktopHeader.tsx), sem precisar remontar. Isso também é o que faz o
// estado sobreviver a reload e ser compartilhável por link.
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
  const router = useRouter();
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
  const categoriasDisponiveis = useMemo(() => listarCategoriasDisponiveis(todosCursos), [todosCursos]);
  const instrutoresDisponiveis = useMemo(() => listarInstrutoresDisponiveis(todosCursos), [todosCursos]);

  function atualizarUrl(next: { busca?: string; categoriaIds?: string[]; instrutorNomes?: string[] }) {
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

  // Buffer local só pro input MOBILE (abaixo — no desktop essa UI já vive na
  // navbar/DesktopHeader, não existe aqui) responder à digitação na hora;
  // debounce de 300ms escreve na URL de verdade (mesmo padrão do
  // DesktopHeader). Sincroniza de volta se a URL mudar por outro motivo
  // (botão voltar do navegador, ou o próprio DesktopHeader — embora os dois
  // não devessem estar visíveis ao mesmo tempo, um por breakpoint).
  const [buscaLocalMobile, setBuscaLocalMobile] = useState(busca);
  useEffect(() => setBuscaLocalMobile(busca), [busca]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  function handleBuscaMobileChange(value: string) {
    setBuscaLocalMobile(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => atualizarUrl({ busca: value }), 300);
  }

  function toggleCategoria(id: string) {
    atualizarUrl({ categoriaIds: categoriaIds.includes(id) ? categoriaIds.filter((x) => x !== id) : [...categoriaIds, id] });
  }
  function toggleInstrutor(nome: string) {
    atualizarUrl({
      instrutorNomes: instrutorNomes.includes(nome) ? instrutorNomes.filter((x) => x !== nome) : [...instrutorNomes, nome],
    });
  }

  return (
    <div className="px-4 py-6 pb-12 sm:px-16">
      {/* pb-24 extra do <main> (app/membros/layout.tsx) já cobre a bottom
          nav flutuante — nada específico pra fazer aqui além do padding
          normal da página.

          Só mobile (md:hidden): no desktop a busca/filtro já vivem na
          navbar (DesktopHeader) — duplicar aqui repetiria a mesma UI duas
          vezes na tela. No mobile não existe equivalente (o ícone de lupa
          do BottomNav só navega pra cá, sem UI própria — ver comentário em
          BottomNav.tsx), então esse input continua sendo a única forma de
          buscar no celular; só passou a escrever na URL (acima) em vez de
          um estado isolado, pra ficar consistente com o resto (reload/link
          preservam a busca igual no desktop). */}
      <div className="mb-6 md:hidden">
        <HomeSearchFilter
          query={buscaLocalMobile}
          onQueryChange={handleBuscaMobileChange}
          categorias={categoriasDisponiveis}
          categoriaIds={categoriaIds}
          onToggleCategoria={toggleCategoria}
          instrutores={instrutoresDisponiveis}
          instrutorNomes={instrutorNomes}
          onToggleInstrutor={toggleInstrutor}
          onLimparFiltros={() => atualizarUrl({ categoriaIds: [], instrutorNomes: [] })}
          fullWidth
          onSubmit={() => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            atualizarUrl({ busca: buscaLocalMobile });
          }}
        />
      </div>

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
