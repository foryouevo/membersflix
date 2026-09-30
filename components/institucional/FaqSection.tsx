'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import SectionHeader, { comDestaque } from '@/components/institucional/SectionHeader';

/**
 * Perguntas e respostas — array só pra editar aqui (pedido explícito). Só
 * as informações passadas nesta/em tarefas anteriores: NENHUM prazo/
 * condição inventados. `[[trecho]]` tanto em `pergunta` quanto em
 * `resposta` vira destaque (mesmo `comDestaque` de SectionHeader.tsx,
 * reaproveitado pros dois — não uma marcação nova): nas perguntas, as
 * palavras-chave pedidas nesta tarefa ("testar", "antes de comprar",
 * "vitalícios", "formas de pagamento", "reembolso", "MembersFlix"); na
 * resposta da 1ª pergunta, "criar sua conta grátis" (já existia).
 *
 * Perguntas 03 e 04 ganharam a resposta de verdade nesta tarefa (formas de
 * pagamento/regra de reembolso) — os placeholders "[PREENCHER: ...]" e os
 * comentários // TODO que existiam aqui saíram, sem acrescentar nenhuma
 * informação além do texto exato passado (nenhum prazo/parcelamento).
 */
const FAQ: { pergunta: string; resposta: string }[] = [
  {
    pergunta: 'Posso [[testar]] a plataforma [[antes de comprar]]?',
    resposta:
      'Sim. Você pode [[criar sua conta grátis]] e assistir à primeira aula do curso que escolher. Se gostar de verdade, é só comprar e ter acesso completo ao curso. Ao criar a conta, você tem 30 minutos de acesso liberado para conferir a primeira aula.',
  },
  {
    pergunta: 'Os planos são [[vitalícios]]?',
    resposta: 'Sim. Todos os planos da MembersFlix têm acesso vitalício ao conteúdo do plano que você escolher.',
  },
  {
    pergunta: 'Quais são as [[formas de pagamento]]?',
    resposta: 'Aceitamos Pix e cartão de crédito.',
  },
  {
    pergunta: 'Como funciona a regra de [[reembolso]]?',
    resposta:
      'Não há reembolso. Por isso, você tem 30 minutos de acesso liberado antes de comprar, para conferir a primeira aula e ter certeza de que realmente quer adquirir o curso.',
  },
  {
    pergunta: 'O que é a [[MembersFlix]]?',
    resposta:
      'A MembersFlix é uma plataforma de cursos gravados, com +99 cursos e +1000 aulas em 13 nichos. As aulas são organizadas por módulo e você estuda no seu ritmo, de onde estiver.',
  },
];

/**
 * Um item do acordeão — número "01" em vermelho (bem maior, pedido
 * explícito desta tarefa — "text-xl md:text-2xl", tabular-nums + min-w pra
 * TODOS os números ocuparem a MESMA largura, então toda pergunta começa
 * alinhada na mesma posição, independente do número ter 1 ou 2 dígitos —
 * nunca acontece aqui, mas a técnica fica correta de qualquer forma);
 * pergunta fina e cinza (font-normal — 300 NÃO existe no Poppins carregado
 * em app/layout.tsx, `weight: ['400','500','600','700']`, então usar 400 em
 * vez de inventar um peso novo, pedido explícito), com as palavras-chave
 * (`[[marcadas]]` no array FAQ, acima) em destaque forte/branco
 * (font-medium + text-gray-900 dark:text-white — a MESMA cor "forte" do
 * tema que título/eyebrow já usam, contrasta nos dois temas); botão
 * circular decorativo com ChevronDown que gira 180° quando aberto.
 *
 * A LINHA inteira é o `<button>` real (pedido explícito: "clicar em
 * qualquer parte da linha abre/fecha") — por isso o círculo com a seta é um
 * `<span>` decorativo (aria-hidden), nunca um `<button>` aninhado dentro de
 * outro `<button>` (HTML inválido). Altura animada via grid-template-rows
 * 0fr->1fr (MESMA técnica já usada no acordeão de PlataformaSection.tsx) —
 * nunca depende de medir altura em JS.
 */
