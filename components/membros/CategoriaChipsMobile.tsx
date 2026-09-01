'use client';

import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

type GrupoCategoria = { nome: string; ordem: number; ids: string[] };

/**
 * Fileira de chips de categoria (estilo Netflix mobile), logo abaixo do
 * cabeçalho compacto "Início" na Home — só existe dentro do `md:hidden` de
 * quem chama (VitrinePageClient), então nunca aparece em desktop mesmo que
 * esse componente em si não tenha guarda própria de breakpoint.
 *
 * "Criação de Sites" e "Edição de Vídeos" são chips fixos (pedido
 * explícito) — só aparecem se a categoria de fato existir em
 * `categoriasAgrupadas` (não quebra se uma delas for removida/renomeada
 * depois pelo admin). "Categorias" abre um bottom sheet com TODAS as
 * categorias cadastradas, cada uma clicável — inclusive "Todos os cursos"
 * (limpa o filtro), já que não existe mais um chip solto "Todos" na fileira.
 *
 * Seleção é única (não soma): tocar num chip troca o filtro pro dele
 * (toggleGrupoCategoria, no hook, substitui em vez de somar); tocar de novo
 * no já ativo limpa (equivalente ao "Todos os cursos" do menu).
 */
export default function CategoriaChipsMobile({
  categoriasAgrupadas,
  categoriaFiltro,
  onToggleGrupo,
}: {
  categoriasAgrupadas: GrupoCategoria[];
  categoriaFiltro: string[];
  onToggleGrupo: (ids: string[]) => void;
}) {
  const [sheetAberto, setSheetAberto] = useState(false);

  function estaAtivo(ids: string[]) {
    return ids.some((id) => categoriaFiltro.includes(id));
  }

  const criacaoDeSites = categoriasAgrupadas.find((g) => g.nome.toLowerCase() === 'criação de sites');
  const edicaoDeVideos = categoriasAgrupadas.find((g) => g.nome.toLowerCase() === 'edição de vídeos');

  const chipBase = 'shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors';
  const chipInativo = 'bg-white/10 text-white/90 hover:bg-white/15';
  const chipAtivo = 'bg-primary text-white';

  function selecionar(ids: string[]) {
    onToggleGrupo(ids);
    setSheetAberto(false);
  }

  return (
    <>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
        {criacaoDeSites && (
          <button
            onClick={() => onToggleGrupo(criacaoDeSites.ids)}
            className={`${chipBase} ${estaAtivo(criacaoDeSites.ids) ? chipAtivo : chipInativo}`}
          >
            Criação de Sites
          </button>
        )}

        {edicaoDeVideos && (
          <button
            onClick={() => onToggleGrupo(edicaoDeVideos.ids)}
            className={`${chipBase} ${estaAtivo(edicaoDeVideos.ids) ? chipAtivo : chipInativo}`}
          >
            Edição de Vídeos
          </button>
        )}

        <button onClick={() => setSheetAberto(true)} className={`${chipBase} flex items-center gap-1 ${chipInativo}`}>
          Categorias <ChevronDown size={14} />
        </button>
      </div>

      {/* Bottom sheet — todas as categorias cadastradas (admin), não só as
          que já têm chip fixo acima. md:hidden aqui também é só reforço: o
          botão que abre isso já só existe dentro do md:hidden do chamador. */}
      {sheetAberto && (
        <div className="fixed inset-0 z-50 flex items-end md:hidden" role="dialog" aria-modal="true" aria-label="Filtrar por categoria">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSheetAberto(false)} />
          <div className="relative w-full rounded-t-2xl bg-surface-lowest p-4 pb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Categorias</h2>
              <button onClick={() => setSheetAberto(false)} aria-label="Fechar" className="text-on-variant hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-1 overflow-y-auto">
              <button
                onClick={() => selecionar([])}
                className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm ${
                  categoriaFiltro.length === 0 ? 'bg-primary/15 font-semibold text-primary' : 'text-white hover:bg-surface-container'
                }`}
              >
                Todos os cursos
              </button>
              {categoriasAgrupadas.map((grupo) => (
                <button
                  key={grupo.nome}
                  onClick={() => selecionar(grupo.ids)}
                  className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm ${
                    estaAtivo(grupo.ids) ? 'bg-primary/15 font-semibold text-primary' : 'text-white hover:bg-surface-container'
                  }`}
                >
                  {grupo.nome}
                </button>
              ))}
              {categoriasAgrupadas.length === 0 && <p className="px-3 py-2.5 text-sm text-on-variant">Nenhuma categoria cadastrada.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
