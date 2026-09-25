import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Rota pública — SEM MembrosLayoutShell/autenticação de propósito: linkada
// tanto no aviso de cookies (CookieConsentBanner.tsx, aparece em QUALQUER
// rota, inclusive /login, ANTES de qualquer login) quanto no rodapé da
// landing institucional (LandingFooter.tsx) — os dois precisam funcionar
// pra visitante deslogado. middleware.ts não lista /politicas como rota
// protegida, então nada bloqueia o acesso.
//
// Consolidada numa página só com 3 seções âncora (pedido explícito desta
// tarefa — antes eram duas páginas soltas, /politicas só com Política de
// Privacidade e /termos só com Termos de Uso): Termos de Uso, Política de
// Privacidade e Política de Cookies, cada uma com sua âncora própria
// (#termos-de-uso, #politica-de-privacidade, #politica-de-cookies) — é
// pra ESSAS âncoras que o rodapé da landing aponta (ver LINKS_LEGAIS em
// LandingFooter.tsx). scroll-mt-20 em cada <section>: sem isso, o título
// da seção ficaria colado no topo da viewport ao navegar direto por uma
// âncora, sem nenhuma folga visual.
//
// Placeholder por pedido explícito ("texto explicativo placeholder
// genérico e profissional, pronto pra eu revisar depois") — conteúdo
// jurídico definitivo (revisado por um advogado) fica pra depois.
const SECOES = [
  {
    id: 'termos-de-uso',
    titulo: 'Termos de Uso',
    paragrafos: [
      'Estes Termos de Uso regulam o acesso e a utilização da plataforma MembersFlix, incluindo a área de membros, os cursos disponibilizados e os recursos de conta, pagamento e suporte associados. Ao criar uma conta ou utilizar a plataforma, você concorda com as condições descritas nesta página.',
      'O acesso aos cursos é pessoal e intransferível, vinculado à conta cadastrada. É vedado o compartilhamento de credenciais de acesso, a reprodução, distribuição ou revenda do conteúdo disponibilizado, no todo ou em parte, sem autorização prévia da MembersFlix.',
      'A MembersFlix pode suspender ou encerrar o acesso de contas que violem estes termos, incluindo casos de uso indevido, tentativa de fraude no pagamento ou compartilhamento não autorizado de conteúdo, sem prejuízo de outras medidas cabíveis.',
      'Este texto é um placeholder — a versão definitiva (com as regras específicas de cada plano/curso, condições de reembolso e demais cláusulas) será revisada juridicamente antes da publicação final.',
    ],
  },
  {
    id: 'politica-de-privacidade',
    titulo: 'Política de Privacidade',
    paragrafos: [
      'Esta Política de Privacidade descreve como a MembersFlix coleta, usa, armazena e protege os dados pessoais dos usuários da plataforma, em conformidade com a Lei Geral de Proteção de Dados (LGPD).',
      'Coletamos dados como nome, e-mail e telefone no momento do cadastro, além de informações de uso da plataforma (progresso nos cursos, preferências de navegação) para viabilizar o funcionamento do serviço e melhorar sua experiência.',
      'Os dados coletados não são vendidos a terceiros. Podem ser compartilhados apenas com prestadores de serviço essenciais à operação da plataforma (ex.: processamento de pagamento, hospedagem), sempre sob obrigação de confidencialidade.',
      'Você pode solicitar a qualquer momento a confirmação da existência de tratamento, o acesso, a correção ou a exclusão dos seus dados pessoais, entrando em contato com o nosso suporte.',
    ],
  },
  {
    id: 'politica-de-cookies',
    titulo: 'Política de Cookies',
    paragrafos: [
      'Utilizamos cookies para viabilizar o funcionamento essencial da plataforma (ex.: manter sua sessão logada) e, mediante sua permissão, cookies de melhoria de experiência e análise de uso do site.',
      'Cookies essenciais são sempre ativos e não podem ser desativados, pois são necessários para o funcionamento básico da plataforma.',
      'Cookies de melhoria de experiência e análise só são carregados depois que você clica em "Aceitar cookies" no aviso exibido na tela. Você pode optar por rejeitá-los a qualquer momento, sem prejuízo ao uso das funcionalidades essenciais da plataforma.',
      'Você pode alterar sua escolha de cookies a qualquer momento limpando os dados do site no seu navegador, o que faz o aviso de consentimento aparecer novamente no seu próximo acesso.',
    ],
  },
] as const;

export default function PoliticasPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-16">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-on-variant transition-colors hover:text-white">
          <ArrowLeft size={16} />
          Voltar
        </Link>

        <h1 className="mb-2 text-2xl font-bold text-white">Políticas</h1>
        <p className="mb-8 text-sm text-on-variant">Última atualização: em breve.</p>

        <div className="space-y-10">
          {SECOES.map((secao) => (
            <section key={secao.id} id={secao.id} className="scroll-mt-20 space-y-4 rounded-lg bg-card p-6 text-sm leading-relaxed text-on-variant">
              <h2 className="text-lg font-bold text-white">{secao.titulo}</h2>
              {secao.paragrafos.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
