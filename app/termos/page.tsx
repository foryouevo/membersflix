import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Rota pública — mesmo padrão de app/politicas/page.tsx (SEM
// MembrosLayoutShell/autenticação de propósito: linkada no footer da
// landing institucional, /, que qualquer visitante deslogado acessa —
// exigir sessão aqui quebraria o link pra quem mais precisa poder ler sem
// estar logado). "Voltar" aponta pra "/" (não "/inicio", diferente de
// app/politicas/page.tsx): "/inicio" é rota protegida (middleware.ts
// redireciona quem não tem sessão pro /login), e o público-alvo típico
// deste link (footer da landing) é justamente visitante deslogado — "/"
// funciona pros dois casos (deslogado vê a landing de novo, logado também,
// ver app/page.tsx).
//
// Placeholder por pedido explícito ("crie como página placeholder se ainda
// não existir") — conteúdo jurídico completo (Termos de Uso de verdade,
// revisado juridicamente) fica pra depois.
export default function TermosPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-16">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-on-variant transition-colors hover:text-white">
          <ArrowLeft size={16} />
          Voltar
        </Link>

        <h1 className="mb-2 text-2xl font-bold text-white">Termos de Uso</h1>
        <p className="mb-8 text-sm text-on-variant">Última atualização: em breve.</p>

        <div className="space-y-6 rounded-lg bg-card p-6 text-sm leading-relaxed text-on-variant">
          <p>
            Esta página é um placeholder — o conteúdo jurídico completo dos Termos de Uso da MembersFlix (condições de acesso aos
            cursos, regras de uso da plataforma, política de reembolso, limitações de responsabilidade e demais cláusulas) ainda será
            redigido e publicado aqui.
          </p>
          <p>
            Em caso de dúvidas enquanto este conteúdo não está disponível,{' '}
            <Link href="/suporte" className="font-medium text-primary hover:underline">
              fale com o nosso suporte
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
