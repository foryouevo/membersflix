'use client';

import { useMemo, useState } from 'react';
import type { Categoria, Curso } from '@/types';

type GrupoCategoria = { id: string; nome: string; ordem: number; cursos: Curso[] };

// Busca por título + filtro por categoria/instrutor (seleção múltipla nos
// dois) + agrupamento por categoria — extraído de VitrinePageClient pra ser
// reaproveitado também na tela de busca dedicada (BuscarPageClient), que
// filtra o mesmo `todosCursos` só que sempre com a busca/filtro ativos (na
// Home eles só entram em jogo quando o usuário usa a busca flutuante sobre
// o banner, no desktop/tablet).
//
// `todasCategorias` (opcional): a tabela `categorias` crua, sem passar pelos
// cursos — diferente de `categoriasDisponiveis` (abaixo), que só enxerga
// categoria que já tem curso vinculado. É o que permite um chip de categoria
// aparecer mesmo com 0 cursos ainda (ex: "Idiomas", na fileira mobile da
// Home). Default `[]`: quem não passar (BuscarPageClient, por ex.) simplesmente
// não ganha `categoriasAgrupadas`/`toggleGrupoCategoria` populados — o resto
// do hook funciona igual.
export function useCursoFiltro(todosCursos: Curso[], todasCategorias: Categoria[] = []) {
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string[]>([]);
  const [instrutorFiltro, setInstrutorFiltro] = useState<string[]>([]);
  const filtroAtivo = busca.trim() !== '' || categoriaFiltro.length > 0 || instrutorFiltro.length > 0;

  function toggleCategoriaFiltro(id: string) {
    setCategoriaFiltro((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleInstrutorFiltro(nome: string) {
    setInstrutorFiltro((prev) => (prev.includes(nome) ? prev.filter((x) => x !== nome) : [...prev, nome]));
  }
  function limparFiltros() {
    setCategoriaFiltro([]);
    setInstrutorFiltro([]);
  }

  // Seleção ÚNICA por nome de categoria (não soma com o que já estava
  // marcado, ao contrário de toggleCategoriaFiltro acima) — pensado pra
  // fileira de chips da Home mobile: tocar num chip troca o filtro pro dele;
  // tocar de novo no chip já ativo limpa. `ids` (plural) porque duas linhas
  // da tabela `categorias` podem ter o mesmo nome (dado duplicado — ver
  // categoriasAgrupadas abaixo); tratamos como uma coisa só.
  function toggleGrupoCategoria(ids: string[]) {
    setCategoriaFiltro((prev) => (ids.some((id) => prev.includes(id)) ? [] : ids));
  }

  // Opções do painel de filtro: derivadas do todosCursos "cru" (não do já
  // filtrado) — assim escolher uma categoria não faz a lista de instrutores
  // encolher e vice-versa, o usuário sempre vê todas as combinações
  // possíveis, não só as que sobraram do filtro atual.
  const categoriasDisponiveis = useMemo(() => {
    const porId = new Map<string, { id: string; nome: string }>();
    for (const curso of todosCursos) {
      if (curso.categoria) porId.set(curso.categoria.id, { id: curso.categoria.id, nome: curso.categoria.nome });
    }
    return Array.from(porId.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [todosCursos]);

  // Igual a categoriasDisponiveis, mas a partir de `todasCategorias` (a
  // tabela crua) em vez dos cursos — inclui categoria sem curso nenhum
  // ainda. Agrupada por nome (case/espaço-insensível) pra não listar
  // duplicata visual quando existem 2+ linhas com o mesmo nome cadastradas
  // (dado legado) — `ids` guarda todas as linhas daquele nome, então filtrar
  // por esse grupo bate com qualquer curso vinculado a QUALQUER uma delas.
  const categoriasAgrupadas = useMemo(() => {
    const porNome = new Map<string, { nome: string; ordem: number; ids: string[] }>();
    for (const cat of todasCategorias) {
      const chave = cat.nome.trim().toLowerCase();
      const grupo = porNome.get(chave);
      if (grupo) {
        grupo.ids.push(cat.id);
        grupo.ordem = Math.min(grupo.ordem, cat.ordem);
      } else {
        porNome.set(chave, { nome: cat.nome.trim(), ordem: cat.ordem, ids: [cat.id] });
      }
    }
    return Array.from(porNome.values()).sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
  }, [todasCategorias]);

  const instrutoresDisponiveis = useMemo(() => {
    const nomes = new Set<string>();
    for (const curso of todosCursos) {
      if (curso.instrutor_nome) nomes.add(curso.instrutor_nome);
    }
    return Array.from(nomes).sort((a, b) => a.localeCompare(b));
  }, [todosCursos]);

  const todosCursosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return todosCursos.filter(
      (curso) =>
        (!termo || curso.titulo.toLowerCase().includes(termo)) &&
        // Sem categoria marcada: não filtra por categoria. Com uma ou mais
        // marcadas: passa se o curso for de QUALQUER UMA delas (OR dentro
        // do filtro). Mesma lógica pro instrutor. Os dois filtros (categoria
        // e instrutor) combinam entre si com AND — se ambos tiverem seleção,
        // o curso precisa bater nos dois.
        (categoriaFiltro.length === 0 || (!!curso.categoria && categoriaFiltro.includes(curso.categoria.id))) &&
        (instrutorFiltro.length === 0 || (!!curso.instrutor_nome && instrutorFiltro.includes(curso.instrutor_nome)))
    );
  }, [todosCursos, busca, categoriaFiltro, instrutorFiltro]);

  // "Todos os Cursos" agrupado por categoria: um swiper por categoria (na
  // ordem cadastrada em Categorias — categoria.ordem, igual ao admin), com
  // fallback "Outros" pro final da lista pra cursos sem categoria (não
  // some, mas também não teria como ordenar junto das categorias reais).
  // Categoria sem nenhum curso simplesmente não entra no Map, então nunca
  // é renderizada vazia — inclusive quando o filtro/busca zera uma
  // categoria inteira, ela some da listagem sozinha.
  const gruposPorCategoria = useMemo<GrupoCategoria[]>(() => {
    const porCategoria = new Map<string, GrupoCategoria>();
    const semCategoria: Curso[] = [];

    for (const curso of todosCursosFiltrados) {
      if (curso.categoria) {
        const grupo = porCategoria.get(curso.categoria.id) ?? {
          id: curso.categoria.id,
          nome: curso.categoria.nome,
          ordem: curso.categoria.ordem,
          cursos: [],
        };
        grupo.cursos.push(curso);
        porCategoria.set(curso.categoria.id, grupo);
      } else {
        semCategoria.push(curso);
      }
    }

    const grupos = Array.from(porCategoria.values()).sort((a, b) => a.ordem - b.ordem);
    // Chave fixa (não um uuid real) só pro React distinguir esse grupo dos
    // demais — cursos sem categoria não têm um id de categoria pra usar aqui.
    if (semCategoria.length > 0) grupos.push({ id: '__sem_categoria__', nome: 'Outros', ordem: Infinity, cursos: semCategoria });
    return grupos;
  }, [todosCursosFiltrados]);

  return {
    busca,
    setBusca,
    categoriaFiltro,
    toggleCategoriaFiltro,
    toggleGrupoCategoria,
    instrutorFiltro,
    toggleInstrutorFiltro,
    limparFiltros,
    filtroAtivo,
    categoriasDisponiveis,
    categoriasAgrupadas,
    instrutoresDisponiveis,
    todosCursosFiltrados,
    gruposPorCategoria,
  };
}
