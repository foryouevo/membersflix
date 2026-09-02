'use client';

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type GrupoCategoria = { id: string; nome: string; ids: string[] };

// Duração da transição de entrada/saída do bottom sheet mobile (slide) —
// usada tanto na classe Tailwind (duration-300) quanto no timeout que
// atrasa o desmonte real (ver `montado` abaixo), pra ficarem sempre em
// sincronia num só lugar.
const TRANSICAO_MS = 300;

/**
 * Painel de filtro do Header (categoria/instrutor) — apresentação diferente
 * por breakpoint (pedido explícito): dropdown ancorado ao ícone no desktop
 * (`md:`, como sempre foi), bottom sheet full-width no mobile (sobe de
 * baixo, cantos superiores arredondados, alça no topo, overlay escuro atrás
 * — igual em espírito ao bottom sheet "Categorias" que existia no
 * VitrinePageClient antigo, removido). Mesmo componente, mesmo conteúdo,
 * mesma lógica de seleção/aplicação — só a apresentação muda via classes
 * `md:`, sem branch de JS nenhum.
 *
 * Estilo das opções (linha inteira clicável, arredondada, ativa em
 * bg-primary/15 + text-primary, ícone de check à direita) é o mesmo em
 * qualquer largura, não muda com o resto.
 *
 * Sem portal: `fixed`/`absolute` escapam do overflow-hidden do layout sem
 * precisar disso (nenhum ancestral tem transform), então renderizar como
 * filho direto do wrapper `relative` do botão de filtro (Header.tsx) já
 * basta — mesma solução de antes. Quem posiciona é este componente (via
 * classes `md:` alternando dropdown/sheet); quem fecha ao clicar fora/ESC
 * continua sendo o pai (Header — mesmo ref por cima de botão+painel usado
 * no menu de perfil ali), e agora TAMBÉM o clique no overlay escuro
 * (só mobile, com onClose próprio) e o X interno.
 *
 * Animação de abrir/fechar (mobile, item explícito): a classe que
 * translada o painel (`translate-y-0`/`translate-y-full`) segue `open`
 * direto, mas o componente só é desmontado (`return null`) um pouco DEPOIS
 * de `open` virar false — ver `montado`/TRANSICAO_MS abaixo —, senão o
 * React tiraria o painel do DOM na hora e a transição de saída nunca
 * chegaria a rodar. Isso não afeta o desktop (dropdown some na hora, sem
 * transição — `md:transition-none`, `md:hidden` quando fechado).
 *
 * A seleção fica "em rascunho" (estado local, iniciado a partir de
 * categoriaIdsAtivos/instrutorNomesAtivos toda vez que o painel abre) até o
 * aluno confirmar em "Aplicar" — só aí o pai de fato navega pra tela de
 * busca. Fechar sem aplicar (X, ESC, clique fora/overlay) descarta o
 * rascunho; a lógica de filtragem em si (URL -> BuscarPageClient) não muda
 * em nada, só quando ela dispara.
 *
 * Categoria é agrupada por nome (ver categoriasAgrupadas, tanto aqui quanto
 * em app/membros/layout.tsx/useCursoFiltro.ts) — a tabela `categorias` tem
 * linhas duplicadas (dado legado), então cada opção aqui representa um
 * grupo com `ids` (plural): selecionar o grupo marca/desmarca todas as
 * linhas daquele nome juntas.
 */
