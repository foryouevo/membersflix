'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import Container from '@/components/institucional/Container';
import SectionHeader from '@/components/institucional/SectionHeader';
import { BOTAO_PRIMARIO_TAMANHO } from '@/components/institucional/CtaButtons';

/**
 * Dados dos 3 planos — array só pra editar aqui (pedido explícito). Nomes
 * "Um curso"/"Um nicho"/"Plataforma completa" são PROVISÓRIOS (baseados na
 * descrição de cada um, ver resumo desta tarefa) — troque `nome` à vontade,
 * o resto do componente acompanha sozinho. `href`: destino do botão "Quero
 * este plano" — hoje aponta pro MESMO cadastro que "Criar conta grátis"
 * usa (nenhum checkout de verdade existe ainda); troque por um link de
 * checkout quando tiver um, por plano.
 *
 * `inclui`: os 2 primeiros itens são específicos de cada plano (dados reais
 * passados nesta tarefa); os 2 últimos ("Aulas organizadas por módulo" /
 * "Estude de onde estiver") são os MESMOS 2 diferenciais que já aparecem em
 * PlataformaSection.tsx — pedido explícito: "adicione também dois itens que
 * já existem no site" — repetidos aqui como string (não importados de lá:
 * são textos curtos, coincidentes por pedido do usuário, não um dado
 * compartilhado que precise nascer de uma única fonte).
 *
 * `popular` (pedido explícito de uma tarefa posterior — era `destaque`,
 * renomeado pra bater com o pedido "marque com um campo `popular: true`"):
 * UM campo só decide TUDO nesse card — badge "Popular", borda/brilho de
 * destaque em repouso E os efeitos de hover (ver CardPlano, abaixo). O
 * componente lê esse campo (nunca fixa pelo índice `i === 1`), então mover
 * o `popular: true` pra outro item do array já move o destaque inteiro
 * sozinho.
 */
type Plano = {
  nome: string;
  preco: number;
  descricao: string;
  inclui: string[];
  href: string;
  popular?: boolean;
};

const PLANOS: Plano[] = [
  {
    nome: 'Um curso',
    preco: 97,
    descricao: 'Escolha 1 curso da plataforma e estude com acesso vitalício.',
    inclui: ['Acesso a 1 curso da plataforma, à sua escolha', 'Acesso vitalício', 'Aulas organizadas por módulo', 'Estude de onde estiver'],
    href: '/login?form=cadastro', // TODO: link de checkout do plano
  },
  {
    nome: 'Um nicho',
    preco: 297,
    descricao: 'Escolha um nicho e tenha acesso a todos os cursos dele.',
    inclui: ['Acesso a todos os cursos do nicho que você escolher', 'Acesso vitalício', 'Aulas organizadas por módulo', 'Estude de onde estiver'],
    href: '/login?form=cadastro', // TODO: link de checkout do plano
    popular: true,
  },
  {
    nome: 'Plataforma completa',
    preco: 997,
    descricao: 'Acesso a todos os cursos da plataforma.',
    inclui: ['Acesso a todos os cursos da plataforma', 'Acesso vitalício', 'Aulas organizadas por módulo', 'Estude de onde estiver'],
    href: '/login?form=cadastro', // TODO: link de checkout do plano
  },
];

// Hover em TODOS os 3 cards (pedido explícito de uma tarefa posterior —
// antes só o popular tinha) — UMA classe base (`PLAN_CARD`, estrutura +
// sobe levemente no hover, igual nos 3) + UMA variante por cor de borda/
// brilho (`PLAN_CARD_PADRAO` para os cards 1/3, `PLAN_CARD_POPULAR` pro
// card do meio) — nunca as DUAS variantes juntas no mesmo elemento (`cn`
// não é tailwind-merge, não resolve conflito de utilitário por ordem no
// className — duas classes `border-*`/`hover:border-*` diferentes no
// MESMO elemento empatariam em especificidade CSS e o resultado dependeria
// da ordem de geração do Tailwind, não da ordem no JSX; por isso a cor da
// borda/brilho SEMPRE vem de exatamente UMA das duas variantes, nunca das
// duas ao mesmo tempo, ver CardPlano abaixo).
//
// `[@media(hover:hover)]:hover:` (não só `hover:`, pedido explícito —
// "somente em dispositivos com hover real"): a maioria dos navegadores
// mobile TAMBÉM dispara `:hover` num toque (e some só no próximo toque em
// outro lugar, o efeito "preso" que o pedido quer evitar) — `hover: hover`
// é a media feature que só bate verdadeiro em ponteiros que realmente
// pairam (mouse/trackpad), nunca em touchscreen, então o card nunca fica
// "preso" no estado de hover no mobile.
//
// translateY só dentro de `(prefers-reduced-motion: no-preference)`
// (pedido explícito — "sem translate, só cor/brilho" no reduced-motion):
// border/shadow continuam mudando de cor/intensidade em QUALQUER
// preferência de movimento (mudança de cor não é a animação que
// prefers-reduced-motion pede pra evitar).
const PLAN_CARD = cn(
  'group relative flex h-full w-full max-w-md flex-col overflow-hidden rounded-3xl border bg-gray-50 p-6 dark:bg-surface sm:p-8 lg:max-w-none',
  'transition-[transform,border-color,box-shadow] duration-300 ease-out',
  '[@media(hover:hover)_and_(prefers-reduced-motion:no-preference)]:hover:-translate-y-1.5'
);

