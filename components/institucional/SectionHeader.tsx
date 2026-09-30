'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { cn, scrollSuaveParaSecao } from '@/lib/utils';
import CtaButtons, { BOTAO_PRIMARIO_TAMANHO, BOTAO_SECUNDARIO_CLASSES } from '@/components/institucional/CtaButtons';
import WordReveal from '@/components/institucional/WordReveal';

/**
 * Marca um trecho de `texto` entre `[[colchetes duplos]]` como destaque,
 * envolvendo em <span className={classeDestaque}> — usado tanto no
 * eyebrow (destaque branco/semibold) quanto no título (destaque vermelho
 * `primary`), pedido explícito ("marcar a palavra com [[ ]]"). O restante
 * do texto vira <Fragment> puro (sem <span> extra à toa).
 */
export function comDestaque(texto: string, classeDestaque: string) {
  return texto.split(/(\[\[[^\]]+\]\])/g).map((parte, i) => {
    const trecho = parte.match(/^\[\[([^\]]+)\]\]$/);
    if (trecho) {
      return (
        <span key={i} className={classeDestaque}>
          {trecho[1]}
        </span>
      );
    }
    return <Fragment key={i}>{parte}</Fragment>;
  });
}

type AcaoBotao = { label: string; href: string };

/**
 * Um botão de ação customizada (pedido explícito desta tarefa — antes só
 * existia o par fixo "Criar conta"/"Já tenho conta" via CtaButtons.tsx).
 * `href` começando com "#" vira uma âncora pra outra seção da MESMA
 * página — rola suave até lá via `scrollSuaveParaSecao` (lib/utils.ts,
 * MESMO mecanismo já usado pelos links do menu, LandingHeader.tsx —
 * "reutilize esse mecanismo, sem criar um novo"), em vez de navegar. Um
 * `href` normal (ex.: "/login") continua sendo link de verdade.
 */
function BotaoAcao({ label, href, classes }: AcaoBotao & { classes: string }) {
  const ancora = href.startsWith('#');
  return (
    <Link
      href={href}
      onClick={
        ancora
          ? (e) => {
              e.preventDefault();
              scrollSuaveParaSecao(href.slice(1));
            }
          : undefined
      }
      className={cn(classes, 'whitespace-nowrap')}
    >
      {label}
    </Link>
  );
}

/**
 * Cabeçalho de seção padrão do site (pedido explícito de uma tarefa
 * anterior: "todas as seções do site devem seguir este mesmo padrão de
 * cabeçalho") — 4 partes, nesta ordem: eyebrow (cinza + um trecho em
 * branco/destaque), título (branco + um trecho em vermelho, marcado com
 * `[[colchetes]]`), texto de apoio (cinza, opcional) e os botões de ação.
 *
 * `align`: "center" (padrão) centraliza tudo, com o texto de apoio
 * limitado a max-w-2xl; "left" alinha tudo à esquerda, com título/texto
 * limitados a ~560px (pra não esticar a linha demais quando a coluna ao
 * lado é mais estreita, ver NumerosSection.tsx).
 *
 * Ações (pedido explícito desta tarefa — antes SEMPRE renderizava o par
 * fixo "Criar conta grátis"/"Já tenho conta"): por padrão (`actions`
 * omitido), continua exatamente assim — CtaButtons.tsx, com
 * `destinoLogado` decidindo se vira "Ir para a plataforma". Passando
 * `actions` (ex.: `{ primary: { label: 'Saiba mais', href: '#plataforma' } }`),
 * troca pelos botões customizados: só o primário (vermelho), ou
 * primário + secundário (branco) se `actions.secondary` também vier.
 */
