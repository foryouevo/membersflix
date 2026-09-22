'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Lock, Play } from 'lucide-react';
import { formatTitulo } from '@/lib/utils';
import type { Curso } from '@/types';

export default function CourseCard({
  curso,
  hasAccess,
  progresso,
  onClickLocked,
  // curso.slug || fallback: se a migration 011 (coluna `slug` em cursos)
  // ainda não rodou no banco de produção, `curso.slug` chega `undefined`
  // em TODA consulta (não é bug de query/nome de campo — column
  // literalmente não existe ainda) — sem esse fallback, o link virava
  // `/curso/undefined` (404). Com o fallback, o card continua linkando
  // pra rota clássica (que funciona hoje) até a migration rodar, em vez
  // de quebrar. Ver relatório da tarefa que investigou isso.
  hrefCurso = curso.slug ? `/curso/${curso.slug}` : `/membros/curso/${curso.id}`,
}: {
  curso: Curso;
  hasAccess: boolean;
  progresso?: number;
  onClickLocked: (curso: Curso) => void;
  // Default é a rota por slug (era /membros/curso/[id] — pedido de uma
  // tarefa anterior: nenhum card no site deveria mais linkar pro UUID),
  // com fallback defensivo pro UUID enquanto `slug` não existir de
  // verdade no banco (ver comentário acima). `hrefCurso` continua
  // existindo como prop só por precaução — nenhum dos usos atuais
  // precisa mais sobrescrever isso.
  hrefCurso?: string;
}) {
  // thumbnail_url é a imagem certa pra card pequeno (cadastrada como tal no
  // admin); capa_url é o banner 16:9 do hero de /membros/curso/[id] — só
  // entra aqui como fallback se o curso não tiver thumbnail cadastrada.
  const imagemCard = curso.thumbnail_url || curso.capa_url;

  const content = (
    <div className="group relative w-full shrink-0 cursor-pointer transition-transform duration-200 hover:z-10 hover:scale-105">
      <div className={`relative aspect-video overflow-hidden rounded bg-surface-high ${!hasAccess ? 'locked-card' : ''}`}>
        {imagemCard ? (
          <Image src={imagemCard} alt={curso.titulo} fill className="object-cover" sizes="400px" />
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

        {/* Nome do instrutor, discreto, canto inferior direito da thumbnail
            — fundo escuro semi-transparente só por trás do texto (não a
            imagem toda) pra garantir legibilidade sobre qualquer capa, sem
            depender de gradiente. Some sozinho se o curso não tiver
            instrutor cadastrado (campo opcional). */}
        {curso.instrutor_nome && (
          <span className="absolute bottom-1.5 right-1.5 max-w-[80%] truncate rounded bg-black/65 px-1.5 py-0.5 text-[0.7rem] font-medium text-white/90">
            {curso.instrutor_nome}
          </span>
        )}
      </div>

      {hasAccess && typeof progresso === 'number' && (
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-high">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progresso}%` }} />
        </div>
      )}

      <p className="mt-1.5 truncate text-xs font-medium text-on-variant group-hover:text-white">{formatTitulo(curso.titulo)}</p>
    </div>
  );

  if (hasAccess) {
    return (
      <Link href={hrefCurso} className="block w-full">
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