// Cards 1/3 (pedido explícito): borda cinza sutil em repouso (igual
// sempre foi) — no hover, vermelho SUAVE + brilho vermelho suave ao redor
// (novo, não existia antes).
const PLAN_CARD_PADRAO = cn(
  'border-black/10 dark:border-white/10',
  '[@media(hover:hover)]:hover:border-primary/40',
  '[@media(hover:hover)]:hover:shadow-[0_0_40px_-14px_rgba(229,9,20,0.35)]'
);

// Card do meio (pedido explícito): já nasce com borda/brilho vermelhos
// (repouso) — no hover, os dois só INTENSIFICAM (mesmo efeito de antes,
// preservado, agora só reorganizado dentro do par PLAN_CARD/PLAN_CARD_POPULAR).
const PLAN_CARD_POPULAR = cn(
  'border-primary/40',
  '[@media(hover:hover)]:hover:border-primary/70',
  '[@media(hover:hover)]:hover:shadow-[0_0_60px_-14px_rgba(229,9,20,0.5)]'
);

/**
 * Um card de plano — bloco superior (nome/preço/descrição/botão) + lista
 * "O que está incluso". `popular` (só o card do meio, pedido explícito):
 * badge "Popular" (canto superior direito, alinhado com o nome do plano —
 * `justify-between` no lugar de `absolute`: cresce/quebra junto com o nome
 * em vez de correr risco de sobrepor um ao outro em telas estreitas, pedido
 * explícito "não pode cortar nem sobrepor"), borda vermelha sutil + brilho
 * vermelho no fundo (repouso). Hover (pedido explícito de uma tarefa
 * posterior — antes só existia neste card): agora TODOS os 3 cards têm,
 * via `PLAN_CARD`/`PLAN_CARD_PADRAO`/`PLAN_CARD_POPULAR` acima — sempre no
 * elemento INTERNO (este `<div>`, que já tem borda/fundo), NUNCA no
 * wrapper com `data-aos` (PlanosSection, abaixo) — evita brigar com o
 * `transform` da animação de entrada. O botão "Quero este plano" não
 * precisa de nenhuma classe de hover NOVA — já herda `hover:bg-primary-hover`
 * de `.btn-primary` (MESMO padrão de qualquer outro botão vermelho do
 * site, pedido explícito: "mantém o hover normal dos outros botões").
 */
