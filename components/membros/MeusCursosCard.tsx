'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { GraduationCap, Search, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { cn, formatTitulo } from '@/lib/utils';

export type MeuCursoItem = {
  id: string;
  titulo: string;
  thumbnail_url: string | null;
  capa_url: string | null;
  instrutor_nome: string | null;
  categoriaNome: string | null;
  bloqueado: boolean;
  // Novos nesta tarefa (redesign seguindo a imagem de referência) — dados
  // reais já calculados em app/membros/perfil/page.tsx (mesmos mapas usados
  // pras métricas do topo), não inventados: total de aulas do curso e
  // progresso individual do aluno nele (%).
  totalAulas: number;
  progressoPct: number;
};

// POR_PAGINA: 6 -> 3 (pedido explícito desta tarefa). LIMITE_PARA_PAGINACAO
// acompanha o mesmo valor (casa com POR_PAGINA, mesma regra de sempre: 1
// página cheia nunca precisa de paginação).
const POR_PAGINA = 3;
// Controles de paginação (setas + "Página X de Y") só aparecem com mais de
// LIMITE_PARA_PAGINACAO cursos no resultado (filtrado ou não).
const LIMITE_PARA_PAGINACAO = 3;

/**
 * "Meu(s) Curso(s)" da tela de Perfil — client component por causa de 3
 * estados locais: aba de categoria, busca por texto e página atual (nenhum
 * deles existe em outro lugar pra reaproveitar; exclusivos deste card, não
 * afetam nenhuma outra tela — pedido explícito).
 *
 * Abas de categoria: "Todos" + uma aba por categoria REAL entre os cursos
 * que o aluno possui (liberados ou bloqueados) — nunca uma lista
 * fixa/inventada de categorias. Combinam com a busca por texto já
 * existente (E, não OU): a aba restringe o universo, a busca filtra dentro
 * dele.
 *
 * `lg:flex lg:h-full lg:flex-col` no card + `lg:flex-1 lg:min-h-0
 * lg:overflow-y-auto` na área de resultado (grid/mensagens vazias): pedido
 * desta tarefa — este card preenche o espaço vertical que sobrar na coluna
 * esquerda (ver app/membros/perfil/page.tsx), acompanhando a altura total
 * da coluna direita. Cabeçalho (título/abas), busca e paginação ficam
 * shrink-0 (tamanho fixo); só a área de resultado cresce/encolhe — com
 * menos cursos que cabem, sobra respiro ali dentro (não em vãos soltos
 * entre seções); com mais do que cabe na altura disponível, ela rola por
 * dentro em vez de estourar a página.
 */
