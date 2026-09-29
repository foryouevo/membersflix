'use client';

import { useEffect, useRef, useState } from 'react';
import { GraduationCap, PlayCircle, Users, LayoutGrid, type LucideIcon } from 'lucide-react';
import Container from '@/components/institucional/Container';
import SectionHeader from '@/components/institucional/SectionHeader';

// Duração/easing do contador (pedido explícito). requestAnimationFrame
// puro (sem lib nova) com easeOutCubic — começa rápido, desacelera até o
// valor final.
const DURACAO_MS = 2000;
const ATRASO_ENTRE_ITENS_MS = 100;

// Os 3 primeiros números são FIXOS (pedido explícito: "mantenha os mesmos
// dados do array") — só o 4º (nichos) é calculado a partir da lista REAL
// de categorias (mesma fonte que alimenta a coluna "Cursos" do footer, ver
// LandingFooter.tsx/HeroSection.tsx), com 13 como fallback só se a lista
// vier vazia. PRA EDITAR os 3 primeiros: mexa só aqui.
//
// `sufixoPequeno`: pedido explícito desta tarefa — sufixos em PALAVRA
// (" mil+", " nichos") ficam menores (~0.55em do número, ver NumeroItem)
// pra "13 nichos" caber na célula sem estourar; sufixos de símbolo só
// ("+", nos itens "99+"/"1.000+") continuam no MESMO tamanho do número.
const NUMEROS_FIXOS: { Icone: LucideIcon; valor: number; sufixo: string; sufixoPequeno: boolean; rotulo: string }[] = [
  { Icone: GraduationCap, valor: 99, sufixo: '+', sufixoPequeno: false, rotulo: 'cursos' },
  { Icone: PlayCircle, valor: 1000, sufixo: '+', sufixoPequeno: false, rotulo: 'aulas' },
  { Icone: Users, valor: 2, sufixo: ' mil+', sufixoPequeno: true, rotulo: 'usuários' },
];

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3);
}

// Classes de borda/padding de cada célula do grid 2x2 de estatísticas —
// reescrito nesta tarefa (causa raiz de um bug relatado: "a linha
// vertical tem um vão entre a 1ª e a 2ª fileira, a horizontal tem um vão
// no centro" — o grid ANTES usava `gap-x-8 gap-y-10` do Tailwind pra
// separar as células, e cada borda só cobria a ALTURA/LARGURA da própria
// célula; como o gap fica FORA de qualquer célula, a linha "sumia"
// bem no meio do vão entre uma célula e outra, em vez de atravessar
// contínua). Correção (pedido explícito): SEM gap nenhum no grid — o
// espaçamento agora vem só do PADDING de cada célula (pr/pb na coluna
// esquerda, pl/pt na direita e nas de baixo), então as bordas ficam
// exatamente coladas nas células vizinhas e formam uma cruz única e
// contínua, sem vão. padding menor no mobile (16-20px, pedido explícito)
// crescendo pra 32px a partir de lg.
function estiloCelula(i: number) {
  const cor = 'border-black/10 dark:border-white/10';
  const padBase = 'pb-4 sm:pb-5 lg:pb-8'; // só a 1ª linha (0 e 1) precisa
  const padTopo = 'pt-4 sm:pt-5 lg:pt-8'; // só a 2ª linha (2 e 3) precisa
  if (i === 0) return `pr-4 sm:pr-5 lg:pr-8 ${padBase}`;
  if (i === 1) return `border-l pl-4 sm:pl-5 lg:pl-8 ${padBase} ${cor}`;
  if (i === 2) return `border-t pr-4 sm:pr-5 lg:pr-8 ${padTopo} ${cor}`;
  return `border-l border-t pl-4 sm:pl-5 lg:pl-8 ${padTopo} ${cor}`;
}

/**
 * Item individual do grid de estatísticas — ícone num círculo vermelho
 * translúcido, número animado (0 até o valor final) + sufixo em vermelho
 * (sempre visível, nunca anima) e rótulo cinza embaixo, tudo alinhado à
 * ESQUERDA (pedido explícito desta tarefa — era centralizado).
 *
 * Reserva de largura (pedido explícito — "sem pulo de layout"): a MESMA
 * técnica de grid-overlap já usada em outros lugares do projeto pro flip
 * do card de login/crossfades do header (ver LoginPageClient.tsx,
 * LandingHeader.tsx) — um <span> INVISÍVEL com o valor FINAL já formatado
 * ocupa a célula de grid (reserva a largura real, final), e o <span>
 * animado fica por cima, na MESMA célula — nunca "treme" nem desloca o
 * rótulo/vizinhos durante a contagem.
 */
