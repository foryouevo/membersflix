import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { bloquearAcessosComTrialExpirado } from '@/lib/membros/trial';

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname === '/login';
  const isBloqueadoRoute = pathname === '/bloqueado';
  // /inicio, /cursos, /perfil, /curso/[slug]... (rotas novas) são a MESMA
  // área de aluno que /membros/* — precisam das mesmas checagens
  // (autenticado + tipo='aluno') que a área antiga já tinha, senão um
  // acesso direto e deslogado a /inicio só seria barrado depois, dentro de
  // MembrosLayoutShell (redirect ali continua existindo como reforço, mas
  // sem isso aqui o middleware deixaria passar até lá).
  const isAreaAluno =
    pathname.startsWith('/membros') ||
    pathname.startsWith('/inicio') ||
    pathname.startsWith('/cursos') ||
    pathname.startsWith('/perfil') ||
    pathname.startsWith('/curso');
  const isProtectedRoute = pathname.startsWith('/admin') || isAreaAluno;

  // /redefinir-senha (destino do link de "Esqueceu a senha?") passa sempre,
  // logado ou não, bloqueado ou não: o link de recuperação cria uma sessão, e
  // sem essa exceção um aluno bloqueado/expirado seria mandado pra /bloqueado
  // e nunca conseguiria redefinir a senha.
  if (pathname.startsWith('/redefinir-senha')) return response;

  if (!user) {
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return response;
  }

  // Usuário logado: carrega o profile para checar bloqueio/tipo.
  const { data: profile } = await supabase
    .from('profiles')
    .select('tipo, bloqueado, status_pagamento, liberado_em')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    return response;
  }

  // Trial expirado (pendente há mais de 30min) NÃO bloqueia mais a conta
  // inteira (era a antiga "Regra 1": redirect forçado pra /bloqueado —
  // tela cheia só com "Sair", sem navegar em lugar nenhum). Agora o
  // bloqueio é POR CURSO: aqui só marcamos o(s) acesso(s) vencido(s) como
  // bloqueado (ver lib/membros/trial.ts) e o aluno segue logando/navegando
  // normalmente, vendo só o curso com cadeado + um pop-up de aviso (ver
  // TrialExpiradoAviso, montado no layout do aluno).
  //
  // Consequência: pra conta com pagamento PENDENTE, profiles.bloqueado é
  // ignorado (era o que o pg_cron antigo — bloquear_pagamentos_pendentes —
  // gravava automaticamente no trial, indistinguível de um bloqueio manual
  // do admin; a migration 012 desliga essa função). Bloqueio de conta
  // inteira continua valendo pro que sobra: conta JÁ PAGA bloqueada pelo
  // admin (toggleBloqueioConta) segue indo pra /bloqueado.
  const pendente = profile.status_pagamento === 'pendente';
  if (pendente && profile.tipo === 'aluno') {
    await bloquearAcessosComTrialExpirado(user.id);
  }

  const bloqueado = profile.bloqueado && !pendente;

  if (bloqueado) {
    if (!isBloqueadoRoute) {
      return NextResponse.redirect(new URL('/bloqueado', request.url));
    }
    return response;
  }

  // /inicio (era /membros/vitrine — mesma correção de app/page.tsx, pra
  // ficar consistente: qualquer caminho que "manda o aluno pra home" cai
  // no mesmo lugar agora).
  if (isAuthRoute || isBloqueadoRoute) {
    return NextResponse.redirect(new URL(profile.tipo === 'admin' ? '/admin/dashboard' : '/inicio', request.url));
  }

  if (pathname.startsWith('/admin') && profile.tipo !== 'admin') {
    return NextResponse.redirect(new URL('/inicio', request.url));
  }

  if (isAreaAluno && profile.tipo !== 'aluno') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
