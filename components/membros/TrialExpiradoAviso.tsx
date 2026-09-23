'use client';

import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import Modal from '@/components/Modal';
import { buildWhatsappLink } from '@/lib/utils';

/**
 * Pop-up (não tela cheia) avisando, ao entrar na plataforma, que o acesso ao
 * curso escolhido foi bloqueado porque o pagamento não foi confirmado
 * dentro dos 30min de teste. Mesmo visual do AccessModal ("Você deseja
 * liberar esse curso?"): card centralizado, borda vermelha no topo (vem do
 * Modal), ícone de cadeado num círculo, botão "Falar no WhatsApp" e
 * "Agora não" — o aluno fecha e segue navegando normalmente.
 *
 * Aparece UMA vez por sessão do navegador (sessionStorage, por aluno+curso):
 * ao logar/abrir a plataforma, não a cada troca de página. Quem decide se há
 * curso bloqueado por trial é o servidor (MembrosLayoutShell) — este
 * componente só cuida de mostrar/fechar.
 */
export default function TrialExpiradoAviso({
  curso,
  numeroWhatsapp,
  alunoId,
}: {
  curso: { id: string; titulo: string; mensagem_whatsapp: string } | null;
  numeroWhatsapp: string | null;
  alunoId: string;
}) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!curso) return;
    const chave = `trial-aviso:${alunoId}:${curso.id}`;
    try {
      if (window.sessionStorage.getItem(chave)) return;
      window.sessionStorage.setItem(chave, '1');
    } catch {
      // sessionStorage indisponível (modo privado restrito): mostra mesmo
      // assim, uma vez por montagem.
    }
    setAberto(true);
  }, [curso, alunoId]);

  if (!curso) return null;

  function handleWhatsapp() {
    if (!numeroWhatsapp || !curso) return;
    window.open(buildWhatsappLink(numeroWhatsapp, curso.mensagem_whatsapp, curso.titulo), '_blank', 'noopener,noreferrer');
    setAberto(false);
  }

  return (
    <Modal open={aberto} onClose={() => setAberto(false)} maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Lock size={26} />
        </div>
        <h2 className="mb-2 text-lg font-bold text-white">Acesso ao curso bloqueado</h2>
        <p className="mb-1 text-sm font-medium text-white">{curso.titulo}</p>
        <p className="mb-6 text-sm text-on-variant">
          Não identificamos a confirmação do seu pagamento dentro do período de teste. Fale com a gente para liberar o curso —
          você continua podendo navegar pela plataforma normalmente.
        </p>
        {numeroWhatsapp ? (
          <button type="button" onClick={handleWhatsapp} className="btn-primary w-full">
            Falar no WhatsApp
          </button>
        ) : (
          <p className="text-xs text-error">Número de suporte não configurado.</p>
        )}
        <button type="button" onClick={() => setAberto(false)} className="mt-3 text-sm text-on-variant hover:text-white">
          Agora não
        </button>
      </div>
    </Modal>
  );
}
