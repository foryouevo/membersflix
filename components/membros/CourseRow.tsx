'use client';

import CourseCard from '@/components/membros/CourseCard';
import type { Curso } from '@/types';

export default function CourseRow({
  titulo,
  cursos,
  acessos,
  progressoPorCurso,
  onClickLocked,
}: {
  titulo: string;
  cursos: Curso[];
  acessos: Record<string, boolean>;
  progressoPorCurso?: Record<string, number>;
  onClickLocked: (curso: Curso) => void;
}) {
  if (cursos.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 px-4 text-lg font-semibold text-white sm:px-16">{titulo}</h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 sm:px-16">
        {cursos.map((curso) => (
          <div key={curso.id} className="w-40 shrink-0 sm:w-56">
            <CourseCard
              curso={curso}
              hasAccess={acessos[curso.id] ?? false}
              progresso={progressoPorCurso?.[curso.id]}
              onClickLocked={onClickLocked}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
