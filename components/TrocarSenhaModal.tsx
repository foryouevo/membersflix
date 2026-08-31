'use client';

import { KeyRound } from 'lucide-react';
import Modal from '@/components/Modal';
import { buildSupportWhatsappLink } from '@/lib/utils';

export default function TrocarSenhaModal({
  open,
  onClose,
  numeroWhatsapp,
}: {
  open: boolean;
  onClose: () => void;
  numeroWhatsapp: string | null;
}) {
  function handleFalarNoWhatsapp() {
    if (!numeroWhatsapp) return;
    const link = buildSupportWhatsappLink(numeroWhatsapp, 'Olá, preciso trocar minha senha de acesso.');
    window.open(link, '_blank', 'noopener,noreferrer');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
          <KeyRound size={26} />
        </div>
        <h2 className="mb-2 text-lg font-bold text-white">Precisa trocar sua senha?</h2>
        <p className="mb-6 text-sm text-on-variant">Por segurança, essa troca é feita manualmente. Fale com o suporte pelo WhatsApp.</p>

        {numeroWhatsapp ? (
          <button onClick={handleFalarNoWhatsapp} className="btn-primary w-full">
            Falar no WhatsApp
          </button>
        ) : (
          <p className="text-xs text-error">
            Número de suporte não configurado pelo admin (Configurações &gt; Integração com WhatsApp).
          </p>
        )}

        <button onClick={onClose} className="mt-3 text-sm text-on-variant hover:text-white">
          Fechar
        </button>
      </div>
    </Modal>
  );
}
