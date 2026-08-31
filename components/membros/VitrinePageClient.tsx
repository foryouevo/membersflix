'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play } from 'lucide-react';
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
  bannerCapaUrl,
  bannerBadge,
  bannerResumo,
  continuarAssistindoHref,
  temProgresso,
}: {
  meusCursos: Curso[];
  todosCursos: Curso[];
  acessos: Record<string, boolean>;
  progressoPorCurso: Record<string, number>;
  numeroWhatsapp: string | null;
  bannerCapaUrl: string | null;
  bannerBadge: string | null;
  bannerResumo: string | null;
  continuarAssistindoHref: string;
  temProgresso: boolean;
}) {
  const [modalCurso, setModalCurso] = useState<Curso | null>(null);

  return (
    <div className="pb-12">
      {/* Banner da Home: capa (Configurações > Banner da Página Inicial) sem
          texto embutido — badge, logo e resumo são renderizados aqui, por
          cima da imagem, não fazem mais parte do arquivo enviado pelo admin.
          Sem capa configurada ainda, cai num gradiente vermelho/preto em vez
          de ficar sem fundo nenhum. Altura vem do padding do conteúdo (não
          de aspect-ratio fixo), então acomoda o botão novo sem espremer. */}
      <div className="relative w-full overflow-hidden bg-gradient-to-br from-primary/25 via-background to-background">
        {bannerCapaUrl && <Image src={bannerCapaUrl} alt="" fill priority quality={100} className="object-cover" />}
        {/* Overlay: mais escuro embaixo/esquerda (onde o texto fica), mais
            claro pro resto — garante legibilidade sobre qualquer capa,
            mesmo variante clara. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/10" />

        <div className="relative flex flex-col items-start gap-4 px-4 py-14 sm:px-16 sm:py-20">
          {/* Mesma classe do badge de categoria em CursoDetalheClient.tsx
              (ex: "FIGMA") — consistência visual entre os dois banners. */}
          {bannerBadge && (
            <span className="rounded-full bg-surface-high px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-on-variant">
              {bannerBadge}
            </span>
          )}

          <Image src="/logo.png" alt="MembersFlix" width={420} height={84} priority className="h-14 w-auto object-contain sm:h-20" />

          {bannerResumo && <p className="max-w-xl text-sm text-on-variant sm:text-base">{bannerResumo}</p>}

          <Link href={continuarAssistindoHref} className="btn-primary mt-2 flex items-center gap-2">
            <Play size={18} className="fill-white" />
            {temProgresso ? 'Continuar assistindo' : 'Assistir Agora'}
          </Link>
        </div>
      </div>

      <div className="px-4 sm:px-16" style={{ background: 'linear-gradient(0deg,rgba(15, 15, 15, 1) 0%, rgba(1, 1, 1, 1) 100%)' }}>
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
