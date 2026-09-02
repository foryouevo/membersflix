'use client';

import { useState } from 'react';
import Image from 'next/image';
import CourseCard from '@/components/membros/CourseCard';
import AccessModal from '@/components/membros/AccessModal';
import Carousel from '@/components/membros/Carousel';
import TodosCursosPorCategoria from '@/components/membros/TodosCursosPorCategoria';
import CursoDestaque from '@/components/membros/CursoDestaque';
import { CARD_BASIS_CLASSES, TITULO_SECAO_CLASSNAME } from '@/components/membros/cursoListaEstilos';
import { useCursoFiltro } from '@/hooks/useCursoFiltro';
import type { Categoria, Curso } from '@/types';

export default function VitrinePageClient({
  meusCursos,
  todosCursos,
  acessos,
  progressoPorCurso,
  numeroWhatsapp,
  bannerCapaUrl,
  heroDestaqueUrl,
  todasCategorias,
  cursoDestaque,
}: {
  meusCursos: Curso[];
  todosCursos: Curso[];
  acessos: Record<string, boolean>;
  progressoPorCurso: Record<string, number>;
  numeroWhatsapp: string | null;
  bannerCapaUrl: string | null;
  // Fundo do hero em destaque (CursoDestaque) — campo próprio, isolado de
  // bannerCapaUrl (o banner logo acima, camada visual separada) e da capa de
  // qualquer curso. Sem valor: CursoDestaque cai num fundo escuro sólido.
  heroDestaqueUrl: string | null;
  todasCategorias: Categoria[];
  cursoDestaque: Curso | null;
}) {
  const [modalCurso, setModalCurso] = useState<Curso | null>(null);

  // Agrupamento de "Todos os Cursos" por categoria — lógica extraída em
  // useCursoFiltro pra ser reaproveitada também na tela de busca dedicada
  // (BuscarPageClient). A Home não filtra mais nada em si mesma: a fileira
  // de chips de categoria que existia aqui (CategoriaChipsMobile,
  // md:hidden) foi removida — o único jeito de filtrar por categoria/
  // instrutor agora é o menu de filtros do Header (ícone de funil, comum às
  // duas larguras), que navega pra /membros/buscar, igual ao desktop já
  // fazia antes desta unificação. `filtroAtivo` fica sempre `false` aqui
  // por causa disso (não há mais UI nesta página que o ligue) — mantido
  // porque a lógica de exibição abaixo (esconder "Meus Cursos", mensagem de
  // vazio) continua correta, só que sempre no caminho "sem filtro".
  const { filtroAtivo, gruposPorCategoria } = useCursoFiltro(todosCursos, todasCategorias);

  return (
    <div className="pb-12">
      {/* Banner da Home: capa (Configurações > Banner da Página Inicial) sem
          texto embutido — badge, logo e resumo são renderizados aqui, por
          cima da imagem, não fazem mais parte do arquivo enviado pelo admin.
          Sem capa configurada ainda, cai no gradiente vermelho/preto do
          <body> (app/globals.css), que agora é o único fundo do app inteiro
          — essa div não tem mais cor/gradiente próprios (nem bg-[#141414],
          nem o radial-gradient que só existia aqui), pra não voltar a criar
          a emenda visível entre o fim de um e o começo do outro. Altura vem
          do padding do conteúdo (não de aspect-ratio fixo), então acomoda o
          botão novo sem espremer. */}
      <div className="relative -mt-14 w-full overflow-hidden md:-mt-20">
        {/* -mt-14/md:-mt-20: cancela o pt-14 (mobile)/pt-16 (desktop) que
            <main> reserva por padrão (app/membros/layout.tsx) pro Header
            fixo — a imagem/gradiente do banner precisa começar no topo de
            verdade (y=0) nas duas larguras, porque o header é transparente
            e flutua por cima dela em qualquer largura. Só o conteúdo de
            texto lá dentro (card de destaque, abaixo) repõe essa folga com
            pt-14/md:pt-20 próprio, pra não ficar embaixo do header. */}
        {bannerCapaUrl && <Image src={bannerCapaUrl} alt="" fill priority quality={100} className="object-cover" />}
        {/* pt-14/md:pt-20: mesma folga que <main> reserva por padrão pro
            Header fixo — repõe aqui porque o wrapper do banner acima
            cancelou aquela folga (-mt-14/md:-mt-20) pra imagem começar no
            topo de verdade nas duas larguras. O card de destaque é o
            primeiro conteúdo depois dela — sem essa folga ficaria coberto
            pelo header, mesmo ele sendo transparente (a barra ainda
            intercepta clique/toque, só não pinta nada por cima). Não tem
            mais fileira de chips de categoria aqui (CategoriaChipsMobile,
            removida) — o filtro por categoria agora é só o menu de filtros
            do Header, comum às duas larguras. */}
        <div className="relative pt-14 md:pt-20">
          {/* Card de curso em destaque — mesmo componente em qualquer
              largura de tela (CursoDestaque, ver comentário dele pros
              detalhes de responsividade). Substituiu o banner antigo
              inteiro em desktop/tablet (tag "CURSOS ONLINE", wordmark
              "MEMBERSFLIX", descrição e botão "Continuar assistindo" —
              nenhum dos quatro existe mais). px-4 no mobile (1rem, abaixo
              de 640px) / sm:px-14 (3.5rem) no desktop/tablet — o respiro
              lateral do card é bem menor numa tela pequena, senão sobra
              pouca largura útil pro card. pb-6/sm:pb-14 continuam pro
              espaço embaixo do card antes de "Meus Cursos"/"Todos os
              Cursos". */}
          <div className="px-4 pb-6 pt-4 sm:px-14 sm:pb-14">
            {cursoDestaque && (
              <CursoDestaque
                curso={cursoDestaque}
                hasAccess={!!acessos[cursoDestaque.id]}
                onClickComprar={() => setModalCurso(cursoDestaque)}
                heroDestaqueUrl={heroDestaqueUrl}
              />
            )}
          </div>
        </div>
      </div>

      {/* Sem background próprio (era um linear-gradient escuro só desta
          seção, terminando num tom ligeiramente diferente do #141414 do
          <body> — exatamente o tipo de emenda que devia deixar de existir).
          A esta altura da página o gradiente do body já convergiu pro
          #141414 sólido (o radial só cobre 60% da altura da viewport a
          partir do topo), então essa seção fica consistente com ele sem
          precisar reafirmar nada. */}
      <div className="px-4 sm:px-16">
        {/* Mesmo carrossel da seção "Módulos do curso" (components/membros/
            Carousel.tsx — Embla: drag/swipe, setas prev/next ao lado do
            título, wrap manual nas pontas). Aqui os *ClassName são
            sobrescritos porque, ao contrário da página de curso, esta seção
            não trava altura num h-screen — os cards têm largura em % por
            breakpoint (CARD_BASIS_CLASSES) pra controlar quantos ficam
            visíveis, e a página rola normalmente. Os cards em si (CourseCard)
            não mudaram — continuam aspect-video, só a exibição virou
            carrossel em vez de grid fixo. */}
        {/* Some inteira com filtro de categoria ativo — na prática nunca
            mais acontece nesta página (filtroAtivo é sempre false aqui, ver
            comentário acima de useCursoFiltro: o único filtro por
            categoria/instrutor agora é o menu do Header, que navega pra
            /membros/buscar em vez de filtrar a Home). Mantido por
            segurança/consistência com TodosCursosPorCategoria abaixo. */}
        {!filtroAtivo && (
          <section className="mb-10">
            <Carousel
              items={meusCursos}
              getKey={(curso) => curso.id}
              title="Meus Cursos"
              titleClassName={TITULO_SECAO_CLASSNAME}
              prevLabel="Cursos anteriores"
              nextLabel="Próximos cursos"
              emptyMessage="Você ainda não tem cursos liberados."
              outerClassName=""
              headerClassName="mb-4 flex items-center justify-between gap-4"
              viewportClassName="overflow-hidden"
              trackClassName="flex gap-4 px-2 py-4"
              itemClassName={`${CARD_BASIS_CLASSES} min-w-0 shrink-0`}
              renderItem={(curso) => (
                <CourseCard curso={curso} hasAccess progresso={progressoPorCurso[curso.id]} onClickLocked={setModalCurso} />
              )}
            />
          </section>
        )}

        {/* id="todos-os-cursos": alvo do botão "Explorar cursos" do hero
            institucional (CursoDestaque) — scroll-mt-14/md:scroll-mt-20
            (mesma folga de pt-14/md:pt-20 usada pelo restante da página)
            compensa o header fixo, senão ele cobriria o topo da seção ao
            rolar até aqui. */}
        <div id="todos-os-cursos" className="scroll-mt-14 md:scroll-mt-20">
          <TodosCursosPorCategoria
            titulo="Todos os Cursos"
            grupos={gruposPorCategoria}
            acessos={acessos}
            progressoPorCurso={progressoPorCurso}
            onClickLocked={setModalCurso}
            // filtroAtivo é sempre false nesta página (ver comentário acima
            // de useCursoFiltro) — a Home não filtra mais nada em si mesma,
            // busca/categoria/instrutor viraram exclusivos da tela de busca
            // dedicada (Header navega pra lá em vez de filtrar aqui).
            emptyMessage={!filtroAtivo ? 'Nenhum curso disponível no momento.' : 'Nenhum curso nessa categoria ainda.'}
          />
        </div>
      </div>

      <AccessModal open={!!modalCurso} onClose={() => setModalCurso(null)} curso={modalCurso} numeroWhatsapp={numeroWhatsapp} />
    </div>
  );
}
