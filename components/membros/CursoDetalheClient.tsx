'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Lock, Play, PlayCircle } from 'lucide-react';
import AccessModal from '@/components/membros/AccessModal';
import Carousel from '@/components/membros/Carousel';
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
  proximaAulaId,
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
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  useDificultarInspecao();

  return (
    // Página inteira trava na altura da viewport e não rola verticalmente —
    // hero e seção de módulos dividem esse espaço fixo entre si (flex-col).
    // Só o carrossel, lá dentro, tem scroll (horizontal, tipo Netflix).
    // h-dvh (não h-screen/100vh): no mobile, 100vh conta a área atrás da
    // barra de endereço do navegador, que nem sempre está visível — isso
    // fazia o fim da página (parte do card de módulo) ficar cortado sem
    // aviso, mesmo com as contas de altura batendo "no papel". dvh é a
    // altura realmente visível; em desktop se comporta igual a vh (não muda
    // nada lá).
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* Hero: capa do curso, conteúdo (voltar/badge/título/descrição/botão)
          ancorado embaixo e à esquerda, sobre um gradiente — mesmo padrão
          reutilizado pra qualquer curso, tudo vindo de `curso` (nada fixo
          tipo "UI UX DESIGN PRO" hardcoded). Altura no mobile: intrínseca ao
          conteúdo (sem h-[Xvh] forçado) — o hero só ocupa o que precisa, sem
          "adivinhar" uma porcentagem da tela, sobrando o máximo possível pra
          seção de módulos (que é onde o card de 24.5rem precisa caber). Em
          sm: volta a ser h-[44vh] fixo, como sempre foi. */}
      <div
        className={`relative flex w-full shrink-0 items-center overflow-hidden sm:h-[44vh] ${!hasAccess ? 'locked-card' : ''}`}
      >
        {curso.capa_url && <Image src={curso.capa_url} alt={curso.titulo} fill priority className="object-cover" />}
        {/* Mesmo padrão de gradiente do banner da Home (VitrinePageClient):
            tom vermelho sutil (from-primary/20) se misturando ao preto,
            diagonal — aqui como overlay de verdade sobre a capa, não só
            fallback de quando não há imagem. Empilhado com o gradiente
            vertical já existente (mais escuro embaixo/nas laterais, onde o
            texto fica; mais claro em cima, pra não esconder a capa toda) —
            juntos dão a profundidade + o tom vermelho pedidos, só nessa
            capa, sem mexer em nenhum outro gradiente da página (cards do
            carrossel, sidebar etc. continuam como estavam). */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/10" />

        <div className="relative px-6 py-12 sm:px-16">
          {/* Voltar: router.back() em vez de link fixo pra Home, porque a
              página de curso é acessada de mais de um lugar (Home, "Meus
              Cursos", categorias) — back() sempre volta pra de onde o aluno
              realmente veio, não força ele pra Home se veio de outro lugar.
              Mesmo padrão visual dos botões de seta do carrossel (Carousel.tsx
              — bg-surface-high, hover vermelho) pra ficar consistente com o
              resto da UI. */}
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Voltar"
            className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-high text-on-variant transition-colors hover:bg-primary hover:text-white sm:mb-4"
          >
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>

          {/* Badge de categoria: 100% dinâmico, vem de curso.categoria (join
              feito na página) — some se o curso não tiver categoria
              cadastrada, em vez de mostrar um badge vazio. */}
          {curso.categoria?.nome && (
            <div className="mb-1.5 flex items-center gap-2 sm:mb-2">
              <span className="rounded-full bg-surface-high px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-on-variant">
                {curso.categoria.nome}
              </span>
            </div>
          )}

          <h1 className="text-[2.3rem] font-bold leading-tight text-white drop-shadow-lg sm:text-[3.5rem]">{curso.titulo}</h1>

          {curso.descricao && (
            <p className="mt-1.5 line-clamp-2 max-w-md text-sm leading-relaxed text-on-variant sm:mt-2 sm:line-clamp-3">{curso.descricao}</p>
          )}

          <div className="mt-3 flex items-center gap-3 sm:mt-4">
            {hasAccess ? (
              proximaAulaId ? (
                <Link href={`/membros/player/${proximaAulaId}`} className="btn-primary flex items-center gap-2">
                  <Play size={16} className="fill-white" />
                  Assistir Agora
                </Link>
              ) : (
                <button type="button" disabled className="btn-primary flex items-center gap-2">
                  <Play size={16} className="fill-white" />
                  Assistir Agora
                </button>
              )
            ) : (
              <button type="button" onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
                <Play size={16} className="fill-white" />
                Assistir Agora
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Seção de módulos: ocupa exatamente o espaço vertical restante
          (flex-1). `min-h-0` é essencial aqui — sem isso, o flexbox usa
          min-height:auto por padrão, que ignora o flex-1 e deixa o conteúdo
          "vazar" (voltando a criar scroll na página) sempre que o carrossel
          intrinsecamente quiser mais altura do que sobrou — típico em telas
          baixas tipo 1366x768. Com min-h-0, é essa seção (e o carrossel
          dentro dela) que encolhe pra caber, não a página que estica. */}
      <div
        className="min-h-0 flex-1 px-4 py-0 sm:px-12 sm:py-8"
        style={{ background: 'linear-gradient(0deg,rgba(15, 15, 15, 1) 0%, rgba(1, 1, 1, 1) 100%)' }}
      >
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
  return (
    // Carrossel genérico (components/membros/Carousel.tsx — Embla: drag com
    // mouse, swipe de touch, wrap manual nas pontas em vez do loop infinito
    // nativo). Os *ClassName abaixo são os defaults do componente, repetidos
    // aqui só pra documentar o motivo de cada um (o componente em si não
    // sabe nada de curso/módulo — a única coisa curso-específica aqui é o
    // ModuloCard passado em renderItem).
    <Carousel
      items={modulos}
      getKey={(modulo) => modulo.id}
      // Fixo, de propósito — não vem de curso.titulo nem de nenhum outro
      // campo do banco. É o mesmo texto em toda página de curso da
      // plataforma, independente de qual curso for exibido.
      title="Módulos do curso"
      prevLabel="Módulos anteriores"
      nextLabel="Próximos módulos"
      emptyMessage="Nenhum módulo publicado ainda."
      // h-full: recebe a altura exata que a seção de módulos calculou pra ela
      // (o "resto" do 100vh depois do hero) e reparte entre o título (linha
      // fixa) e a área do carrossel (o resto disso, de novo).
      outerClassName="flex h-full min-h-0 flex-col"
      // Título + setas lado a lado, alinhados à direita na mesma linha — não
      // ficam mais sobrepostos aos cards nas laterais do carrossel. As setas
      // nunca somem: o wrap manual (dentro do Carousel) garante que sempre
      // há uma próxima ação, mesmo nas pontas da lista. shrink-0: essa linha
      // nunca perde altura — só a área do carrossel abaixo encolhe quando a
      // tela é baixa. mb-6 no mobile (mais respiro antes dos cards) —
      // sm:mb-2 restaura o valor original a partir daí.
      headerClassName="mb-[1.8rem] flex shrink-0 items-center justify-between gap-4 sm:mb-2"
      // `overflow-hidden` é a "janela" do carrossel (ref do Embla), com
      // altura relativa (flex-1 min-h-0 — o resto do espaço depois do
      // título) em vez de "altura do conteúdo": é isso que faz ela encolher
      // em telas baixas em vez de empurrar a página pra baixo. Continua
      // `overflow-hidden` nos dois eixos (não `overflow-x-auto` +
      // `overflow-y-visible` como poderia parecer o caminho óbvio pra não
      // cortar o hover): o CSS normaliza isso sozinho — quando um eixo é
      // "visible" e o outro não, o "visible" vira "auto" — ou seja, ainda
      // cortaria, só que sem avisar. Também precisamos do overflow-hidden
      // nos dois eixos aqui mesmo: é ele que esconde os cards fora da área
      // visível do carrossel (senão a lista inteira apareceria de uma vez,
      // sem o efeito de "janela" rolável). A solução real é dar folga de
      // verdade (abaixo) — grande o suficiente pra cobrir não só o
      // scale-[1.04] (2% do card) mas também o shadow-overlay do hover, que
      // se espalha até 24px pra fora da borda do card.
      viewportClassName="min-h-0 flex-1 overflow-hidden"
      // px-2 py-6 no track: a altura/largura de cada card (abaixo) vem
      // daqui — 100% do espaço, menos essa folga. py-6 (24px) cobre o
      // scale-[1.04] + a sombra do hover sem cortar em cima/embaixo; px-2 dá
      // uma margem pros cards das pontas (1º e último), que antes não
      // tinham nenhuma folga lateral pro hover. py-2 no mobile (hover de
      // mouse não acontece em touch, então a folga extra pro scale/sombra
      // importa menos ali) — sm:py-6 restaura o valor original a partir daí.
      trackClassName="flex h-full gap-4 px-2 py-2 sm:py-6"
      // aspect-[3/4] + h-full: a largura normalmente vem calculada a partir
      // da altura disponível, pra encolher em telas baixas sem nunca criar
      // scroll de página. max-h-[24.5rem] só no mobile: card mais alto,
      // pedido explícito — combinado com o hero agora intrínseco (sem
      // h-[Xvh] forçado) e o h-dvh no container principal, isso cabe sem
      // gerar scroll na maioria dos aparelhos. min-w-32 continua como piso
      // (card não fica fino demais em telas muito baixas); sem max-w no
      // mobile (o max-w-64 antigo virou só sm:) — com o teto de altura em
      // 24.5rem, a proporção 3:4 já limita a largura sozinha a ~18.4rem,
      // então um teto de largura separado só cortaria essa proporção sem
      // necessidade. sm:max-h-none/sm:min-w-40/sm:max-w-64 restauram o
      // comportamento original a partir daí (desktop/tablet).
      itemClassName="aspect-[3/4] h-full max-h-[26rem] min-w-32 shrink-0 sm:max-h-none sm:min-w-40 sm:max-w-64"
      renderItem={(modulo) => (
        <ModuloCard
          modulo={modulo}
          hasAccess={hasAccess}
          bloqueadoPorTrial={hasAccess && trialModuloUnicoId !== null && trialModuloUnicoId !== modulo.id}
          onClickLocked={onClickLocked}
        />
      )}
    />
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
    // h-full em vez de aspect-[3/4]: a proporção 3/4 agora é definida no
    // wrapper do slide (ModulosCarousel), aqui só herda a altura/largura já
    // calculadas — repetir aspect-ratio nos dois níveis seria redundante.
    <div className="group relative h-full w-full hover:z-10">
      <div
        className={`relative h-full w-full overflow-hidden rounded-lg bg-surface-highest ring-1 ring-transparent transition-all duration-200 ease-out group-hover:scale-[1.04] group-hover:shadow-overlay group-hover:ring-primary/60 ${bloqueado ? 'locked-card' : ''}`}
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

        {/* font-size 1.1rem / font-weight 400 substituem o estilo anterior
            (0.95rem / font-semibold); margin: 10px e padding: 0 5px continuam
            os mesmos de antes. Cor branca e posição (canto inferior, sobre a
            imagem) também continuam. Sem ícone antes do texto — não havia
            nenhum aqui pra remover. */}
        <p className="absolute inset-x-0 bottom-2 m-[10px] px-[5px] py-0 text-[1.1rem] font-normal leading-tight text-white">
          {formatTitulo(modulo.titulo)}
        </p>

        {/* Barra de progresso fina na borda inferior do card */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-surface-high">
          <div className="h-full bg-primary" style={{ width: `${progressoModulo}%` }} />
        </div>
      </div>
    </div>
  );

  if (!hasAccess) {
    return (
      <button onClick={onClickLocked} className="block h-full w-full text-left">
        {content}
      </button>
    );
  }

  // Módulo travado pelo trial de 30min (curso liberado, mas só o Módulo 1
  // fica acessível até a confirmação do pagamento): sem clique, sem abrir o
  // modal de "solicitar acesso" (que é pra quem não tem o curso liberado).
  if (bloqueadoPorTrial) {
    return (
      <div title="Disponível após a confirmação do pagamento" className="block h-full w-full cursor-not-allowed">
        {content}
      </div>
    );
  }

  if (!proximaAulaDoModulo) {
    return <div className="block h-full w-full cursor-not-allowed opacity-60">{content}</div>;
  }

  return (
    <Link href={`/membros/player/${proximaAulaDoModulo.id}`} className="block h-full w-full">
      {content}
    </Link>
  );
}
