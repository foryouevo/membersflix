'use client';

import { useEffect } from 'react';

/**
 * Dificultadores de UI contra clique-direito e os atalhos mais comuns de
 * devtools (F12, Ctrl+Shift+I/J, Ctrl+U).
 *
 * ISTO NÃO É SEGURANÇA REAL. Não existe, tecnicamente, como bloquear o
 * DevTools do navegador a partir de JavaScript da página — qualquer um pode
 * abri-lo por outros caminhos (menu do navegador, atalhos que não
 * interceptamos, extensões, um segundo navegador, etc.) e, uma vez aberto,
 * inspecionar qualquer coisa que o navegador já tenha recebido. Isto serve
 * só para dificultar o acesso casual (o "botão direito > inspecionar" de
 * quem nem estava tentando burlar nada), não para impedir alguém decidido.
 */
export function useDificultarInspecao() {
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    const onKeyDown = (e: KeyboardEvent) => {
      const bloqueado =
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key.toUpperCase() === 'U');
      if (bloqueado) e.preventDefault();
    };
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);
}
