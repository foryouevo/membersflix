'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlaySquare, MessageCircle, User as UserIcon, type LucideIcon } from 'lucide-react';
import { cn, buildSupportWhatsappLink } from '@/lib/utils';

/**
 * Bottom nav flutuante mobile — antes vivia dentro de MembrosSidebar.tsx
 * (junto da sidebar lateral de desktop, que existia como um `<aside>`
 * colapsável no mesmo componente); a sidebar saiu de vez (substituída pelo
 * Header, o menu horizontal fixo no topo — ver app/membros/layout.tsx),
 * então este arquivo agora só tem o que sempre foi mobile-only:
 * Início/Meus Cursos/Suporte/Meu Perfil, `md:hidden`. Buscar saiu daqui
 * (removida por pedido explícito) — já existe a lupa do Header, comum às
 * duas larguras (Header.tsx), então esse ícone virou redundante.
 *
 * `oculto` (controlado pelo pai — MembrosChrome.tsx, que também controla o
 * Header): true enquanto o bottom sheet de filtro mobile está aberto —
 * some com uma transição (opacity + desliza pra baixo), não com
 * `hidden`/desmonte, senão não teria como animar a saída nem a volta. Sem
 * isso, o menu ficava por cima do bottom sheet (bug relatado — os dois são
 * `position:fixed`, e o Header, que contém o FiltroModal, cria um stacking
 * context próprio por ser fixed+z-index; só subir o z-index do FiltroModal
 * não bastava, porque a comparação com este componente acontece no nível
 * do Header como um todo, não por dentro dele — ver o comentário completo
 * em MembrosChrome.tsx).
 */
