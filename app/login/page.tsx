import { createClient } from '@/lib/supabase/server';
import LoginPageClient from '@/components/LoginPageClient';

type LoginConfig = {
  desenvolvido_por: string | null;
  email_contato: string | null;
  termos_uso_url: string | null;
  numero_whatsapp: string | null;
  // Fundo em tela cheia da tela de login, configurável pelo admin (Admin >
  // Configurações > Fundo da Tela de Login). null: LoginPageClient cai no
  // fallback estático /hero-destaque.png.
  login_background_url: string | null;
};

// Busca a config da tela de login: o rodapé (Configurações > Rodapé da Tela
// de Login) e o número de WhatsApp do suporte (Configurações > Integração
// com WhatsApp — mesmo campo já usado em outros lugares do sistema, ex.
// MembrosSidebar/AccessModal), usado no modal de "Precisa trocar sua
// senha?". Isolada num try/catch próprio e nunca propaga erro pra fora: se
// a migration das colunas novas ainda não rodou no banco, se a query
// falhar, ou se a criação do client do Supabase der problema por qualquer
// motivo, a tela de login não pode ficar em branco por causa disso — todo
// mundo precisa conseguir logar mesmo sem essa config.
//
// telefone_contato: não é mais buscado nem passado pra LoginPageClient
// (pedido explícito — telefone removido de vez do rodapé). A coluna e o
// campo no painel do admin continuam existindo (fora do escopo deste
// pedido), só pararam de ser lidos aqui.
async function buscarLoginConfig(): Promise<LoginConfig> {
  const vazio: LoginConfig = {
    desenvolvido_por: null,
    email_contato: null,
    termos_uso_url: null,
    numero_whatsapp: null,
    login_background_url: null,
  };

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('configuracoes')
      .select('desenvolvido_por, email_contato, termos_uso_url, numero_whatsapp, login_background_url')
      .eq('id', 1)
   .maybeSingle() as { data: any, error: any };

    if (error) {
      console.error('[login] Falha ao buscar configuracoes (seguindo com fallback vazio):', error.message);
      return vazio;
    }

    return {
      desenvolvido_por: data?.desenvolvido_por ?? null,
      email_contato: data?.email_contato ?? null,
      termos_uso_url: data?.termos_uso_url ?? null,
      numero_whatsapp: data?.numero_whatsapp ?? null,
      login_background_url: data?.login_background_url ?? null,
    };
  } catch (err) {
    console.error('[login] Erro inesperado ao buscar configuracoes (seguindo com fallback vazio):', err);
    return vazio;
  }
}

// Cursos pro <select> do cadastro público ("Qual curso gostaria de ter
// acesso inicial?") — MESMO filtro (status='active') da listagem de
// /cursos (lib/membros/catalogo-cursos.ts), só que sem sessão (a RLS de
// `cursos` já libera leitura de curso ativo pra usuário anônimo — ver
// cursos_select em supabase/schema.sql — então o client comum, sem
// admin, já basta aqui). Isolado com o mesmo padrão de try/catch de
// buscarLoginConfig: sem cursos, o formulário de cadastro simplesmente
// fica sem opção nenhuma no select (validação client-side barra o
// submit), mas a tela de login inteira não quebra por causa disso.
async function buscarCursosParaCadastro(): Promise<{ id: string; titulo: string }[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from('cursos').select('id, titulo').eq('status', 'active').order('ordem');
    if (error) {
      console.error('[login] Falha ao buscar cursos pro cadastro (seguindo com lista vazia):', error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error('[login] Erro inesperado ao buscar cursos pro cadastro (seguindo com lista vazia):', err);
    return [];
  }
}

// Server Component: essa config é só um extra (rodapé + modal), então busca
// ela isolada (buscarLoginConfig nunca lança) antes de renderizar — o form
// em si (estado/submit) mora no client component.
export default async function LoginPage() {
  const [config, cursos] = await Promise.all([buscarLoginConfig(), buscarCursosParaCadastro()]);

  return (
    <LoginPageClient
      desenvolvidoPor={config.desenvolvido_por}
      emailContato={config.email_contato}
      termosUsoUrl={config.termos_uso_url}
      numeroWhatsapp={config.numero_whatsapp}
      loginBackgroundUrl={config.login_background_url}
      cursos={cursos}
    />
  );
}