export default function MeusCursosCard({ cursos }: { cursos: MeuCursoItem[] }) {
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [abaCategoria, setAbaCategoria] = useState('Todos');

  const categorias = useMemo(() => {
    const nomes = new Set(cursos.map((c) => c.categoriaNome).filter((n): n is string => !!n));
    return ['Todos', ...Array.from(nomes).sort((a, b) => a.localeCompare(b))];
  }, [cursos]);

  const filtrados = useMemo(() => {
    const porCategoria = abaCategoria === 'Todos' ? cursos : cursos.filter((c) => c.categoriaNome === abaCategoria);
    const termo = busca.trim().toLowerCase();
    if (!termo) return porCategoria;
    return porCategoria.filter((c) => [c.titulo, c.categoriaNome, c.instrutor_nome].some((campo) => campo?.toLowerCase().includes(termo)));
  }, [cursos, abaCategoria, busca]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  // Trava a página atual dentro do intervalo válido — sem isso, trocar de
  // aba/filtrar pra um resultado menor enquanto numa página avançada
  // deixaria a lista em branco, "perdida" numa página que não existe mais.
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * POR_PAGINA;
  const itensDaPagina = filtrados.slice(inicio, inicio + POR_PAGINA);

  function handleBuscaChange(value: string) {
    setBusca(value);
    setPagina(1);
  }

  function handleAbaChange(aba: string) {
    setAbaCategoria(aba);
    setPagina(1);
  }

  return (
    <div className="rounded-lg bg-card p-5 lg:flex lg:h-full lg:flex-col">
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-white">
          <GraduationCap size={18} className="text-primary" />
          <h2 className="font-semibold">Meu(s) Curso(s)</h2>
        </div>

        {/* Abas — só aparecem se houver mais de 1 categoria real entre os
            cursos do aluno (com só "Todos" pra mostrar, a aba não ajudaria
            em nada). */}
        {categorias.length > 2 && (
          <div className="flex flex-wrap gap-1.5">
            {categorias.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleAbaChange(cat)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                  abaCategoria === cat ? 'bg-primary text-white' : 'bg-surface-high text-on-variant hover:bg-surface-container'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {cursos.length > 0 && (
        <div className="relative mb-4 shrink-0">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-variant" />
          <input
            type="text"
            value={busca}
            onChange={(e) => handleBuscaChange(e.target.value)}
            placeholder="Buscar por curso, categoria ou instrutor..."
            className="input-field pl-9 text-sm"
          />
        </div>
      )}

      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {cursos.length === 0 ? (
          <p className="text-sm text-on-variant">Você ainda não possui cursos.</p>
        ) : filtrados.length === 0 ? (
          <p className="text-sm text-on-variant">Nenhum curso encontrado para "{busca}".</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {itensDaPagina.map((curso) => (
              <CardMeuCurso key={curso.id} curso={curso} />
            ))}
          </div>
        )}
      </div>

      {/* Paginação — só aparece com mais de LIMITE_PARA_PAGINACAO (3)
          cursos no resultado (filtrado ou não), casando com POR_PAGINA — 1
          página inteira de 3 nunca precisa de paginação. Setas nunca
          desabilitam de verdade (mesmo padrão do Carousel.tsx): no
          início/fim, clicar simplesmente não faz nada perceptível (disabled
          via atributo, cursor/opacidade indicando). */}
      {filtrados.length > LIMITE_PARA_PAGINACAO && (
        <div className="mt-4 flex shrink-0 items-center justify-between border-t border-border/60 pt-3">
          <button
            type="button"
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={paginaAtual === 1}
            aria-label="Página anterior"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-high text-on-variant transition-colors hover:bg-primary hover:text-white disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs text-on-variant">
            Página {paginaAtual} de {totalPaginas}
          </span>
          <button
            type="button"
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={paginaAtual === totalPaginas}
            aria-label="Próxima página"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-high text-on-variant transition-colors hover:bg-primary hover:text-white disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

// Card do grid (item 4 do pedido) — não reaproveita CourseCard.tsx (o card
// de curso "oficial" usado na Home/Busca/Meus Cursos) porque os campos
// exibidos aqui são diferentes (categoria + nº de aulas, progresso em %
// sempre visível) e mudar CourseCard pra isso afetaria aquelas outras
// telas, fora do escopo deste pedido. Reaproveita sim o comportamento de
// navegação (Link direto pra /membros/curso/[id] — essa página já resolve
// sozinha o caso de curso bloqueado, sem precisar de modal aqui).
function CardMeuCurso({ curso }: { curso: MeuCursoItem }) {
  const imagem = curso.thumbnail_url || curso.capa_url;
  return (
    <Link href={`/membros/curso/${curso.id}`} className="group block">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-surface-high">
        {imagem ? (
          <Image
            src={imagem}
            alt={curso.titulo}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes="320px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-on-variant">
            <Play size={24} />
          </div>
        )}
        <span
          className={cn(
            'absolute left-2 top-2 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide',
            curso.bloqueado ? 'bg-secondary-container text-secondary' : 'bg-primary text-white'
          )}
        >
          {curso.bloqueado ? 'Bloqueado' : 'Liberado'}
        </span>
      </div>

      <p className="mt-2 truncate text-[0.7rem] font-semibold uppercase tracking-wide text-on-variant">
        {curso.categoriaNome ?? 'Sem categoria'} · {curso.totalAulas} {curso.totalAulas === 1 ? 'aula' : 'aulas'}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-white">{formatTitulo(curso.titulo)}</p>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-high">
          <div className="h-full rounded-full bg-primary" style={{ width: `${curso.progressoPct}%` }} />
        </div>
        <span className="shrink-0 text-[0.7rem] text-on-variant">Concluído {curso.progressoPct}%</span>
      </div>
    </Link>
  );
}
