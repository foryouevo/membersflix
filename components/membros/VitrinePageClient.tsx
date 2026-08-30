'use client';

import { useState } from 'react';
import Image from 'next/image';
import CourseCard from '@/components/membros/CourseCard';
import AccessModal from '@/components/membros/AccessModal';
import type { Curso } from '@/types';

const GRID_CLASSES = 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';

export default function VitrinePageClient({
  meusCursos,
  todosCursos,
  acessos,
  progressoPorCurso,
  numeroWhatsapp,
  bannerPlataformaUrl,
}: {
  meusCursos: Curso[];
  todosCursos: Curso[];
  acessos: Record<string, boolean>;
  progressoPorCurso: Record<string, number>;
  numeroWhatsapp: string | null;
  bannerPlataformaUrl: string | null;
}) {
  const [modalCurso, setModalCurso] = useState<Curso | null>(null);

  return (
    <div className="pb-12">
      {bannerPlataformaUrl && (
        <div className="relative mb-8 aspect-[21/6] w-full overflow-hidden">
          <Image src={bannerPlataformaUrl} alt="MembersFlix" fill priority quality={100} className="object-cover" />
          {/* Fade suave na base do banner, dissolvendo na cor de fundo da página
              (#0f0f0f, mesma do body/bg-background) em vez de um corte seco. */}
          <div className="absolute inset-x-0 bottom-0 h-[35%] bg-gradient-to-b from-transparent to-background" />
        </div>
      )}

      <div className="px-4 sm:px-16">
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-white">Meus Cursos</h2>
          {meusCursos.length > 0 ? (
            <div className={GRID_CLASSES}>
              {meusCursos.map((curso) => (
                <CourseCard key={curso.id} curso={curso} hasAccess progresso={progressoPorCurso[curso.id]} onClickLocked={setModalCurso} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-variant">Você ainda não tem cursos liberados.</p>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">Todos os Cursos</h2>
          {todosCursos.length > 0 ? (
            <div className={GRID_CLASSES}>
              {todosCursos.map((curso) => (
                <CourseCard
                  key={curso.id}
                  curso={curso}
                  hasAccess={acessos[curso.id] ?? false}
                  progresso={progressoPorCurso[curso.id]}
                  onClickLocked={setModalCurso}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-variant">Nenhum curso disponível no momento.</p>
          )}
        </section>
      </div>

      <AccessModal open={!!modalCurso} onClose={() => setModalCurso(null)} curso={modalCurso} numeroWhatsapp={numeroWhatsapp} />
    </div>
  );
}
