'use client';

import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Play,
  Download,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  FileVideo,
  FileAudio,
  File as FileIcon,
} from 'lucide-react';
import VideoPlayer from '@/components/membros/VideoPlayer';
import { formatDuration, formatBytes } from '@/lib/utils';
import type { Aula, Curso, Documento, Modulo } from '@/types';

// Ícone por tipo de arquivo (doc.tipo guarda o mimetype, ex: "application/pdf",
// vindo do import do Drive — ver app/admin/cursos/[id]/aulas/actions.ts).
function iconeParaDocumento(tipo: string | null) {
  const t = (tipo ?? '').toLowerCase();
  if (t.includes('image')) return FileImage;
  if (t.includes('sheet') || t.includes('excel') || t.includes('csv')) return FileSpreadsheet;
  if (t.includes('zip') || t.includes('compressed') || t.includes('rar')) return FileArchive;
  if (t.includes('video')) return FileVideo;
  if (t.includes('audio')) return FileAudio;
  if (t.includes('pdf') || t.includes('document') || t.includes('text')) return FileText;
  return FileIcon;
}

// A tela do player nunca recebe video_url do servidor — nem da aula atual,
// nem das outras aulas listadas na barra lateral — o próprio VideoPlayer
// busca a URL sob demanda (ver hooks/useDificultarInspecao e o comentário em
// VideoPlayer.tsx), então ela nem chega a existir no payload inicial da página.
type AulaSemVideoUrl = Omit<Aula, 'video_url'>;
type AulaComStatus = AulaSemVideoUrl & { concluida: boolean };
type ModuloComAulas = Modulo & { aulas: AulaComStatus[] };

