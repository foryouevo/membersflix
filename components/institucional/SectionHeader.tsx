'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { cn, scrollSuaveParaSecao } from '@/lib/utils';
import CtaButtons, { BOTAO_PRIMARIO_CLASSES, BOTAO_SECUNDARIO_CLASSES } from '@/components/institucional/CtaButtons';

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

  return (
    <div className={cn('flex flex-col', centralizado ? 'items-center text-center' : 'items-start text-left')}>
      {/* Eyebrow — pequeno, SEM caixa alta (diferente do eyebrow
          "PLACEHOLDER" antigo, que era uppercase), cinza secundário com o
          trecho marcado em branco/semibold (cor de texto principal no
          light). */}
      <span className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
        {comDestaque(eyebrow, 'font-semibold text-gray-900 dark:text-white')}
      </span>

      <h2
        className={cn(
          'mt-3 text-3xl font-semibold leading-tight tracking-tight text-gray-900 dark:text-white sm:text-4xl lg:text-5xl',
          centralizado ? 'max-w-2xl' : 'max-w-[560px]'
        )}
      >
        {comDestaque(title, 'text-primary')}
      </h2>

      {description && (
        <p
          className={cn(
            'mt-4 text-base leading-relaxed text-gray-500 dark:text-gray-400 sm:text-lg',
            centralizado ? 'max-w-2xl' : 'max-w-[560px]'
          )}
        >
          {description}
        </p>
      )}

      {showActions &&
        (actions ? (
          <div className={cn('flex w-full flex-col items-center gap-3 md:w-auto md:flex-row', description ? 'mt-7 sm:mt-8' : 'mt-6', centralizado && 'md:justify-center')}>
            <BotaoAcao {...actions.primary} classes={BOTAO_PRIMARIO_CLASSES} />
            {actions.secondary && <BotaoAcao {...actions.secondary} classes={BOTAO_SECUNDARIO_CLASSES} />}
          </div>
        ) : (
          <CtaButtons destinoLogado={destinoLogado} className={cn(description ? 'mt-7 sm:mt-8' : 'mt-6', centralizado && 'md:justify-center')} />
        ))}
    </div>
  );
}
