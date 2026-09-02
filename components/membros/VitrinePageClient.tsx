'use client';

import { useState } from 'react';
import Image from 'next/image';
import CourseCard from '@/components/membros/CourseCard';
import AccessModal from '@/components/membros/AccessModal';
import Carousel from '@/components/membros/Carousel';
import TodosCursosPorCategoria from '@/components/membros/TodosCursosPorCategoria';
import CategoriaChipsMobile from '@/components/membros/CategoriaChipsMobile';
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
  todasCategorias,
  cursoDestaque,
}: {
  meusCursos: Curso[];
  todosCursos: Curso[];
  acessos: Record<string, boolean>;
  progressoPorCurso: Record<string, number>;
  numeroWhatsapp: string | null;
  bannerCapaUrl: string | null;
  todasCategorias: Categoria[];
  cursoDestaque: Curso | null;
}) {
  const [modalCurso, setModalCurso] = useState<Curso | null>(null);

  // Filtro por categoria (seleção única, via a fileira de chips mobile) +
  // agrupamento de "Todos os Cursos" por categoria — lógica extraída em
  // useCursoFiltro pra ser reaproveitada também na tela de busca dedicada
  // (BuscarPageClient) e no atalho de busca do DesktopHeader (que navega
  // pra lá em vez de filtrar a Home em tempo real — busca por texto/
  // instrutor não existe mais aqui na Home, virou exclusiva da tela de
  // busca, ver DesktopHeader.tsx).
  const { categoriaFiltro, toggleGrupoCategoria, filtroAtivo, categoriasAgrupadas, gruposPorCategoria } = useCursoFiltro(
    todosCursos,
    todasCategorias
  );

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
            <main> reserva por padrão (app/membros/layout.tsx) pro
            MobileHeader/DesktopHeader fixos — a imagem/gradiente do banner
            precisa começar no topo de verdade (y=0) nas duas larguras,
            porque os dois headers são transparentes e flutuam por cima dela
            (logo "M"/"Início" no mobile; logo+menu+busca+avatar no
            desktop). Só o conteúdo de texto lá dentro (chips + card de
            destaque, abaixo) repõe essa folga com pt-14/md:pt-20 próprio,
            pra não ficar embaixo do header. */}
        {bannerCapaUrl && <Image src={bannerCapaUrl} alt="" fill priority quality={100} className="object-cover" />}
        {/* pt-14/md:pt-20: mesma folga que <main> reserva por padrão pro
            MobileHeader/DesktopHeader — repõe aqui porque o wrapper do
            banner acima cancelou aquela folga (-mt-14/md:-mt-20) pra imagem
            começar no topo de verdade nas duas larguras. A fileira de chips
            (só mobile) ou o card de destaque (as duas) é o primeiro
            conteúdo depois dela — sem essa folga ficariam cobertos pelo
            header, mesmo ele sendo transparente (a barra ainda intercepta
            clique/toque, só não pinta nada por cima). */}
        <div className="relative pt-14 md:pt-20">
          {/* Fileira de chips de categoria — só mobile (md:hidden interno,
              mesmo breakpoint do resto). Antes vivia dentro do header fixo
              (HomeMobileHeader, hoje extinto — virou o MobileHeader global,
              que não sabe nada de categorias); agora é conteúdo normal da
              página, rola junto com o resto ao invés de colapsar sozinha ao
              rolar. Sem px aqui em cima: o componente já traz seu próprio
              px-4 (precisa, pro overflow-x-auto ainda mostrar uma margem
              inicial antes do primeiro chip) — colocar outro px-4 no
              wrapper dobraria o respiro lateral só dessa fileira. */}
          <div className="md:hidden">
            <CategoriaChipsMobile
              categoriasAgrupadas={categoriasAgrupadas}
              categoriaFiltro={categoriaFiltro}
              onToggleGrupo={toggleGrupoCategoria}
            />
          </div>

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
        {/* Some inteira com filtro de categoria ativo (via a fileira de
            chips mobile — é o único filtro que ainda existe na própria
            Home) — nesse estado só "Todos os Cursos" (com os resultados)
            fica visível; volta a aparecer assim que o filtro é limpo. */}
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
            // O único filtro que ainda existe na própria Home é a categoria
            // (fileira de chips mobile) — busca por texto/instrutor virou
            // exclusiva da tela de busca dedicada (DesktopHeader navega pra
            // lá em vez de filtrar aqui), então filtroAtivo aqui só liga por
            // causa de categoriaFiltro mesmo.
            emptyMessage={!filtroAtivo ? 'Nenhum curso disponível no momento.' : 'Nenhum curso nessa categoria ainda.'}
          />
        </div>
      </div>

      <AccessModal open={!!modalCurso} onClose={() => setModalCurso(null)} curso={modalCurso} numeroWhatsapp={numeroWhatsapp} />
    </div>
  );
}
