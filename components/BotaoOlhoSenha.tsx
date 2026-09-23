'use client';

import { Eye, EyeOff } from 'lucide-react';

// Botão de olho dentro do input de senha (alinhado à direita — o pai precisa
// ser `relative` e o input ter `pr-10`). Olho aberto = senha oculta (clicar
// mostra); olho riscado = senha visível (clicar oculta). type="button": não
// submete o formulário. Compartilhado entre a tela de login/cadastro
// (LoginPageClient) e o modal "Alterar senha" (AlterarSenhaButton).
export default function BotaoOlhoSenha({ visivel, onToggle }: { visivel: boolean; onToggle: () => void }) {
  const Icone = visivel ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
      aria-pressed={visivel}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-variant transition-colors hover:text-white"
    >
      <Icone size={16} />
    </button>
  );
}
