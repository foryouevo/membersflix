import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Rota pública — SEM MembrosLayoutShell/autenticação de propósito: o link
// "Políticas de Privacidade" do aviso de cookies (CookieConsentBanner.tsx)
// aparece em QUALQUER rota, inclusive /login, ANTES de qualquer login —
// se esta página exigisse sessão, o link quebraria (redirect pro próprio
// /login) exatamente pra quem mais precisa poder ler isso sem estar
// logado. middleware.ts não lista /politicas como rota protegida, então
// nada bloqueia o acesso deslogado.
//
// Placeholder por pedido explícito ("não precisa escrever o conteúdo
// jurídico completo agora, só a estrutura da página") — texto definitivo
// (política de cookies/privacidade de verdade, revisada juridicamente)
// fica pra depois.
export default function PoliticasPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-16">
      <div className="mx-auto max-w-2xl">
        <Link href="/inicio" className="mb-6 inline-flex items-center gap-2 text-sm text-on-variant transition-colors hover:text-white">
          <ArrowLeft size={16} />
          Voltar
        </Link>

        <h1 className="mb-2 text-2xl font-bold text-white">Políticas de Privacidade</h1>
        <p className="mb-8 text-sm text-on-variant">Última atualização: em breve.</p>

        <div className="space-y-6 rounded-lg bg-card p-6 text-sm leading-relaxed text-on-variant">
          <p>
            Esta página é um placeholder — o conteúdo jurídico completo (política de privacidade e de cookies da MembersFlix, incluindo
            quais dados são coletados, como são usados, por quanto tempo são mantidos e como exercer os direitos previstos na LGPD) ainda
            será redigido e publicado aqui.
          </p>
          <section>
            <h2 className="mb-1.5 font-semibold text-white">Cookies essenciais</h2>
            <p>Necessários para o funcionamento básico da plataforma (ex: manter sua sessão logada). Não podem ser desativados.</p>
          </section>
          <section>
            <h2 className="mb-1.5 font-semibold text-white">Cookies de melhoria de experiência e análise</h2>
            <p>
              Usados, mediante sua permissão, para entender como a plataforma é utilizada e melhorar a experiência. Só são carregados
              depois que você clica em "Aceitar cookies" no aviso exibido no rodapé da tela.
            </p>
          </section>
          <section>
            <h2 className="mb-1.5 font-semibold text-white">Seus direitos</h2>
            <p>
              Você pode alterar sua escolha de cookies a qualquer momento (limpando os dados do site no seu navegador) e entrar em
              contato com o nosso suporte para dúvidas sobre seus dados.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