export default function PlayerPageClient({
  curso,
  modulo,
  aula,
  documentos,
  modulos,
  aulaAnteriorId,
  proximaAulaId,
  posicaoInicial,
}: {
  curso: Curso;
  modulo: Modulo;
  aula: AulaSemVideoUrl;
  documentos: Documento[];
  modulos: ModuloComAulas[];
  aulaAnteriorId: string | null;
  proximaAulaId: string | null;
  posicaoInicial: number;
}) {
  // A barra lateral mostra só o módulo da aula atual (não a lista completa
  // de módulos do curso) — pra navegar entre módulos diferentes, o aluno usa
  // o botão "← {curso.titulo}" no topo do vídeo, que volta pra tela do curso.
  const moduloAtual = modulos.find((m) => m.id === modulo.id);
  const aulasDoModulo = moduloAtual?.aulas ?? [];
  const assistidasModulo = aulasDoModulo.filter((a) => a.concluida).length;
  const progressoModulo = aulasDoModulo.length > 0 ? Math.round((assistidasModulo / aulasDoModulo.length) * 100) : 0;

  // "MÓDULO X • Aula X de Y": posição do módulo entre os módulos do curso
  // (por `ordem`) e posição da aula dentro do módulo atual.
  const numeroModulo = [...modulos].sort((a, b) => a.ordem - b.ordem).findIndex((m) => m.id === modulo.id) + 1;
  const numeroAulaNoModulo = aulasDoModulo.findIndex((a) => a.id === aula.id) + 1;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Mobile: a fileira inteira rola como uma página só (empilhado).
          Desktop (lg+): a fileira trava a altura e cada coluna rola por conta própria. */}
      <div className="flex flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <div className="flex-1 p-4 lg:overflow-y-auto lg:p-6">
          {/* Botão de voltar: círculo flutuante sobre o vídeo (não mais uma
              barra de texto acima dele) — só o ícone, sem o título do curso
              ao lado. O wrapper relative existe só pra ancorar esse overlay;
              o VideoPlayer continua do jeito que é. */}
          <div className="relative">
            <Link
              href={`/membros/curso/${curso.id}`}
              aria-label={`Voltar para ${curso.titulo}`}
              className="absolute left-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
            >
              <ChevronLeft size={22} />
            </Link>
            <VideoPlayer
              aulaId={aula.id}
              cursoId={curso.id}
              posicaoInicial={posicaoInicial}
              aulaAnteriorId={aulaAnteriorId}
              proximaAulaId={proximaAulaId}
            />
          </div>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Módulo {numeroModulo} • Aula {numeroAulaNoModulo} de {aulasDoModulo.length}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-white">{aula.titulo}</h1>
              {aula.descricao && <p className="mt-1 max-w-2xl text-sm text-on-variant">{aula.descricao}</p>}
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                href={aulaAnteriorId ? `/membros/player/${aulaAnteriorId}` : '#'}
                aria-disabled={!aulaAnteriorId}
                className={`btn-secondary flex items-center gap-1 ${!aulaAnteriorId ? 'pointer-events-none opacity-40' : ''}`}
              >
                <ChevronLeft size={16} /> Aula Anterior
              </Link>
              <Link
                href={proximaAulaId ? `/membros/player/${proximaAulaId}` : '#'}
                aria-disabled={!proximaAulaId}
                className={`btn-primary flex items-center gap-1 ${!proximaAulaId ? 'pointer-events-none opacity-40' : ''}`}
              >
                Próxima Aula <ChevronRight size={16} />
              </Link>
            </div>
          </div>

          {documentos.length > 0 && (
            <div className="mt-8">
              <h2 className="text-base font-bold text-white">Documentos e Anexos</h2>
              <div className="mb-4 mt-2 h-0.5 w-full bg-primary" />

              <div className="space-y-2">
                {documentos.map((doc) => {
                  const Icone = iconeParaDocumento(doc.tipo);
                  return (
                    <a
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg bg-card px-4 py-3 text-sm text-on-surface transition-colors hover:bg-surface-container"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-surface-high text-primary">
                        <Icone size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <p className="truncate font-medium text-white">{doc.nome}</p>
                        {doc.tamanho_bytes != null && (
                          <p className="text-xs text-on-variant">{formatBytes(doc.tamanho_bytes)}</p>
                        )}
                      </span>
                      <Download size={18} className="shrink-0 text-on-variant" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <aside className="flex w-full shrink-0 flex-col border-t border-border/60 p-6 lg:w-80 lg:overflow-hidden lg:border-l lg:border-t-0">
          <div className="mb-4 shrink-0 border-b border-border/40 p-6">
            <p className="truncate text-sm font-bold text-white">{modulo.titulo}</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-high">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressoModulo}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-on-variant">{progressoModulo}% Concluído</p>
          </div>

          <div className="divide-y divide-border/40 p-0 lg:flex-1 lg:overflow-y-auto">
            {aulasDoModulo.map((a, idx) => {
              const ativa = a.id === aula.id;
              // "Tempo restante" usa a última posição salva (posicaoInicial),
              // não a posição ao vivo do player — não temos esse estado aqui,
              // só uma estimativa a partir do progresso salvo até a página
              // carregar. Também não existe, no modelo de dados atual, um
              // conceito de aula "bloqueada"/não liberada dentro de um módulo
              // (só o curso inteiro pode estar bloqueado pro aluno) — por
              // isso não há estado de cadeado aqui, só concluída/atual/pendente.
              const restante = ativa && a.duracao_segundos > 0 ? Math.max(a.duracao_segundos - posicaoInicial, 0) : 0;

              return (
                <Link
                  key={a.id}
                  href={`/membros/player/${a.id}`}
                  className={`flex items-center gap-3 border-l-4 px-3 py-3 text-sm transition-colors ${
                    ativa ? 'border-primary bg-surface-high' : 'border-transparent hover:bg-surface-container'
                  }`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container text-xs font-semibold text-on-variant">
                    {a.concluida ? (
                      <CheckCircle2 size={18} className="text-primary" />
                    ) : ativa ? (
                      <Play size={14} className="text-primary" />
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <p className={`truncate font-medium ${ativa ? 'text-primary' : 'text-white'}`}>{a.titulo}</p>
                    {ativa ? (
                      <p className="text-xs text-primary">
                        Assistindo agora{a.duracao_segundos > 0 ? ` · restam ${formatDuration(restante)}` : ''}
                      </p>
                    ) : (
                      a.duracao_segundos > 0 && <p className="text-xs text-on-variant">{formatDuration(a.duracao_segundos)}</p>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
