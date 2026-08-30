'use client';

import { useState } from 'react';
import CourseCard from '@/components/membros/CourseCard';
import AccessModal from '@/components/membros/AccessModal';
import type { Curso } from '@/types';

export default function MeusCursosClient({
  cursos,
  bloqueados,
  progressoPorCurso,
  numeroWhatsapp,
}: {
  cursos: Curso[];
  bloqueados: Record<string, boolean>;
  progressoPorCurso: Record<string, number>;
  numeroWhatsapp: string | null;
}) {
  const [modalCurso, setModalCurso] = useState<Curso | null>(null);

  return (
    <div className="p-4 sm:p-16">
      <h1 className="mb-6 text-2xl font-bold text-white">Meus Cursos</h1>

      {cursos.length === 0 ? (
        <p className="text-sm text-on-variant">Você ainda não tem cursos liberados.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {cursos.map((curso) => (
            <CourseCard
              key={curso.id}
              curso={curso}
              hasAccess={!bloqueados[curso.id]}
              progresso={progressoPorCurso[curso.id]}
              onClickLocked={setModalCurso}
            />
          ))}
        </div>
      )}

      <AccessModal open={!!modalCurso} onClose={() => setModalCurso(null)} curso={modalCurso} numeroWhatsapp={numeroWhatsapp} />
    </div>
  );
}
