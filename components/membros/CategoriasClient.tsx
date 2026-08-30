'use client';

import { useState } from 'react';
import CourseRow from '@/components/membros/CourseRow';
import AccessModal from '@/components/membros/AccessModal';
import type { Curso } from '@/types';

export default function CategoriasClient({
  secoes,
  acessos,
  numeroWhatsapp,
}: {
  secoes: { titulo: string; cursos: Curso[] }[];
  acessos: Record<string, boolean>;
  numeroWhatsapp: string | null;
}) {
  const [modalCurso, setModalCurso] = useState<Curso | null>(null);

  return (
    <div className="pt-8">
      <h1 className="mb-6 px-4 text-2xl font-bold text-white sm:px-16">Categorias</h1>

      {secoes.length === 0 && <p className="px-4 text-sm text-on-variant sm:px-16">Nenhuma categoria disponível.</p>}

      {secoes.map((s) => (
        <CourseRow key={s.titulo} titulo={s.titulo} cursos={s.cursos} acessos={acessos} onClickLocked={setModalCurso} />
      ))}

      <AccessModal open={!!modalCurso} onClose={() => setModalCurso(null)} curso={modalCurso} numeroWhatsapp={numeroWhatsapp} />
    </div>
  );
}
