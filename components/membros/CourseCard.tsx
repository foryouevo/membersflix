'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Lock, Play } from 'lucide-react';
import type { Curso } from '@/types';

export default function CourseCard({
  curso,
  hasAccess,
  progresso,
  onClickLocked,
}: {
  curso: Curso;
  hasAccess: boolean;
  progresso?: number;
  onClickLocked: (curso: Curso) => void;
}) {
  const imagemCard = curso.capa_url || curso.thumbnail_url;

  const content = (
    <div className="group relative w-full shrink-0 cursor-pointer transition-transform duration-200 hover:z-10 hover:scale-105">
      <div className={`relative aspect-video overflow-hidden rounded bg-surface-high ${!hasAccess ? 'locked-card' : ''}`}>
        {imagemCard ? (
          <Image src={imagemCard} alt={curso.titulo} fill className="object-cover" sizes="240px" />
        ) : (
          <div className="flex h-full items-center justify-center text-on-variant">
            <Play size={28} />
          </div>
        )}

        {!hasAccess && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Lock size={26} className="text-white" />
          </div>
        )}
      </div>

      {hasAccess && typeof progresso === 'number' && (
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-high">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progresso}%` }} />
        </div>
      )}

      <p className="mt-1.5 truncate text-xs font-medium text-on-variant group-hover:text-white">{curso.titulo}</p>
    </div>
  );

  if (hasAccess) {
    return (
      <Link href={`/membros/curso/${curso.id}`} className="block w-full">
        {content}
      </Link>
    );
  }

  return (
    <button onClick={() => onClickLocked(curso)} className="block w-full text-left">
      {content}
    </button>
  );
}
