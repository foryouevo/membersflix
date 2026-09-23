'use client';

import { useEffect } from 'react';

// Rota antiga do fluxo de redefinição — o link do e-mail agora aponta direto
// pra /login, que abre o pop-up de redefinição (ver RedefinirSenhaModal,
// montado em LoginPageClient). Esta página só existe pra não quebrar e-mails
// já enviados com o destino antigo: encaminha pra /login preservando a query
// e o hash (onde o Supabase manda o token/código), pra o pop-up abrir do
// mesmo jeito.
export default function RedefinirSenhaRedirect() {
  useEffect(() => {
    window.location.replace(`/login${window.location.search}${window.location.hash}`);
  }, []);
  return null;
}
