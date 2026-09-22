'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Chave sugerida pelo pedido — valores "accepted"/"rejected", nunca
// sobrescritos automaticamente depois da primeira resposta (só o próprio
// aluno muda isso, limpando o localStorage/rejeitando de novo em algum
// futuro painel de preferências, se um dia existir um).
const CHAVE_CONSENTIMENTO = 'membersflix_cookie_consent';

/**
 * Aviso de cookies (LGPD) — fixo, canto inferior DIREITO (era centralizado
 * — pedido de uma tarefa posterior), em QUALQUER rota
 * (renderizado no layout raiz, app/layout.tsx, como irmão de
 * LoginIntroOverlay — não dentro de nenhuma página isolada, pedido
 * explícito). Só aparece antes de qualquer resposta salva; some pra sempre
 * (nos próximos acessos) assim que o aluno aceita OU rejeita — os dois
 * caminhos gravam a escolha, nenhum dos dois é "escape sem responder"
 * (fechar no X, se um dia for adicionado, teria que contar como rejeitar,
 * nunca como aceitar silenciosamente).
 *
 * "Aceitar"/"Rejeitar" com o MESMO peso visual (pedido explícito, exigência
 * da ANPD/LGPD: nada de um botão grande e vermelho vs. um link discreto) —
 * reaproveita .btn-primary/.btn-secondary já existentes no tema (ver
 * app/globals.css): mesmo padding/tamanho de fonte/border-radius nos dois,
 * só a cor muda (sólido vermelho vs. contornado) — nenhum dos dois “sai na
 * frente” visualmente.
 */
export default function CookieConsentBanner() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    try {
      const escolhaSalva = localStorage.getItem(CHAVE_CONSENTIMENTO);
      if (!escolhaSalva) setVisivel(true);
    } catch {
      // localStorage indisponível (ex: navegação privada restrita) — não
      // mostra o banner: sem como lembrar a escolha depois, melhor não
      // interromper a cada carregamento do que arriscar reperguntar toda
      // hora sem nunca conseguir "silenciar" de vez.
    }
  }, []);

  function responder(escolha: 'accepted' | 'rejected') {
    try {
      localStorage.setItem(CHAVE_CONSENTIMENTO, escolha);
    } catch {
      // Mesmo sem conseguir persistir, ainda fecha o banner nesta sessão —
      // melhor do que travar a UI numa escolha que não pôde ser salva.
    }
    setVisivel(false);

    if (escolha === 'accepted') {
      // TODO(analytics/marketing): É AQUI, e só aqui, que scripts NÃO
      // essenciais (Google Analytics, Meta Pixel, etc.) devem ser
      // carregados — nunca antes do clique em "Aceitar cookies" (exigência
      // legal: nada de disparar esses scripts assim que a página carrega,
      // "torcendo" pra pedir desculpa depois se o aluno rejeitar). Ex.:
      //   carregarGoogleAnalytics();
      //   carregarMetaPixel();
      // Se um dia precisar granularidade (aceitar analytics mas não
      // marketing, por ex.), a escolha salva aqui vira só "accepted" geral
      // — trocar por um objeto de categorias exigiria repensar a chave do
      // localStorage e este componente inteiro, não é um ajuste pequeno.
    }
  }

  if (!visivel) return null;

  return (
    // z-[9999] (era z-50 — pedido explícito: nada mais na plataforma passa
    // de z-50, ver Header.tsx/BottomNav.tsx/FiltroModal.tsx/Modal.tsx —
    // então isso já bastava pra ordem de empilhamento em si, mas o bug
    // relatado era outro: este <div> é `inset-x-0` (largura TOTAL da tela)
    // só pra poder alinhar o card à direita (`justify-end`) — mesmo com o
    // card visualmente ocupando só a faixa direita, a área TRANSPARENTE à
    // esquerda dele (ex: sobre o rodapé do login, "Desenvolvido por
    // .../suporte@...") continuava capturando cliques, por ser parte do
    // mesmo elemento clicável/hit-testável. pointer-events-none aqui fora
    // + pointer-events-auto só no card (abaixo) resolve os dois lados do
    // que foi relatado: nada mais fica bloqueado por baixo do espaço vazio,
    // e os botões do próprio pop-up continuam 100% clicáveis.
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consentimento de cookies"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[9999] flex justify-end px-4"
    >
      <div className="pointer-events-auto w-full max-w-[26rem] rounded-lg border border-border bg-surface-high p-4 shadow-overlay sm:p-5">
        <p className="text-sm leading-relaxed text-on-variant">
          Usamos cookies essenciais para o funcionamento da plataforma e, com a sua permissão, cookies para melhorar sua experiência e
          analisar o uso do site.{' '}
          <Link href="/politicas" className="font-medium text-primary underline underline-offset-2 hover:text-primary-hover">
            Políticas de Privacidade
          </Link>
          .
        </p>

        {/* flex-1 nos dois: largura idêntica, sem um "roubar" espaço do
            outro — mesmo em telas bem estreitas, onde empilham
            (flex-col), cada um ocupa 100% da largura igualmente. mt-4
            (era mt-3): pedido explícito. */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => responder('accepted')} className="btn-primary flex-1 text-center">
            Aceitar cookies
          </button>
          <button type="button" onClick={() => responder('rejected')} className="btn-secondary flex-1 text-center">
            Rejeitar cookies
          </button>
        </div>
      </div>
    </div>
  );
}
