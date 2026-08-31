'use client';

import CourseCard from '@/components/membros/CourseCard';
import Carousel from '@/components/membros/Carousel';
import { CARD_BASIS_CLASSES, TITULO_CATEGORIA_CLASSNAME, TITULO_SECAO_CLASSNAME } from '@/components/membros/cursoListaEstilos';
import type { Curso } from '@/types';

type GrupoCategoria = { id: string; nome: string; ordem: number; cursos: Curso[] };

// Seção "Todos os Cursos" agrupada por categoria, um swiper por categoria —
// reaproveitada pela Home (VitrinePageClient) e pela tela de busca dedicada
// (BuscarPageClient): as duas recebem os grupos já prontos (useCursoFiltro)
// e só diferem na origem dos dados (todos os cursos vs já filtrados) e na
// mensagem de "vazio".
export default function TodosCursosPorCategoria({
  titulo,
  grupos,
  acessos,
  progressoPorCurso,
  onClickLocked,
  emptyMessage,
}: {
  titulo: string;
  grupos: GrupoCategoria[];
  acessos: Record<string, boolean>;
  progressoPorCurso: Record<string, number>;
  onClickLocked: (curso: Curso) => void;
  emptyMessage: string;
}) {
  return (
    <section>
      <h2 className={`mb-4 ${TITULO_SECAO_CLASSNAME}`}>{titulo}</h2>

      {grupos.length === 0 ? (
        <p className="text-sm text-on-variant">{emptyMessage}</p>
      ) : (
        grupos.map((grupo) => (
          <div key={grupo.id} className="mb-6 last:mb-0">
            <Carousel
              items={grupo.cursos}
              getKey={(curso) => curso.id}
              title={grupo.nome}
              titleClassName={TITULO_CATEGORIA_CLASSNAME}
              prevLabel={`${grupo.nome}: cursos anteriores`}
              nextLabel={`${grupo.nome}: próximos cursos`}
              emptyMessage=""
              outerClassName=""
              // mb-0: título colado no swiper, sem respiro embaixo dele —
              // o espaçamento entre uma categoria e a próxima vem do mb-6
              // (1.5rem) no wrapper acima, não daqui.
              headerClassName="mb-0 flex items-center justify-between gap-4"
              viewportClassName="overflow-hidden"
              trackClassName="flex gap-4 px-2 py-4"
              itemClassName={`${CARD_BASIS_CLASSES} min-w-0 shrink-0`}
              renderItem={(curso) => (
                <CourseCard
                  curso={curso}
                  hasAccess={acessos[curso.id] ?? false}
                  progresso={progressoPorCurso[curso.id]}
                  onClickLocked={onClickLocked}
                />
              )}
            />
          </div>
        ))
      )}
    </section>
  );
}
