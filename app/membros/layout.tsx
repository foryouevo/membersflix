import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MembrosChrome from '@/components/membros/MembrosChrome';

export default async function MembrosLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: config }, { data: categorias }, { data: cursosAtivos }] = (await Promise.all([
    supabase.from('profiles').select('nome, email, avatar_url, tipo').eq('id', user.id).maybeSingle(),
    supabase.from('configuracoes').select('numero_whatsapp').eq('id', 1).maybeSingle(),
    // Categoria/instrutor pro painel de filtro do Header (busca global,
    // presente em toda página) — mesmas listas que useCursoFiltro deriva a
    // partir de `todosCursos` em cada página que já carrega isso (Home,
    // tela de busca), mas o header não tem um `todosCursos` próprio (não é
    // dono de nenhuma lista de cursos, só é um atalho pra tela de busca —
    // ver Header.tsx), então busca direto aqui.
    supabase.from('categorias').select('id, nome').order('nome'),
    supabase.from('cursos').select('instrutor_nome').eq('status', 'active'),
  ])) as [
    { data: { nome: string; email: string; avatar_url: string | null; tipo: string } | null },
    { data: { numero_whatsapp: string | null } | null },
    { data: { id: string; nome: string }[] | null },
    { data: { instrutor_nome: string | null }[] | null },
  ];

  if (!profile || profile.tipo !== 'aluno') redirect('/admin/dashboard');

  // Agrupada por nome (case/espaço-insensível), igual a `categoriasAgrupadas`
  // em hooks/useCursoFiltro.ts — a tabela `categorias` tem linhas duplicadas
  // (dado legado, ex: "Figma" cadastrado 3x com ids diferentes); sem esse
  // agrupamento, o painel de filtro do header listava a mesma categoria
  // repetida. `ids` guarda todas as linhas daquele nome, então selecionar o
  // grupo bate com curso vinculado a QUALQUER uma delas (ver FiltroModal).
  const categoriasAgrupadas = (() => {
    const porNome = new Map<string, { id: string; nome: string; ids: string[] }>();
    for (const cat of categorias ?? []) {
      const chave = cat.nome.trim().toLowerCase();
      const grupo = porNome.get(chave);
      if (grupo) grupo.ids.push(cat.id);
      else porNome.set(chave, { id: cat.id, nome: cat.nome.trim(), ids: [cat.id] });
    }
    return Array.from(porNome.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  })();

  const instrutores = Array.from(
    new Set((cursosAtivos ?? []).map((c) => c.instrutor_nome).filter((nome): nome is string => !!nome))
  ).sort((a, b) => a.localeCompare(b));

  return (
    // Sem bg-background: fundo (gradiente vermelho/preto) é só do <body>
    // agora (app/globals.css) — esse wrapper h-screen fica transparente, o
    // gradiente aparece atrás de <main> normalmente (que já não tem
    // background próprio) e continua "preso" à viewport mesmo com o scroll
    // interno do <main> (o body em si nunca rola, então
    // background-attachment: fixed não tem nem por que entrar em jogo aqui).
    <div className="h-screen overflow-hidden">
      {/* Header único, global, presente em toda página (fixed) + <main> +
          BottomNav — agrupados em MembrosChrome.tsx (Client Component)
          porque precisam compartilhar estado entre si (busca mobile
          empurrando o padding-top do <main>; bottom sheet de filtro mobile
          escondendo o BottomNav enquanto aberto — ver comentário completo
          em MembrosChrome.tsx) e são todos irmãos entre si aqui, sem
          ancestralidade que permitisse se comunicar sozinhos. layout.tsx é
          Server Component (não pode ter o useState que faz essa ponte),
          daí o wrapper. Home e detalhes do curso (hero de tela cheia)
          cancelam a folga padrão de <main> com -mt-14/md:-mt-20 no próprio
          wrapper do hero, pra imagem/gradiente "sangrarem" por trás do
          header (transparente no topo) e repõem a folga só no conteúdo de
          texto/card lá dentro (pt-14/md:pt-20), pra não ficar coberto.
          Páginas sem hero (busca, perfil, meus-cursos, categorias) não
          cancelam nada. */}
      <MembrosChrome
        profile={profile}
        numeroWhatsapp={config?.numero_whatsapp ?? null}
        categorias={categoriasAgrupadas}
        instrutores={instrutores}
      >
        {children}
      </MembrosChrome>
    </div>
  );
}
