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
import HomeMobileHeader, { GAP_LOGO_TITULO_PX } from '@/components/membros/HomeMobileHeader';
import CursoDestaqueMobile from '@/components/membros/CursoDestaqueMobile';
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
  bannerBadge,
  bannerResumo,
  continuarAssistindoHref,
  temProgresso,
  todasCategorias,
  cursoDestaque,
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
  todasCategorias: Categoria[];
  cursoDestaque: Curso | null;
}) {
  const [modalCurso, setModalCurso] = useState<Curso | null>(null);

  // Altura real do cabeçalho compacto mobile (HomeMobileHeader — logo+
  // "Início" + fileira de chips, estado expandido/topo), medida no
  // navegador — não é dinâmica; remeça se o header mudar de altura. Usada
  // só pra montar o número do comentário/aviso abaixo — a classe
  // `pt-[101px]` no JSX continua sendo o valor que de fato vale (Tailwind
  // não lê essa conta em runtime).
  const HEADER_HEIGHT_PX = 93;
  const PT_MOBILE_ESPERADO_PX = HEADER_HEIGHT_PX + GAP_LOGO_TITULO_PX;
  if (process.env.NODE_ENV !== 'production' && PT_MOBILE_ESPERADO_PX !== 101) {
    console.warn(
      `[VitrinePageClient] pt-[101px] (classe do card de destaque mobile) está desatualizado — devia ser pt-[${PT_MOBILE_ESPERADO_PX}px] ` +
        `(HEADER_HEIGHT_PX=${HEADER_HEIGHT_PX} + GAP_LOGO_TITULO_PX=${GAP_LOGO_TITULO_PX}, de HomeMobileHeader.tsx). Atualize a classe manualmente.`
    );
  }

  // Busca/filtro (categoria + instrutor, seleção múltipla) + agrupamento de
  // "Todos os Cursos" por categoria — lógica extraída em useCursoFiltro pra
  // ser reaproveitada também na tela de busca dedicada (BuscarPageClient,
  // mobile). Aqui na Home a busca flutuante só aparece em desktop/tablet
  // (ver `hidden md:block` abaixo); no mobile ela some, mas a fileira de
  // chips de categoria (CategoriaChipsMobile, md:hidden também) usa o MESMO
  // categoriaFiltro/toggleGrupoCategoria — então filtroAtivo também pode
  // ficar true a partir do mobile agora, não só do desktop.
  const {
    busca,
    setBusca,
    categoriaFiltro,
    toggleCategoriaFiltro,
    toggleGrupoCategoria,
    instrutorFiltro,
    toggleInstrutorFiltro,
    limparFiltros,
    filtroAtivo,
    categoriasDisponiveis,
    categoriasAgrupadas,
    instrutoresDisponiveis,
    gruposPorCategoria,
  } = useCursoFiltro(todosCursos, todasCategorias);

  return (
    <div className="pb-12">
      {/* Banner da Home: capa (Configurações > Banner da Página Inicial) sem
          texto embutido — badge, logo e resumo são renderizados aqui, por
          cima da imagem, não fazem mais parte do arquivo enviado pelo admin.
          Sem capa configurada ainda, cai num gradiente vermelho/preto em vez
          de ficar sem fundo nenhum. Altura vem do padding do conteúdo (não
          de aspect-ratio fixo), então acomoda o botão novo sem espremer. */}
      <div className="relative w-full overflow-hidden bg-gradient-to-br from-primary/25 via-background to-background">
        {/* Cabeçalho compacto (logo + "Início" + chips de categoria),
            estilo app da Netflix — só no mobile (md:hidden, mesmo
            breakpoint em que a sidebar vira bottom nav — ver
            MembrosSidebar.tsx). `fixed` (não `absolute`): fica sempre
            visível no topo mesmo com a página rolando, igual à bottom nav
            mobile. Substitui o wordmark grande do banner nesse breakpoint
            (ele ganhou `hidden md:block` logo abaixo). Transparente no
            topo / sólido + chips colapsados ao rolar — todo esse
            comportamento (incluindo o listener de scroll com throttle via
            rAF) mora dentro do componente, ver HomeMobileHeader.tsx. z-30:
            acima do banner/gradientes; abaixo do bottom nav (z-40) e de
            modais. */}
        <HomeMobileHeader
          categoriasAgrupadas={categoriasAgrupadas}
          categoriaFiltro={categoriaFiltro}
          onToggleGrupo={toggleGrupoCategoria}
        />

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

        {/* pt-[101px] no mobile: espaço pro cabeçalho compacto (fixed,
            sobreposto) não cobrir o card de destaque abaixo — valor exato,
            não chutado: HEADER_HEIGHT_PX (header — logo+"Início" + fileira
            de chips — medido no navegador) + GAP_LOGO_TITULO_PX (o mesmo
            gap-2 usado entre o logo e "Início", ver HomeMobileHeader.tsx) =
            93 + 8 = 101px de espaço até o topo do card, igual ao gap do
            logo. Antes disso o gap real era de 19px (pt-28 = 112px), sem
            relação nenhuma com o gap do logo.
            Tailwind não permite montar `pt-[Npx]` a partir de uma variável
            em runtime (o compilador precisa ver a classe completa como
            texto no código-fonte) — por isso o valor abaixo continua uma
            classe estática, mas o cálculo que a origina usa a MESMA
            constante importada de HomeMobileHeader (GAP_LOGO_TITULO_PX), e
            o aviso do console abaixo (só em dev) avisa se esse "101"
            ficar desatualizado depois de uma mudança no gap-2 ou na altura
            do header.
            pb-6: o card de destaque já é bem mais compacto que o bloco de
            texto de antes, não precisa de mais folga embaixo. sm:py-20
            (sem chips fixos nesse breakpoint, texto original) continua
            igual. */}
        <div className="relative px-4 pb-6 pt-[101px] sm:px-16 sm:py-20">
          {/* Mobile: o bloco de texto (badge/wordmark/resumo/CTA) vira o
              card de destaque estilo hero — no lugar dele, não junto. Some
              a partir de md, onde o bloco de texto (abaixo) assume. */}
          {cursoDestaque && (
            <div className="md:hidden">
              <CursoDestaqueMobile
                curso={cursoDestaque}
                hasAccess={!!acessos[cursoDestaque.id]}
                onClickComprar={() => setModalCurso(cursoDestaque)}
              />
            </div>
          )}

          {/* Desktop/tablet: bloco de texto original (badge + wordmark +
              resumo + Continuar assistindo) — hidden no mobile, onde o card
              de destaque acima assume o lugar dele por completo. */}
          <div className="hidden flex-col items-start gap-4 md:flex">
            {/* Mesma classe do badge de categoria em CursoDetalheClient.tsx
                (ex: "FIGMA") — consistência visual entre os dois banners. */}
            {bannerBadge && (
              <span className="rounded-full bg-surface-high px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-on-variant">
                {bannerBadge}
              </span>
            )}

            <Image src="/logo.png" alt="MembersFlix" width={420} height={84} priority className="h-20 w-auto object-contain" />

            {bannerResumo && <p className="max-w-xl text-sm text-on-variant sm:text-base">{bannerResumo}</p>}

            <Link href={continuarAssistindoHref} className="btn-primary mt-2 flex items-center gap-2">
              <Play size={18} className="fill-white" />
              {temProgresso ? 'Continuar assistindo' : 'Assistir Agora'}
            </Link>
          </div>
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
        {/* Some inteira com filtro ativo (busca/instrutor no desktop via a
            busca flutuante, ou categoria via os chips mobile) — nesse
            estado só "Todos os Cursos" (com os resultados) fica visível;
            volta a aparecer assim que o filtro é limpo. */}
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
          emptyMessage={
            !filtroAtivo
              ? 'Nenhum curso disponível no momento.'
              : // Só categoria marcada (sem busca/instrutor) — caso dos chips
                // mobile — ganha a mensagem específica pedida; combinações
                // com busca/instrutor (só possíveis no desktop) continuam
                // com a mensagem genérica.
                categoriaFiltro.length > 0 && !busca.trim() && instrutorFiltro.length === 0
                ? 'Nenhum curso nessa categoria ainda.'
                : 'Nenhum curso encontrado com esse filtro.'
          }
        />
      </div>

      <AccessModal open={!!modalCurso} onClose={() => setModalCurso(null)} curso={modalCurso} numeroWhatsapp={numeroWhatsapp} />
    </div>
  );
}
