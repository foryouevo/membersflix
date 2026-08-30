'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Lock, PlayCircle } from 'lucide-react';
import AccessModal from '@/components/membros/AccessModal';
import { useDificultarInspecao } from '@/hooks/useDificultarInspecao';
import { formatTitulo } from '@/lib/utils';
import type { Aula, Curso, Documento, Modulo } from '@/types';

type ModuloComAulas = Modulo & { aulas: (Aula & { documentos: Documento[]; concluida: boolean })[] };

export default function CursoDetalheClient({
  curso,
  hasAccess,
  modulos,
  trialModuloUnicoId,
  numeroWhatsapp,
}: {
  curso: Curso;
  hasAccess: boolean;
  modulos: ModuloComAulas[];
  trialModuloUnicoId: string | null;
  totalAulas: number;
  concluidas: number;
  numeroWhatsapp: string | null;
  proximaAulaId: string | null;
  jaComecou: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  useDificultarInspecao();

  return (
    <div>
      {/* Hero: capa do curso cobrindo a área, título centralizado como um selo. */}
      <div className={`relative flex h-[40vh] w-full items-center justify-center overflow-hidden sm:h-[45vh] ${!hasAccess ? 'locked-card' : ''}`}>
        {curso.capa_url && <Image src={curso.capa_url} alt={curso.titulo} fill priority className="object-cover" />}
        <div className="absolute inset-0 bg-black/45" />
        <h1 className="relative px-4 text-center text-3xl font-bold text-white drop-shadow-lg sm:text-5xl">{curso.titulo}</h1>
      </div>

      {/* Seção de módulos: mesmo fundo escuro do resto do site. */}
      <div className="min-h-[60vh] bg-background px-4 py-10 sm:px-16">
        <h2 className="mb-4 text-lg font-bold text-white">{curso.titulo}</h2>

        <ModulosCarousel
          modulos={modulos}
          hasAccess={hasAccess}
          trialModuloUnicoId={trialModuloUnicoId}
          onClickLocked={() => setModalOpen(true)}
        />
      </div>

      <AccessModal open={modalOpen} onClose={() => setModalOpen(false)} curso={curso} numeroWhatsapp={numeroWhatsapp} />
    </div>
  );
}

function ModulosCarousel({
  modulos,
  hasAccess,
  trialModuloUnicoId,
  onClickLocked,
}: {
  modulos: ModuloComAulas[];
  hasAccess: boolean;
  trialModuloUnicoId: string | null;
  onClickLocked: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulos.length]);

  function scrollByPage(direcao: 1 | -1) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direcao * el.clientWidth * 0.8, behavior: 'smooth' });
  }

  if (modulos.length === 0) {
    return <p className="text-sm text-on-variant">Nenhum módulo publicado ainda.</p>;
  }

  return (
    <div className="group/carousel relative">
      {/* A seta da direita fica numa faixa própria (pr-10 no container de scroll
          reserva o espaço), nunca coincidindo com a borda do último card, e com
          z-index acima do z-10 que os cards ganham no hover — senão um card
          hover perto da borda cobria a seta. À esquerda não há mais essa faixa
          (pl-0, de propósito) — a seta esquerda fica sobreposta ao 1º card
          quando ele existe (canScrollLeft). */}
      {canScrollLeft && (
        <button
          onClick={() => scrollByPage(-1)}
          aria-label="Módulos anteriores"
          className="absolute left-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white opacity-0 shadow-overlay transition-opacity duration-200 hover:bg-primary-hover group-hover/carousel:opacity-100"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* py-4: overflow-x-auto força overflow-y a virar "auto" também (regra do
          CSS: se um eixo não é visible, o outro deixa de ser visible), então
          sem essa folga vertical o hover:scale dos cards ficava cortado em
          cima/embaixo. O container não tem altura fixa, então esse padding só
          dá espaço — não cria scroll vertical. */}
      <div ref={scrollRef} className="no-scrollbar flex scroll-smooth gap-4 overflow-x-auto pl-0 pr-10 py-4">
        {modulos.map((modulo) => (
          <div key={modulo.id} className="w-36 shrink-0 sm:w-44 lg:w-48">
            <ModuloCard
              modulo={modulo}
              hasAccess={hasAccess}
              bloqueadoPorTrial={hasAccess && trialModuloUnicoId !== null && trialModuloUnicoId !== modulo.id}
              onClickLocked={onClickLocked}
            />
          </div>
        ))}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scrollByPage(1)}
          aria-label="Próximos módulos"
          className="absolute right-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white opacity-0 shadow-overlay transition-opacity duration-200 hover:bg-primary-hover group-hover/carousel:opacity-100"
        >
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
}

function ModuloCard({
  modulo,
  hasAccess,
  bloqueadoPorTrial,
  onClickLocked,
}: {
  modulo: ModuloComAulas;
  hasAccess: boolean;
  bloqueadoPorTrial: boolean;
  onClickLocked: () => void;
}) {
  const bloqueado = !hasAccess || bloqueadoPorTrial;
  const assistidas = modulo.aulas.filter((a) => a.concluida).length;
  const progressoModulo = modulo.aulas.length > 0 ? Math.round((assistidas / modulo.aulas.length) * 100) : 0;
  // Continua de onde parou: primeira aula não assistida do módulo, ou a primeira aula se nenhuma foi assistida ainda.
  const proximaAulaDoModulo = modulo.aulas.find((a) => !a.concluida) ?? modulo.aulas[0] ?? null;

  const content = (
    <div className="group relative w-full hover:z-10">
      <div
        className={`relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-surface-highest ring-1 ring-transparent transition-all duration-200 ease-out group-hover:scale-[1.04] group-hover:shadow-overlay group-hover:ring-primary/60 ${bloqueado ? 'locked-card' : ''}`}
      >
        {modulo.capa_url && (
          <Image
            src={modulo.capa_url}
            alt={modulo.titulo}
            fill
            className="object-cover"
            sizes="200px"
          />
        )}

        {/* Gradiente escuro na base pra legibilidade do nome do módulo por cima da imagem */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        <div className="absolute inset-0 flex items-center justify-center">
          <PlayCircle size={30} className="text-white/90 drop-shadow" />
        </div>

        {bloqueado && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Lock size={24} className="text-white" />
          </div>
        )}

        <p className="absolute inset-x-0 bottom-2 px-3 text-sm font-semibold leading-tight text-white">{formatTitulo(modulo.titulo)}</p>

        {/* Barra de progresso fina na borda inferior do card */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-surface-high">
          <div className="h-full bg-primary" style={{ width: `${progressoModulo}%` }} />
        </div>
      </div>
    </div>
  );

  if (!hasAccess) {
    return (
      <button onClick={onClickLocked} className="block w-full text-left">
        {content}
      </button>
    );
  }

  // Módulo travado pelo trial de 30min (curso liberado, mas só o Módulo 1
  // fica acessível até a confirmação do pagamento): sem clique, sem abrir o
  // modal de "solicitar acesso" (que é pra quem não tem o curso liberado).
  if (bloqueadoPorTrial) {
    return (
      <div title="Disponível após a confirmação do pagamento" className="block w-full cursor-not-allowed">
        {content}
      </div>
    );
  }

  if (!proximaAulaDoModulo) {
    return <div className="block w-full cursor-not-allowed opacity-60">{content}</div>;
  }

  return (
    <Link href={`/membros/player/${proximaAulaDoModulo.id}`} className="block w-full">
      {content}
    </Link>
  );
}