export default function BottomNav({ numeroWhatsapp, oculto = false }: { numeroWhatsapp: string | null; oculto?: boolean }) {
  const pathname = usePathname();
  const suporteLink = numeroWhatsapp ? buildSupportWhatsappLink(numeroWhatsapp) : null;

  // Inativo: só o ícone, quadrado (w-11 h-11), branco, fundo transparente
  // (hover cinza sutil). Ativo: vira uma pílula que engloba ícone + rótulo
  // (ItemConteudo, abaixo) — fundo vermelho translúcido (bg-primary/15) +
  // texto/ícone vermelhos (text-primary), largura cresce pro conteúdo
  // (sem w- fixo: pl-3/pr-3.5 + o que o ícone/rótulo precisarem).
  // overflow-hidden aqui é reforço (o rótulo já se clipa sozinho, ver
  // ItemConteudo) — não deixa nada vazar da pílula durante a transição.
  // transition-colors (não mais transition-all): a largura agora nasce do
  // conteúdo (rótulo entrando/saindo via max-width, dentro de ItemConteudo
  // — ver o comentário lá sobre por que não é mais grid-template-columns)
  // e anima por conta própria — só cor de fundo/texto precisam de
  // transição aqui.
  function itemClasses(active: boolean) {
    return cn(
      'flex h-11 shrink-0 items-center overflow-hidden rounded-full transition-colors',
      active ? 'bg-primary/15 pl-3 pr-3.5 text-primary' : 'w-11 justify-center text-white hover:bg-surface-container'
    );
  }

  // `fixed` escapa do `overflow-hidden`/h-screen do layout normalmente (não
  // há nenhum ancestral com transform criando um novo containing block),
  // então posiciona relativo à viewport mesmo estando dentro da árvore do
  // layout. `left-1/2 w-fit -translate-x-1/2` (em vez de `inset-x-4`, que
  // esticava de ponta a ponta): a barra encolhe pro conteúdo (4 itens +
  // gap) e fica centralizada — também acompanha sozinha quando o item ativo
  // alarga com o rótulo (itemClasses/ItemConteudo), sem sobrar vão nas
  // pontas. rounded-full: cápsula fechada nas pontas. max-w-[calc(100vw-2rem)]
  // é a trava extra pedida (item 1/4 do pedido — bug relatado): garante que
  // o container NUNCA fique mais largo que a tela, então nenhum item some
  // atrás da borda por falta de espaço, com 1rem de respiro de cada lado
  // mesmo no pior caso teórico (não deveria nem chegar perto disso, com só
  // 4 itens + 1 rótulo expandido). gap-2.5 (era gap-3): reduzido um pouco
  // pra sobrar mais folga, junto com a troca do rótulo pra max-width (ver
  // ItemConteudo) — a causa raiz do bug em si.
  //
  // `oculto`: desliza pra baixo (translate-y-24, some atrás da borda
  // inferior da tela) + fade (opacity-0) + pointer-events-none (não
  // intercepta toque enquanto "invisível", mesmo ainda existindo no DOM).
  // -translate-x-1/2 continua presente nos dois estados (Tailwind combina
  // translate-x/translate-y num único `transform`, não um substitui o
  // outro) — sem isso a barra perderia a centralização horizontal ao
  // esconder. transition-[transform,opacity] com a MESMA duração/easing do
  // resto do painel de filtro (300ms/ease-out — ver FiltroModal.tsx), pra
  // sumir/voltar no mesmo ritmo do bottom sheet, sem parecer dessincronizado.
  return (
    <nav
      aria-label="Navegação"
      className={cn(
        'fixed bottom-4 left-1/2 z-40 flex w-fit max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2.5 overflow-hidden rounded-full border border-border/60 bg-surface-lowest/95 px-2 py-2 shadow-overlay backdrop-blur-sm transition-[transform,opacity] duration-300 ease-out sm:px-5 md:hidden',
        oculto ? 'translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      )}
    >
      <Link href="/membros/vitrine" title="Início" className={itemClasses(pathname.startsWith('/membros/vitrine'))}>
        <ItemConteudo active={pathname.startsWith('/membros/vitrine')} icon={Home} label="Início" />
      </Link>
      <Link
        href="/membros/meus-cursos"
        title="Meus Cursos"
        className={itemClasses(pathname.startsWith('/membros/meus-cursos'))}
      >
        <ItemConteudo active={pathname.startsWith('/membros/meus-cursos')} icon={PlaySquare} label="Meus Cursos" />
      </Link>
      {suporteLink ? (
        <a href={suporteLink} target="_blank" rel="noopener noreferrer" title="Suporte" className={itemClasses(false)}>
          <ItemConteudo active={false} icon={MessageCircle} label="Suporte" />
        </a>
      ) : (
        <span
          title="Número de suporte não configurado pelo admin"
          className="flex h-11 w-11 cursor-not-allowed items-center justify-center rounded-full text-white/40"
        >
          <MessageCircle size={20} />
        </span>
      )}
      {/* Meu Perfil por último de propósito — ordem final: Início, Meus
          Cursos, Suporte, Meu Perfil. */}
      <Link href="/membros/perfil" title="Meu Perfil" className={itemClasses(pathname.startsWith('/membros/perfil'))}>
        <ItemConteudo active={pathname.startsWith('/membros/perfil')} icon={UserIcon} label="Meu Perfil" />
      </Link>
    </nav>
  );
}

/**
 * Ícone + rótulo de um item do BottomNav — extraído porque os 4 itens
 * (+ o Suporte desabilitado, que não usa isso) repetem a mesma estrutura.
 *
 * O rótulo anima via `max-width` (0 -> 7rem), não `grid-template-columns`
 * (era assim antes — trocado pra corrigir o bug relatado: o item ativo
 * "saindo" da pílula/barra de fundo). Causa raiz: o `<nav>` pai precisa se
 * dimensionar pelo próprio conteúdo (`w-fit`), e um filho com
 * `grid-template-columns: 1fr` sem nenhuma largura definida acima dele cai
 * num caso ambíguo de dimensionamento intrínseco em CSS — o texto chega a
 * renderizar, mas o `<nav>`/a pílula nem sempre recalculam a própria
 * largura pra acomodar esse `1fr` corretamente (varia entre navegadores).
 * `max-width` não tem essa ambiguidade: é sempre um valor definido, então
 * o `<nav>` sempre sabe exatamente quanto espaço reservar.
 *
 * 7rem (112px) é generoso o bastante pro maior rótulo ("Meus Cursos") —
 * como `max-width` só limita um teto (não força a caixa a ocupar todo esse
 * espaço), rótulos mais curtos ("Início") ficam do próprio tamanho, sem
 * sobrar vão. `overflow-hidden` + `whitespace-nowrap` garantem que o texto
 * fica cortado/numa linha só enquanto a animação não terminou, em vez de
 * vazar ou quebrar; `min-w-0` porque este span é item de um pai `flex`
 * (Link, em itemClasses) — sem isso ele não encolhe abaixo do próprio
 * conteúdo no estado fechado.
 */
function ItemConteudo({ active, icon: Icon, label }: { active: boolean; icon: LucideIcon; label: string }) {
  return (
    <>
      <Icon size={20} className="shrink-0" />
      <span
        className={cn(
          'min-w-0 overflow-hidden whitespace-nowrap pl-0 text-sm font-semibold transition-[max-width,padding-left] duration-300 ease-out',
          active ? 'max-w-[7rem] pl-[0.4rem]' : 'max-w-0'
        )}
      >
        {label}
      </span>
    </>
  );
}
