'use client';

import { Children, cloneElement, createElement, isValidElement, useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Acima disso, o stagger cai pro valor de STAGGER_TEXTO_LONGO (pedido
// explícito: "textos com mais de ~25 palavras... o efeito não passar de
// ~1,2s").
const LIMIAR_TEXTO_LONGO = 25;
const STAGGER_TEXTO_LONGO_MS = 20;

/**
 * Percorre `children` recursivamente e divide cada string em palavras,
 * cada uma virando `<span class="wr-word" style={{ '--i': n }}>palavra</span>`
 * — o espaço entre elas continua como texto normal (não vira span nenhum),
 * pra quebra de linha natural do navegador continuar funcionando. Elementos
 * (`<span className="text-primary">curso</span>`, `<strong>`, etc.) são
 * clonados com os PRÓPRIOS filhos processados recursivamente (a cor/peso
 * deles nunca se perde) — só `<br />` é preservado tal e qual, sem entrar
 * na recursão (não tem filho de texto pra dividir). `contador` é um objeto
 * mutável (não state) — o MESMO objeto atravessa toda a árvore, pra `--i`
 * ficar contínuo do início ao fim do texto inteiro, não reiniciar a cada
 * elemento aninhado. Sem dangerouslySetInnerHTML em nenhum momento.
 */
function processarNode(node: ReactNode, contador: { i: number }): ReactNode {
  if (node === null || node === undefined || typeof node === 'boolean') return node;

  if (typeof node === 'string' || typeof node === 'number') {
    const texto = String(node);
    // Captura os espaços como itens próprios do array (grupo entre
    // parênteses no split) — cada um deles passa direto como texto puro.
    const partes = texto.split(/(\s+)/);
    return partes.map((parte, idx) => {
      if (parte === '') return null;
      if (/^\s+$/.test(parte)) return parte;
      const i = contador.i++;
      return (
        <span key={`w${idx}`} className="wr-word" style={{ '--i': i } as React.CSSProperties}>
          {parte}
        </span>
      );
    });
  }

  if (Array.isArray(node)) {
    return node.map((filho, idx) => <span key={idx} style={{ display: 'contents' }}>{processarNode(filho, contador)}</span>);
  }

  if (isValidElement(node)) {
    if (node.type === 'br') return node;
    const props = node.props as { children?: ReactNode };
    const filhosProcessados = processarChildren(props.children, contador);
    return cloneElement(node as ReactElement<{ children?: ReactNode }>, undefined, filhosProcessados);
  }

  return node;
}

function processarChildren(children: ReactNode, contador: { i: number }): ReactNode {
  return Children.map(children, (filho) => processarNode(filho, contador));
}

// Conta quantas palavras `processarNode` vai gerar, sem criar nenhum JSX —
// usada só pra decidir o stagger (texto longo, ver LIMIAR_TEXTO_LONGO)
// ANTES de processar de verdade.
function contarPalavras(node: ReactNode): number {
  if (node === null || node === undefined || typeof node === 'boolean') return 0;
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node).split(/\s+/).filter(Boolean).length;
  }
  if (Array.isArray(node)) return node.reduce((soma: number, filho) => soma + contarPalavras(filho), 0);
  if (isValidElement(node)) {
    if (node.type === 'br') return 0;
    return contarPalavras((node.props as { children?: ReactNode }).children);
  }
  return 0;
}

type Props = {
  as?: 'h1' | 'h2' | 'p' | 'span';
  className?: string;
  delay?: number;
  stagger?: number;
  immediate?: boolean;
  children: ReactNode;
};

/**
 * Revela um título/parágrafo palavra por palavra (pedido explícito desta
 * tarefa — item (b): "cada palavra saindo de um cinza apagado para a cor
 * final, subindo um pouco e com um leve desfoque que some"). Sem lib
 * nenhuma — só CSS (`.wr-word`/`.wr.is-in`, ver app/globals.css) + uma
 * classe (`is-in`) adicionada no elemento raiz quando a hora chega.
 *
 * Ativação: por padrão, um IntersectionObserver (threshold 0.2, rootMargin
 * "0px 0px -10% 0px", pedido explícito) dispara UMA vez ao rolar até o
 * elemento. `immediate` pula a rolagem inteira — usado no hero
 * (HeroSection.tsx), que dispara sozinho ao carregar a página (pedido
 * explícito) — e adiciona a classe logo depois do mount, com DOIS
 * requestAnimationFrame encadeados (garante que o navegador já pintou o
 * estado INICIAL — opacity .12/blur — antes da classe `is-in` entrar,
 * senão a transição CSS não teria um "de" pra sair, e a palavra apareceria
 * direto no estado final sem animar).
 *
 * `--wr-stagger`/`--wr-delay` (lidas pelo CSS, ver app/globals.css) vêm
 * daqui via `style` inline no elemento raiz — nunca hardcoded no CSS.
 * Textos longos (mais de ~25 palavras): o `stagger` pedido é ignorado e
 * cai pra STAGGER_TEXTO_LONGO_MS, pra um parágrafo de 40 palavras não levar
 * quase 2s só pra "terminar de nascer".
 */
export default function WordReveal({ as = 'p', className, delay = 0, stagger = 45, immediate = false, children }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [emVista, setEmVista] = useState(false);

  useEffect(() => {
    if (immediate) {
      let quadro1 = 0;
      let quadro2 = 0;
      quadro1 = requestAnimationFrame(() => {
        quadro2 = requestAnimationFrame(() => setEmVista(true));
      });
      return () => {
        cancelAnimationFrame(quadro1);
        if (quadro2) cancelAnimationFrame(quadro2);
      };
    }

    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEmVista(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [immediate]);

  const contador = { i: 0 };
  const totalPalavras = contarPalavras(children);
  const staggerEfetivo = totalPalavras > LIMIAR_TEXTO_LONGO ? Math.min(stagger, STAGGER_TEXTO_LONGO_MS) : stagger;
  const conteudo = processarChildren(children, contador);

  return createElement(
    as,
    {
      ref,
      className: cn('wr', emVista && 'is-in', className),
      style: { '--wr-stagger': `${staggerEfetivo}ms`, '--wr-delay': `${delay}ms` } as React.CSSProperties,
    },
    conteudo
  );
}