function ItemFaq({ item, indice, aberto, reduzido, onToggle }: { item: (typeof FAQ)[number]; indice: number; aberto: boolean; reduzido: boolean; onToggle: () => void }) {
  const idPergunta = `faq-pergunta-${indice}`;
  const idResposta = `faq-resposta-${indice}`;

  return (
    <div className={cn('border-t border-black/10 dark:border-white/10', indice === FAQ.length - 1 && 'border-b')}>
      <button
        type="button"
        id={idPergunta}
        aria-expanded={aberto}
        aria-controls={idResposta}
        onClick={onToggle}
        className="flex w-full items-center gap-3 rounded-lg py-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:gap-5"
      >
        <span className="min-w-[1.4em] shrink-0 text-xl font-semibold tabular-nums text-primary md:text-2xl">{String(indice + 1).padStart(2, '0')}</span>
        {/* text-[0.9rem] no mobile (pedido explícito, abaixo do md/768 —
            MESMO breakpoint que o resto do site usa), md:text-lg restaura o
            tamanho de sempre a partir dali (era text-base/sm:text-lg — o
            texto entre sm/640 e md/768 agora fica no tamanho mobile
            também, mesmo padrão já usado na descrição do SectionHeader). */}
        <span className="flex-1 text-[0.9rem] font-normal text-gray-500 dark:text-gray-400 md:text-lg">
          {comDestaque(item.pergunta, 'font-medium text-gray-900 dark:text-white')}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 transition-transform duration-300 dark:border-white/20',
            aberto && 'rotate-180'
          )}
        >
          <ChevronDown size={18} className="text-gray-600 dark:text-gray-300" />
        </span>
      </button>

      <div
        id={idResposta}
        role="region"
        aria-labelledby={idPergunta}
        className={cn('grid', !reduzido && 'transition-[grid-template-rows] duration-300 ease-in-out')}
        style={{ gridTemplateRows: aberto ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          {/* text-sm (0.875rem, pedido explícito — era 0.9rem/md:text-lg,
              visivelmente maior que a pergunta antes; agora fica menor que
              ela em qualquer largura, como pedido). pr-0 no mobile (pedido
              explícito de uma tarefa posterior — o padding-right de 3rem/
              3.5rem estreitava demais o texto numa coluna já estreita;
              abaixo do md/768 o texto agora usa a largura toda do
              container, que já tem a margem lateral padrão do site via
              Container.tsx — nunca cola na borda). md:pr-14 restaura o
              respiro de sempre pro botão circular a partir do md (era
              pr-12 base/sm:pr-14 — o efetivo a partir de 768px sempre foi
              pr-14, já que sm/640 vem antes de md/768). */}
          <p className="pb-5 pr-0 text-sm leading-relaxed text-gray-500 dark:text-gray-400 md:pr-14">
            {comDestaque(item.resposta, 'font-semibold text-gray-900 dark:text-white')}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Seção "Perguntas frequentes" (id="perguntas-frequentes") — 2 colunas a
 * partir de lg (esquerda: cabeçalho padrão + botão sticky; direita:
 * acordeão), 1 coluna empilhada abaixo disso (sem sticky — pedido
 * explícito). Só 1 item aberto por vez, o primeiro vem aberto (pedido
 * explícito).
 *
 * `destinoLogado`: repassado pro botão único da coluna esquerda
 * ("Criar minha conta grátis"/"Ir para a plataforma", MESMA regra de
 * sempre) — opcional (undefined/null = deslogado), pra este componente
 * poder ser usado mesmo sem essa prop, se um dia precisar.
 */
export default function FaqSection({ destinoLogado = null }: { destinoLogado?: string | null }) {
  const [aberto, setAberto] = useState(0);
  const [reduzido, setReduzido] = useState(false);

  useEffect(() => {
    setReduzido(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  return (
    <div className="grid grid-cols-1 gap-y-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-x-16">
      {/* COLUNA ESQUERDA — sticky no desktop (MESMO mecanismo/offset do
          header fixo já usado em PlataformaSection.tsx: top = altura do
          header + uma margem pequena). overflow-clip em vez de
          overflow-hidden se algum ancestral precisar recortar cantos —
          aqui não precisa de nenhum, mas o comentário fica pra quem for
          mexer depois não quebrar o sticky sem querer. */}
      <div className="lg:sticky" style={{ top: 'calc(var(--header-h) + 32px)' }}>
        <SectionHeader
          eyebrow="Tire suas [[dúvidas]]"
          title="Perguntas [[frequentes]]"
          description="Tudo o que você precisa saber antes de começar na MembersFlix."
          align="left"
          actions={{ primary: destinoLogado ? { label: 'Ir para a plataforma', href: destinoLogado } : { label: 'Criar conta grátis', href: '/login?form=cadastro' } }}
        />
      </div>

      {/* COLUNA DIREITA — acordeão. divide-y não usado de propósito (cada
          item já desenha sua própria border-t/border-b, ver ItemFaq acima
          — evita duplicar a borda de cima do 1º item com a de baixo do
          último se um dia a ordem/composição mudar). */}
      <div>
        {FAQ.map((item, i) => (
          // Wrapper SÓ pro data-aos (pedido explícito: "em cascata, num
          // wrapper por fora da linha — o acordeão anima a ALTURA" via
          // grid-template-rows inline, ver ItemFaq acima; nunca no mesmo
          // elemento que já tem esse estilo controlado por JS/estado).
          <div key={item.pergunta} data-aos="fade-up" data-aos-delay={i * 50}>
            <ItemFaq item={item} indice={i} aberto={aberto === i} reduzido={reduzido} onToggle={() => setAberto((atual) => (atual === i ? -1 : i))} />
          </div>
        ))}
      </div>
    </div>
  );
}