function CardPlano({ plano, style }: { plano: Plano; style?: React.CSSProperties }) {
  return (
    <div className={cn(PLAN_CARD, plano.popular ? PLAN_CARD_POPULAR : PLAN_CARD_PADRAO)} style={style}>
      {/* Brilho vermelho sutil no fundo do card em destaque (repouso) —
          MESMA técnica (radial-gradient absolute) já usada em
          MolduraCartao, PlataformaSection.tsx, não uma nova. */}
      {plano.popular && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(229,9,20,0.14),transparent_70%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(229,9,20,0.22),transparent_70%)]"
          />
          {/* 2ª camada do brilho, só no hover (pedido explícito: "o brilho
              vermelho do fundo fica mais intenso") — opacity-0 em repouso,
              some pro `group-hover` (card inteiro é o `group`, acima)
              trazer ela pra opacity-100 com fade suave; mesma restrição de
              hover real da constante HOVER_CARD_DESTAQUE (não duplica a
              media feature aqui: usa a MESMA classe `group`, então só
              precisa gatilhar quando o `:hover` do pai realmente bate —
              Tailwind não tem um jeito de "herdar" a media feature de fora
              pra dentro de um group-hover, por isso o `[@media(hover:hover)]`
              é repetido aqui, é a única forma). */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(ellipse_80%_65%_at_50%_100%,rgba(229,9,20,0.32),transparent_70%)] opacity-0 transition-opacity duration-300 [@media(hover:hover)]:group-hover:opacity-100"
          />
        </>
      )}

      <div className="relative flex h-full flex-col">
        {/* Bloco superior — nome/preço/descrição/botão. flex-1 no
            texto+preço (abaixo) empurra o botão pra base do bloco quando as
            colunas ficam com a MESMA altura (items-stretch no grid, ver
            componente principal) — pedido explícito: "botões alinhados na
            base do bloco superior". */}
        <div className="flex flex-1 flex-col">
          {/* justify-between (não `absolute`, ver comentário do componente
              acima): nome flexível à esquerda, badge "Popular" fixo à
              direita — nunca se sobrepõem, o nome só quebra em 2 linhas se
              precisar de mais espaço. items-start: o badge fica alinhado
              com a PRIMEIRA linha do nome, mesmo se ele quebrar. */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{plano.nome}</h3>
            {plano.popular && (
              <span className="mt-0.5 shrink-0 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">Popular</span>
            )}
          </div>

          {/* Preço — "R$" menor, número grande em negrito com tabular-nums
              (nunca "dança" de largura por causa da fonte variável), "acesso
              vitalício" ao lado (pedido explícito: no lugar do "/mês" de
              uma referência visual). Sem preço riscado/desconto/parcelamento
              — nenhuma dessas informações existe ainda. */}
          <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xl font-bold text-gray-900 dark:text-white">R$</span>
            <span className="text-4xl font-bold tabular-nums text-gray-900 dark:text-white sm:text-5xl">{plano.preco}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">acesso vitalício</span>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{plano.descricao}</p>

          <Link href={plano.href} className={cn(BOTAO_PRIMARIO_TAMANHO, 'mt-6 w-full')}>
            Quero este plano
          </Link>
        </div>

        {/* Divisória + "O que está incluso" */}
        <div className="mt-8 border-t border-black/10 pt-6 dark:border-white/10">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">O que está incluso</p>
          <ul className="mt-4 space-y-3">
            {plano.inclui.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-gray-500 dark:text-gray-400">
                <Check size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" strokeWidth={2.5} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Seção "Planos" (id="planos") — cabeçalho padrão (SectionHeader) + 3
 * cards lado a lado a partir de lg, empilhados (1 coluna, centralizados,
 * max-w-md) abaixo disso — na MESMA ordem 1/2/3 em qualquer largura (nunca
 * reordena o card em destaque pro topo no mobile, pedido explícito: "no
 * mobile o card do meio mantém o destaque" — só visual, a ordem no DOM não
 * muda).
 *
 * Entrada dos cards: AOS `fade-up` em cascata (pedido explícito de uma
 * tarefa posterior: "use a biblioteca AOS... para blocos" — substituiu o
 * fade/translateY escrito à mão que existia aqui antes, via
 * IntersectionObserver próprio; o AOS já cobre exatamente o mesmo efeito,
 * sitewide, sem duplicar mecanismo). `data-aos` fica num WRAPPER por fora
 * de cada `CardPlano` (nunca no cartão em si — pedido explícito: "cada um
 * dentro de um wrapper, por causa do hover do card do meio" — TODOS os 3
 * cards têm hover próprio agora, ver PLAN_CARD/PLAN_CARD_PADRAO/
 * PLAN_CARD_POPULAR acima; AOS escrevendo transform no MESMO elemento que
 * já tem `transform` de hover brigaria com ele).
 */
export default function PlanosSection() {
  return (
    <Container className="py-16 md:py-24">
      <SectionHeader
        eyebrow="Escolha o seu [[plano]]"
        title={'Escolha o [[plano]]\nideal para você'}
        description="Comece por um curso, por um nicho ou pela plataforma inteira. Todos os planos têm acesso vitalício."
        align="center"
        actions={{ primary: { label: 'Ficou com dúvidas?', href: '#perguntas-frequentes' } }}
      />

      <div className="mt-12 grid grid-cols-1 items-stretch justify-items-center gap-6 sm:mt-16 lg:grid-cols-3 lg:justify-items-stretch lg:gap-8">
        {PLANOS.map((plano, i) => (
          <div key={plano.nome} data-aos="fade-up" data-aos-delay={i * 100} className="w-full max-w-md lg:max-w-none">
            <CardPlano plano={plano} />
          </div>
        ))}
      </div>
    </Container>
  );
}