function NumeroItem({
  Icone,
  valor,
  sufixo,
  sufixoPequeno,
  rotulo,
  ativo,
  atrasoMs,
  className,
}: {
  Icone: LucideIcon;
  valor: number;
  sufixo: string;
  sufixoPequeno: boolean;
  rotulo: string;
  ativo: boolean;
  atrasoMs: number;
  className: string;
}) {
  const [montado, setMontado] = useState(false);
  const [reduzido, setReduzido] = useState(false);
  const [valorAtual, setValorAtual] = useState(0);
  const jaAnimouRef = useRef(false);

  useEffect(() => {
    setMontado(true);
    setReduzido(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (!montado) return;
    // prefers-reduced-motion: mostra o valor final direto, sem animação
    // (pedido explícito) — nem precisa esperar a seção ficar visível.
    if (reduzido) {
      setValorAtual(valor);
      return;
    }
    if (!ativo || jaAnimouRef.current) return;
    jaAnimouRef.current = true;

    let quadro: number;
    let inicio: number | null = null;

    const temporizador = setTimeout(() => {
      function passo(agora: number) {
        if (inicio === null) inicio = agora;
        const progresso = Math.min(1, (agora - inicio) / DURACAO_MS);
        setValorAtual(Math.round(valor * easeOutCubic(progresso)));
        if (progresso < 1) quadro = requestAnimationFrame(passo);
      }
      quadro = requestAnimationFrame(passo);
    }, atrasoMs);

    return () => {
      clearTimeout(temporizador);
      cancelAnimationFrame(quadro);
    };
  }, [montado, reduzido, ativo, valor, atrasoMs]);

  const valorFinalFormatado = valor.toLocaleString('pt-BR');
  const valorAtualFormatado = valorAtual.toLocaleString('pt-BR');
  const classeSufixo = sufixoPequeno ? 'text-[0.55em]' : '';

  return (
    <div
      className={`flex min-w-0 flex-col items-start text-left ${className}`}
      // aria-label com o valor FINAL (pedido explícito de acessibilidade)
      // — o conteúdo visual (número animado + sufixo) fica aria-hidden,
      // pra leitor de tela nunca anunciar o número no meio da contagem.
      aria-label={`${valorFinalFormatado}${sufixo} ${rotulo}`}
    >
      {/* Círculo do ícone — 36px mobile/tablet, 40px a partir de lg
          (pedido explícito: "36 a 40px"), fundo vermelho translúcido. */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 lg:h-10 lg:w-10">
        <Icone className="h-[18px] w-[18px] text-primary lg:h-5 lg:w-5" strokeWidth={1.75} aria-hidden="true" />
      </div>

      {/* Número — clamp 32-36px mobile, 40-56px a partir de sm (pedido
          explícito: "nunca mais que 56px"). leading-none + min-w-0 +
          whitespace-nowrap: nunca quebra linha nem estoura a célula. */}
      <span className="relative mt-3 inline-grid min-w-0 whitespace-nowrap leading-none [font-variant-numeric:tabular-nums]">
        <span aria-hidden="true" className="invisible col-start-1 row-start-1 text-[clamp(2rem,8vw,2.25rem)] font-semibold sm:text-[clamp(2.5rem,5vw,3.5rem)]">
          {valorFinalFormatado}
          <span className={classeSufixo}>{sufixo}</span>
        </span>
        <span
          aria-hidden="true"
          className="col-start-1 row-start-1 text-[clamp(2rem,8vw,2.25rem)] font-semibold text-gray-900 dark:text-white sm:text-[clamp(2.5rem,5vw,3.5rem)]"
        >
          {valorAtualFormatado}
          <span className={`text-primary ${classeSufixo}`}>{sufixo}</span>
        </span>
      </span>

      <span className="mt-2 text-sm text-gray-500 dark:text-gray-400 sm:text-base">{rotulo}</span>
    </div>
  );
}

/**
 * Seção "Em números" — layout refeito nesta tarefa (era título centralizado
 * + 4 colunas numa linha só no desktop, causa raiz da sobreposição
 * relatada entre "2 mil+" e "13 nichos": só sobrava 1/4 da largura do
 * container pra cada item). Agora: 2 colunas lado a lado a partir de lg
 * (esquerda = eyebrow + título; direita = grid de estatísticas 2x2,
 * SEMPRE 2x2 em qualquer largura — ver bordaCelula acima), empilhando em
 * 1 coluna abaixo de lg. Estrutura/composição copiada de uma referência
 * visual — cores/fonte/textos continuam os do projeto.
 *
 * `categorias`: MESMA prop que já chega em LandingPageClient vinda de
 * app/page.tsx (13 categorias reais do banco) — reaproveitada aqui só pra
 * contar quantos NICHOS existem (4º número), sem duplicar dado nenhum;
 * fallback 13 (pedido explícito) só se a lista vier vazia.
 *
 * `destinoLogado`: repassado pro SectionHeader (que repassa pro
 * CtaButtons compartilhado) — mesma lógica de sempre.
 */
export default function NumerosSection({ categorias, destinoLogado }: { categorias: { id: string; nome: string }[]; destinoLogado: string | null }) {
  const totalNichos = categorias.length > 0 ? categorias.length : 13;
  const numeros = [...NUMEROS_FIXOS, { Icone: LayoutGrid, valor: totalNichos, sufixo: ' nichos', sufixoPequeno: true, rotulo: 'de cursos na plataforma' }];

  const gridRef = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(false);

  // Dispara a contagem UMA vez só, quando o grid entra 30% na tela
  // (pedido explícito) — desconecta o observer depois de disparar, pra
  // nunca reiniciar ao rolar de volta.
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAtivo(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Container className="py-16 lg:py-24">
      {/* grid-cols-[minmax(0,7fr)_minmax(0,7fr)] a partir de lg (colunas
          IGUAIS) + lg:gap-x-16 (4rem, pedido explícito desta tarefa — era
          gap-x-8/2rem incondicional). `lg:` no gap agora (era sem
          prefixo): abaixo de lg só existe 1 coluna, gap-x não faz
          diferença nenhuma ali de qualquer forma, mas precisa ficar
          fora do `lg:` mesmo assim porque o valor MUDOU (4rem só vale a
          partir de lg — sem o prefixo, valeria em qualquer largura,
          embora sem efeito visível abaixo de lg). gap-y-10 (40px)
          inalterado — respiro entre os dois blocos quando empilhados. */}
      <div className="grid grid-cols-1 items-center gap-y-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,7fr)] lg:gap-x-16">
        {/* COLUNA ESQUERDA — SectionHeader compartilhado (ver o
            componente). Nesta tarefa: novo título + só 1 botão ("Saiba
            mais", via `actions`, ver mais abaixo) — eyebrow e texto de
            apoio mantidos como já estavam (pedido explícito: só mudar se
            ficassem repetitivos com o novo título — ver resumo desta
            tarefa, avisei sobre uma sobreposição leve em vez de mudar
            por conta própria). max-w do título/texto subiu pra 560px
            (era 480px, ver SectionHeader.tsx) — pedido explícito, a
            coluna ficou mais larga (era 5fr, agora 7fr). */}
        <SectionHeader
          eyebrow="Veja o que a [[MembersFlix]] oferece"
          title="Aprenda no seu ritmo, [[sem prazo]]"
          description="Cursos gravados, aulas organizadas por módulo e acesso vitalício para você estudar no seu ritmo, de onde estiver."
          align="left"
          destinoLogado={destinoLogado}
          // Só "Saiba mais" (pedido explícito desta tarefa — era os 2
          // botões padrão) — âncora pra #plataforma, MESMO id usado pelo
          // link "Plataforma" do menu (LandingHeader.tsx, ITENS_MENU) e
          // pela seção de destino (LandingPageClient.tsx, já tem
          // scroll-mt-24 pra não ficar atrás do header fixo). O scroll
          // suave é tratado dentro do próprio SectionHeader (ver
          // BotaoAcao lá — detecta o "#" e reusa scrollSuaveParaSecao de
          // lib/utils.ts, MESMO mecanismo do menu).
          actions={{ primary: { label: 'Saiba mais', href: '#plataforma' } }}
        />

        {/* COLUNA DIREITA — grid de estatísticas 2x2 (pedido explícito:
            SEMPRE 2x2, aqui e no empilhado mobile/tablet). SEM gap (ver
            estiloCelula acima — causa raiz do bug dos divisores com vão):
            o espaçamento vem só do padding de cada célula agora. */}
        <div ref={gridRef} className="grid grid-cols-2">
          {numeros.map((n, i) => (
            <NumeroItem key={n.rotulo} {...n} ativo={ativo} atrasoMs={i * ATRASO_ENTRE_ITENS_MS} className={estiloCelula(i)} />
          ))}
        </div>
      </div>
    </Container>
  );
}