export default function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'center',
  showActions = true,
  destinoLogado = null,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'center' | 'left';
  showActions?: boolean;
  destinoLogado?: string | null;
  actions?: { primary: AcaoBotao; secondary?: AcaoBotao };
}) {
  const centralizado = align === 'center';
  // '\n' literal em `title` vira quebra de linha manual (ver o <h2>, abaixo)
  // — nunca dangerouslySetInnerHTML, só um split simples + <br /> entre os
  // pedaços, cada um passando pelo MESMO comDestaque (o destaque em
  // [[colchetes]] pode cair em qualquer linha).
  const linhasTitulo = title.split('\n');

  return (
    <div className={cn('flex flex-col', centralizado ? 'items-center text-center' : 'items-start text-left')}>
      {/* Eyebrow — pequeno, SEM caixa alta (diferente do eyebrow
          "PLACEHOLDER" antigo, que era uppercase), cinza secundário com o
          trecho marcado em branco/semibold (cor de texto principal no
          light). */}
      {/* Eyebrow/título/descrição — palavra por palavra ao rolar (pedido
          explícito desta tarefa, item (b)): `WordReveal` substitui o
          `<span>`/`<h2>`/`<p>` puro de antes, mas mantém a MESMA
          className/tag em cada um (`as`), então nada de tamanho/cor/layout
          muda — só a entrada. Delays crescentes 0/100/300 (pedido
          explícito) — cada um dispara no PRÓPRIO IntersectionObserver
          (rola até ONDE ele está, não onde a seção inteira está), então em
          seções altas o eyebrow pode revelar bem antes do título/descrição
          entrarem na tela — comportamento esperado, não um bug. */}
      <WordReveal as="span" delay={0} className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
        {comDestaque(eyebrow, 'font-semibold text-gray-900 dark:text-white')}
      </WordReveal>

      <WordReveal
        as="h2"
        delay={100}
        stagger={60}
        className={cn(
          'mt-3 text-3xl font-semibold leading-tight tracking-tight text-gray-900 dark:text-white sm:text-4xl lg:text-5xl',
          // `title` pode trazer um '\n' literal pra forçar uma quebra de
          // linha manual (pedido explícito — ex.: título da seção Cursos,
          // ver CursosSection.tsx). Quando isso acontece, `whitespace-nowrap`
          // substitui o max-w: a quebra já é a intenção, então nenhum
          // max-w/wrap automático pode criar uma 3ª linha indesejada.
          linhasTitulo.length > 1 ? 'whitespace-nowrap' : centralizado ? 'max-w-2xl' : 'max-w-[560px]'
        )}
      >
        {linhasTitulo.map((linha, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            {comDestaque(linha, 'text-primary')}
          </Fragment>
        ))}
      </WordReveal>

      {description && (
        <WordReveal
          as="p"
          delay={300}
          className={cn(
            // 0.9rem no mobile (pedido explícito, abaixo do md/768 — MESMO
            // breakpoint que o resto do site usa), md:text-lg restaura o
            // tamanho de sempre a partir dali (era sm:text-lg — o texto
            // entre sm/640 e md/768 agora fica no tamanho mobile também).
            'mt-4 text-[0.9rem] leading-relaxed text-gray-500 dark:text-gray-400 md:text-lg',
            centralizado ? 'max-w-2xl' : 'max-w-[560px]'
          )}
        >
          {description}
        </WordReveal>
      )}

      {showActions &&
        (actions ? (
          <div
            data-aos="fade-up"
            data-aos-delay={200}
            className={cn(
              'flex w-full flex-col gap-3 md:w-auto md:flex-row',
              // items-start quando align="left" (pedido explícito — o botão
              // de ação customizada, ex. "Saiba mais"/"Ver planos", ficava
              // esticado 100% de largura no mobile por causa do
              // BOTAO_PRIMARIO_CLASSES antigo (`w-full`); trocado por
              // BOTAO_PRIMARIO_TAMANHO abaixo, que não tem opinião de
              // largura — mas o pai aqui embaixo é flex-col, então sem um
              // items-* explícito o botão (inline-flex, largura de
              // conteúdo) ficaria alinhado à esquerda por padrão mesmo
              // assim; items-start deixa isso explícito e, no align=
              // "center", items-center centraliza o botão junto com o
              // resto do cabeçalho).
              centralizado ? 'items-center' : 'items-start',
              description ? 'mt-7 sm:mt-8' : 'mt-6',
              centralizado && 'md:justify-center'
            )}
          >
            <BotaoAcao {...actions.primary} classes={BOTAO_PRIMARIO_TAMANHO} />
            {actions.secondary && <BotaoAcao {...actions.secondary} classes={BOTAO_SECUNDARIO_CLASSES} />}
          </div>
        ) : (
          <div data-aos="fade-up" data-aos-delay={200} className={cn('w-full md:w-auto', centralizado && 'flex md:justify-center')}>
            <CtaButtons destinoLogado={destinoLogado} className={cn(description ? 'mt-7 sm:mt-8' : 'mt-6')} />
          </div>
        ))}
    </div>
  );
}
