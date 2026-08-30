'use client';

import { Lock } from 'lucide-react';
import Modal from '@/components/Modal';
import { buildWhatsappLink } from '@/lib/utils';
import type { Curso } from '@/types';

export default function AccessModal({
  open,
  onClose,
  curso,
  numeroWhatsapp,
}: {
  open: boolean;
  onClose: () => void;
  curso: Curso | null;
  numeroWhatsapp: string | null;
}) {
  if (!curso) return null;

  function handleLiberar() {
    if (!numeroWhatsapp || !curso) return;
    const link = buildWhatsappLink(numeroWhatsapp, curso.mensagem_whatsapp, curso.titulo);
    window.open(link, '_blank', 'noopener,noreferrer');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Lock size={26} />
        </div>
        <h2 className="mb-2 text-lg font-bold text-white">Você deseja liberar esse curso?</h2>
        <p className="mb-6 text-sm text-on-variant">{curso.titulo}</p>
        <button onClick={handleLiberar} className="btn-primary w-full">
          Falar no WhatsApp
        </button>
        <button onClick={onClose} className="mt-3 text-sm text-on-variant hover:text-white">
          Agora não
        </button>
      </div>
    </Modal>
  );
}