export default function FiltroModal({
  open,
  onClose,
  categorias,
  instrutores,
  categoriaIdsAtivos,
  instrutorNomesAtivos,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  categorias: GrupoCategoria[];
  instrutores: string[];
  categoriaIdsAtivos: string[];
  instrutorNomesAtivos: string[];
  onApply: (categoriaIds: string[], instrutorNomes: string[]) => void;
}) {
  const [categoriaIds, setCategoriaIds] = useState(categoriaIdsAtivos);
  const [instrutorNomes, setInstrutorNomes] = useState(instrutorNomesAtivos);

  // Reseta o rascunho toda vez que o modal abre, a partir do que já está
  // aplicado de verdade (props) — assim reabrir depois de um fechamento sem
  // aplicar não carrega uma seleção descartada.
  useEffect(() => {
    if (open) {
      setCategoriaIds(categoriaIdsAtivos);
      setInstrutorNomes(instrutorNomesAtivos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Dois estados pra dar tempo às duas transições (mobile — desktop nem
  // usa nenhum dos dois, dropdown aparece/some na hora com `open` direto):
  // `montado` controla se o componente renderiza ALGUMA coisa (fica true
  // um pouco DEPOIS de `open` virar false, só o tempo da transição de
  // saída — TRANSICAO_MS — senão o React tiraria o painel do DOM antes da
  // animação rodar); `visivel` controla a posição/opacidade do painel em
  // si, e só vira true 2 frames DEPOIS de `montado` (via
  // requestAnimationFrame duplo — Safari às vezes precisa de dois pra
  // garantir que o navegador já pintou o estado "fechado" antes de mudar
  // pro "aberto") — sem esse atraso, montar e já aplicar a classe "aberta"
  // no mesmo commit faria o painel aparecer direto na posição final, sem
  // nada pra transicionar A PARTIR de (a entrada não animaria).
  const [montado, setMontado] = useState(open);
  const [visivel, setVisivel] = useState(open);

  useEffect(() => {
    if (open) {
      setMontado(true);
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setVisivel(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
      };
    }
    setVisivel(false);
    const t = setTimeout(() => setMontado(false), TRANSICAO_MS);
    return () => clearTimeout(t);
  }, [open]);

  // Trava o scroll do body enquanto o bottom sheet mobile está aberto (item
  // explícito do pedido) — `open` (não `visivel`/`montado`): trava já no
  // clique que abre, sem esperar a animação. Sem `md:` aqui porque não
  // tem custo nenhum destravar de novo no desktop (overflow:hidden não
  // muda nada lá, o dropdown nunca precisou disso).
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!montado) return null;

  function toggleGrupoCategoria(ids: string[]) {
    setCategoriaIds((prev) => (ids.some((id) => prev.includes(id)) ? prev.filter((id) => !ids.includes(id)) : [...prev, ...ids]));
  }

  function toggleInstrutor(nome: string) {
    setInstrutorNomes((prev) => (prev.includes(nome) ? prev.filter((x) => x !== nome) : [...prev, nome]));
  }

  function handleLimpar() {
    setCategoriaIds([]);
    setInstrutorNomes([]);
  }

  function handleAplicar() {
    onApply(categoriaIds, instrutorNomes);
  }

  const opcaoBase = 'flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left text-sm transition-colors';
  const opcaoAtiva = 'bg-primary/15 font-medium text-primary';
  const opcaoInativa = 'text-white hover:bg-surface-container';

  return (
    <>
      {/* Overlay — só mobile (md:hidden incondicional: no desktop o
          dropdown nunca teve overlay nenhum). Fecha ao clicar nele
          (onClick próprio, além do listener de "clique fora" que o pai —
          Header.tsx — já mantém por cima de botão+painel). Fade
          acompanhando `visivel`, mesma duração da transição do painel.
          z-50: precisa ficar ACIMA do BottomNav (fixed, z-40 —
          components/membros/BottomNav.tsx) — z-40 aqui empatava com ele e,
          por ordem de DOM (BottomNav é renderizado depois, como irmão de
          MembrosChrome em app/membros/layout.tsx), o menu flutuante
          vencia o empate e ficava por cima do overlay/sheet, cobrindo o
          footer "Limpar filtros"/"Aplicar" (bug relatado). */}
      <div
        onClick={onClose}
        aria-hidden
        className={cn(
          'fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 ease-out md:hidden',
          visivel ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      {/* Painel: bottom sheet full-width no mobile (fixed, ancorado embaixo,
          desliza — translate-y — a partir de `visivel`) / dropdown ancorado
          ao ícone no desktop (md:absolute, junto do botão que abre —
          right-0 = borda direita alinhada à dele, top-full mt-2 = 8px
          abaixo —, aparece/some na hora com `open` direto, sem transição:
          md:transition-none, md:hidden quando fechado). rounded-t-2xl
          (mobile, só os cantos de cima) / md:rounded-xl (mesmo raio do
          card de login, dropdown inteiro arredondado). max-h-[80vh]
          (mobile) / md:max-h-[85vh] (desktop, valor de sempre) + w-full
          (mobile, 100% da largura) / md:w-[340px] md:max-w-[calc(100vw-2rem)]
          (desktop, dentro da faixa 320-360px pedida, com trava extra pra
          não vazar da tela). z-50 (mobile, acima do próprio header E do
          BottomNav — este último é z-40, fixed, e ficava por cima do
          painel por empate+ordem de DOM antes desta correção; ver
          comentário do overlay acima) / md:z-30 (desktop, mesmo z-index
          dos outros dropdowns deste header — BottomNav é md:hidden, sem
          conflito nenhum nessa largura). bg-card sólido, sem transparência,
          nas duas larguras. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] w-full flex-col overflow-hidden rounded-t-2xl bg-card shadow-overlay transition-transform duration-300 ease-out',
          visivel ? 'translate-y-0' : 'translate-y-full pointer-events-none',
          !open && 'md:hidden',
          'md:absolute md:inset-x-auto md:inset-y-auto md:bottom-auto md:right-0 md:top-full md:z-30 md:mt-2 md:w-[340px] md:max-w-[calc(100vw-2rem)] md:max-h-[85vh] md:translate-y-0 md:rounded-xl md:pointer-events-auto md:transition-none'
        )}
      >
        {/* Alça — só mobile, centralizada no topo do sheet. */}
        <div className="flex shrink-0 justify-center pb-1 pt-2.5 md:hidden">
          <div className="h-1 w-10 rounded-full bg-white/25" />
        </div>

        {/* Header: título à esquerda, X à direita, divisória sutil abaixo. */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-base font-semibold text-white">Filtros</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-on-variant hover:text-white">
            <X size={20} />
          </button>
        </div>

      {/* Corpo: max-h-[60vh] + overflow-y-auto — scrollbar já é fina/escura
          globalmente (app/globals.css, ::-webkit-scrollbar), sem precisar
          de classe extra aqui. */}
      <div className="max-h-[60vh] flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <section>
          {/* Título de seção pequeno, cinza claro, caixa alta. */}
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-on-variant">Categoria</p>
          <div className="space-y-1">
            {categorias.length === 0 ? (
              <p className="px-4 py-2.5 text-sm text-on-variant">Nenhuma categoria cadastrada.</p>
            ) : (
              categorias.map((grupo) => {
                const ativo = grupo.ids.some((id) => categoriaIds.includes(id));
                return (
                  <button
                    key={grupo.id}
                    type="button"
                    onClick={() => toggleGrupoCategoria(grupo.ids)}
                    className={cn(opcaoBase, ativo ? opcaoAtiva : opcaoInativa)}
                  >
                    <span>{grupo.nome}</span>
                    {ativo && <Check size={16} className="shrink-0 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-on-variant">Instrutor</p>
          <div className="space-y-1">
            {instrutores.length === 0 ? (
              <p className="px-4 py-2.5 text-sm text-on-variant">Nenhum instrutor cadastrado.</p>
            ) : (
              instrutores.map((nome) => {
                const ativo = instrutorNomes.includes(nome);
                return (
                  <button
                    key={nome}
                    type="button"
                    onClick={() => toggleInstrutor(nome)}
                    className={cn(opcaoBase, ativo ? opcaoAtiva : opcaoInativa)}
                  >
                    <span>{nome}</span>
                    {ativo && <Check size={16} className="shrink-0 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Footer fixo: "Limpar filtros" (contorno) + "Aplicar" (vermelho,
          primary). Reaproveita .btn-secondary/.btn-primary já existentes
          (app/globals.css), mesmo padrão usado no resto da plataforma. */}
      <div className="flex shrink-0 items-center gap-3 border-t border-white/10 px-6 py-4">
        <button type="button" onClick={handleLimpar} className="btn-secondary flex-1">
          Limpar filtros
        </button>
        <button type="button" onClick={handleAplicar} className="btn-primary flex-1">
          Aplicar
        </button>
      </div>
      </div>
    </>
  );
}
