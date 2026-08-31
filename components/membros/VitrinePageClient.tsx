'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play } from 'lucide-react';
import CourseCard from '@/components/membros/CourseCard';
import AccessModal from '@/components/membros/AccessModal';
import Carousel from '@/components/membros/Carousel';
import HomeSearchFilter from '@/components/membros/HomeSearchFilter';
import TodosCursosPorCategoria from '@/components/membros/TodosCursosPorCategoria';
import { CARD_BASIS_CLASSES, TITULO_SECAO_CLASSNAME } from '@/components/membros/cursoListaEstilos';
import { useCursoFiltro } from '@/hooks/useCursoFiltro';
import type { Curso } from '@/types';

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

  // Busca/filtro (categoria + instrutor, seleção múltipla) + agrupamento de
  // "Todos os Cursos" por categoria — lógica extraída em useCursoFiltro pra
  // ser reaproveitada também na tela de busca dedicada (BuscarPageClient,
  // mobile). Aqui na Home a busca flutuante só aparece em desktop/tablet
  // (ver `hidden md:block` abaixo) — no mobile o usuário chega no mesmo
  // resultado pelo ícone de lupa do bottom nav, que leva pra /membros/buscar.
  const {
    busca,
    setBusca,
    categoriaFiltro,
    toggleCategoriaFiltro,
    instrutorFiltro,
    toggleInstrutorFiltro,
    limparFiltros,
    filtroAtivo,
    categoriasDisponiveis,
    instrutoresDisponiveis,
    gruposPorCategoria,
  } = useCursoFiltro(todosCursos);

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

        {/* Busca + filtro flutuando sobre o banner, canto superior direito —
            só em desktop/tablet (`hidden md:block`, mesmo breakpoint que
            separa sidebar lateral de bottom nav no MembrosSidebar). No
            mobile isso vira um item de ícone no bottom nav que leva pra
            /membros/buscar (tela dedicada, sem banner) — ter os dois ao
            mesmo tempo seria redundante e essa barra flutuante compacta não
            tem espaço sobrando numa tela pequena. z-20 garante que fica
            acima da capa/gradientes (que são só inset-0 sem z, então por
            ordem no DOM já ficariam atrás mesmo sem isso — reforço
            explícito). sm:top-6 sm:right-16 alinhado com o mesmo padding
            lateral do conteúdo do banner (sm:px-16 abaixo). Não colide com
            badge/logo/resumo porque eles ficam ancorados à esquerda
            (items-start) — o canto superior direito do banner fica livre. */}
        <div className="absolute right-16 top-6 z-20 hidden md:block">
          <HomeSearchFilter
            query={busca}
            onQueryChange={setBusca}
            categorias={categoriasDisponiveis}
            categoriaIds={categoriaFiltro}
            onToggleCategoria={toggleCategoriaFiltro}
            instrutores={instrutoresDisponiveis}
            instrutorNomes={instrutorFiltro}
            onToggleInstrutor={toggleInstrutorFiltro}
            onLimparFiltros={limparFiltros}
          />
        </div>

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
        {/* Mesmo carrossel da seção "Módulos do curso" (components/membros/
            Carousel.tsx — Embla: drag/swipe, setas prev/next ao lado do
            título, wrap manual nas pontas). Aqui os *ClassName são
            sobrescritos porque, ao contrário da página de curso, esta seção
            não trava altura num h-screen — os cards têm largura em % por
            breakpoint (CARD_BASIS_CLASSES) pra controlar quantos ficam
            visíveis, e a página rola normalmente. Os cards em si (CourseCard)
            não mudaram — continuam aspect-video, só a exibição virou
            carrossel em vez de grid fixo. */}
        {/* Some inteira com busca/filtro ativos (só possível em
            desktop/tablet, via a busca flutuante acima — no mobile ela nem
            aparece, então filtroAtivo nunca fica true por aqui) — nesse
            estado só "Todos os Cursos" (com os resultados) fica visível;
            volta a aparecer assim que busca e filtros são limpos. */}
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

        <TodosCursosPorCategoria
          titulo="Todos os Cursos"
          grupos={gruposPorCategoria}
          acessos={acessos}
          progressoPorCurso={progressoPorCurso}
          onClickLocked={setModalCurso}
          emptyMessage={filtroAtivo ? 'Nenhum curso encontrado com esse filtro.' : 'Nenhum curso disponível no momento.'}
        />
      </div>

      <AccessModal open={!!modalCurso} onClose={() => setModalCurso(null)} curso={modalCurso} numeroWhatsapp={numeroWhatsapp} />
    </div>
  );
}
