import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import LandingPageClient from '@/components/institucional/LandingPageClient';

// "/" é a landing institucional pública, pra QUALQUER visitante — pedido
// explícito: sem redirecionamento automático nenhum, nem deslogado (era
// redirect('/login') direto) nem logado (era redirect pra /inicio ou
// /admin/dashboard, decidido pelo tipo do profile). O destino pós-login de
// verdade agora é responsabilidade de quem loga (LoginPageClient.tsx faz
// router.replace('/inicio') — essa rota resolve sozinha pra admin, ver
// comentário lá) e de MembrosLayoutShell.tsx (que barra acesso direto a
// /inicio/etc sem sessão) — não mais desta página.
//
// Só passamos pro header (via LandingPageClient -> LandingHeader) SE a
// pessoa já está logada e, se estiver, pra onde levar o botão "Ir para a
// plataforma" — mesma regra de sempre (admin -> /admin/dashboard, aluno ->
// /inicio), só que agora é uma sugestão de link, não mais um redirect
// forçado: a pessoa pode ficar na landing o quanto quiser mesmo logada.
export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let destinoLogado: string | null = null;
  if (user) {
    const { data: profile } = (await supabase.from('profiles').select('tipo').eq('id', user.id).maybeSingle()) as {
      data: { tipo: string } | null;
    };
    destinoLogado = profile?.tipo === 'admin' ? '/admin/dashboard' : '/inicio';
  }

  // BUG encontrado testando esta tarefa: tanto `configuracoes` quanto
  // `categorias` têm RLS "leitura só para autenticado" (ver
  // supabase/schema.sql — config_select/categorias_select, using
  // auth.role() = 'authenticated'). Isso nunca foi problema antes porque
  // toda leitura dessas tabelas sempre veio de dentro da área de membros
  // (usuário já logado) — mas "/" agora é pública, pra visitante
  // DESLOGADO também (ver comentário do componente, acima), e o client
  // comum (`supabase`, acima) respeita RLS como o usuário atual, então
  // pra quem não tem sessão as duas queries voltavam vazias/bloqueadas em
  // silêncio: o número de WhatsApp do botão de suporte flutuante nunca
  // carregava, e a coluna "Cursos" do rodapé sempre mostrava "Nenhuma
  // categoria cadastrada ainda." mesmo com 13 categorias reais no banco.
  // Corrigido usando o client ADMIN (service role, ignora RLS) só pra
  // essas duas leituras — mesmo padrão já usado em outros pontos do
  // projeto pra dado público exibido a visitante sem sessão (ex.:
  // lib/membros/curso-detalhe.ts, branch "sem acesso"). Nenhum dado
  // sensível: nome de categoria e número de WhatsApp de suporte já são
  // públicos em outros lugares do site (ex.: /suporte).
  const admin = createAdminClient();

  // numero_whatsapp pro botão/pop-up de suporte flutuante
  // (LandingFloatingActions.tsx) — MESMA config (`configuracoes.numero_
  // whatsapp`) usada em todo o resto da plataforma (ver /suporte). Isolado
  // num try/catch próprio, igual ao padrão já usado em app/login/page.tsx:
  // se a query falhar por qualquer motivo, a landing não pode quebrar por
  // causa disso — só o botão de WhatsApp fica desabilitado.
  let numeroWhatsapp: string | null = null;
  try {
    const { data, error } = (await admin.from('configuracoes').select('numero_whatsapp').eq('id', 1).maybeSingle()) as {
      data: { numero_whatsapp: string | null } | null;
      error: any;
    };
    if (error) console.error('[landing] Falha ao buscar numero_whatsapp:', error.message);
    else numeroWhatsapp = data?.numero_whatsapp ?? null;
  } catch (err) {
    console.error('[landing] Erro inesperado ao buscar numero_whatsapp:', err);
  }

  // Categorias REAIS (mesma tabela que alimenta o filtro de curso da área
  // de membros — ver hooks/useCursoFiltro.ts) — pra coluna "Cursos" do
  // footer (LandingFooter.tsx). Nunca inventadas aqui: se a query falhar,
  // cai numa lista vazia (o footer já trata isso, mostrando uma mensagem
  // em vez de quebrar) em vez de propagar erro pra fora.
  let categorias: { id: string; nome: string }[] = [];
  try {
    const { data, error } = await admin.from('categorias').select('id, nome').order('nome');
    if (error) console.error('[landing] Falha ao buscar categorias:', error.message);
    else categorias = data ?? [];
  } catch (err) {
    console.error('[landing] Erro inesperado ao buscar categorias:', err);
  }

  return <LandingPageClient destinoLogado={destinoLogado} numeroWhatsapp={numeroWhatsapp} categorias={categorias} />;
}
