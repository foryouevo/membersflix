import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname === '/login';
  const isBloqueadoRoute = pathname === '/bloqueado';
  const isProtectedRoute = pathname.startsWith('/admin') || pathname.startsWith('/membros');

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

  // Regra 1: pendente há mais de 30min (trial) vira bloqueado (o cron já
  // marca isso no banco; aqui fazemos uma checagem redundante em tempo real
  // como reforço, pra não depender só do cron rodar a cada 5min).
  const liberadoEm = new Date(profile.liberado_em).getTime();
  const expirado = profile.status_pagamento === 'pendente' && Date.now() - liberadoEm > 30 * 60 * 1000;
  const bloqueado = profile.bloqueado || expirado;

  if (bloqueado) {
    if (!isBloqueadoRoute) {
      return NextResponse.redirect(new URL('/bloqueado', request.url));
    }
    return response;
  }

  if (isAuthRoute || isBloqueadoRoute) {
    return NextResponse.redirect(
      new URL(profile.tipo === 'admin' ? '/admin/dashboard' : '/membros/vitrine', request.url)
    );
  }

  if (pathname.startsWith('/admin') && profile.tipo !== 'admin') {
    return NextResponse.redirect(new URL('/membros/vitrine', request.url));
  }

  if (pathname.startsWith('/membros') && profile.tipo !== 'aluno') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
