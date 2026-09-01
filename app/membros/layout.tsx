import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BottomNav from '@/components/membros/BottomNav';
import MobileHeader from '@/components/membros/MobileHeader';
import DesktopHeader from '@/components/membros/DesktopHeader';

export default async function MembrosLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: config }, { data: categorias }, { data: cursosAtivos }] = await Promise.all([
    supabase.from('profiles').select('nome, email, avatar_url, tipo').eq('id', user.id).maybeSingle(),
    supabase.from('configuracoes').select('numero_whatsapp').eq('id', 1).maybeSingle(),
    // Categoria/instrutor pro painel de filtro do DesktopHeader (busca
    // global, presente em toda página) — mesmas listas que useCursoFiltro
    // deriva a partir de `todosCursos` em cada página que já carrega isso
    // (Home, tela de busca), mas o header não tem um `todosCursos` próprio
    // (não é dono de nenhuma lista de cursos, só é um atalho pra tela de
    // busca — ver DesktopHeader.tsx), então busca direto aqui.
    supabase.from('categorias').select('id, nome').order('ordem'),
    supabase.from('cursos').select('instrutor_nome').eq('status', 'active'),
  ]);

  if (!profile || profile.tipo !== 'aluno') redirect('/admin/dashboard');

  const instrutores = Array.from(
    new Set((cursosAtivos ?? []).map((c) => c.instrutor_nome).filter((nome): nome is string => !!nome))
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="h-screen overflow-hidden bg-background">
      {/* Header mobile global (logo/"Início" ou seta de voltar + avatar do
          usuário) — fixed, md:hidden. Decide sozinho por rota (usePathname)
          se mostra "Início" ou a seta, e se sequer aparece (self-exclui na
          página do player). */}
      <MobileHeader profile={profile} />
      {/* Header desktop/tablet — substitui a sidebar lateral que existia
          antes (removida de vez, MembrosSidebar.tsx). Barra horizontal
          fixa, estilo Netflix: logo + nav (Início/Meus Cursos/Meu
          Perfil/Suporte) + busca/filtro + avatar, hidden md:flex. Sem
          background (transparente), igual em espírito ao MobileHeader. */}
      <DesktopHeader
        profile={profile}
        numeroWhatsapp={config?.numero_whatsapp ?? null}
        categorias={categorias ?? []}
        instrutores={instrutores}
      />
      {/* pt-14/pb-24 no mobile: espaço pro header (56px) e pra bottom nav
          flutuante (fixed) não cobrirem o conteúdo. md:pt-20/md:pb-0: em
          telas md+ o bottom nav some (md:hidden nele) e quem ocupa o topo é
          o DesktopHeader — 64px de altura (h-16), daí o md:pt-20. Home e
          detalhes do curso (hero de tela cheia) cancelam essa folga com
          -mt-14/md:-mt-20 no próprio wrapper do hero, pra imagem/gradiente
          "sangrarem" por trás dos dois headers (os dois são transparentes
          — o desktop não fica mais sólido como antes) e repõem a folga só
          no conteúdo de texto/card lá dentro (pt-14/md:pt-20), pra não
          ficar coberto. Páginas sem hero (busca, perfil, meus-cursos,
          categorias) não cancelam nada — não têm imagem nenhuma pra
          sangrar atrás do header, então a folga padrão daqui já basta. */}
      <main className="h-full overflow-y-auto pb-24 pt-14 md:pb-0 md:pt-20">{children}</main>
      {/* Bottom nav flutuante — só mobile (md:hidden nela mesma). */}
      <BottomNav numeroWhatsapp={config?.numero_whatsapp ?? null} />
    </div>
  );
}
