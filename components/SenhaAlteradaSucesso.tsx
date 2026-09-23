import { Check } from 'lucide-react';

// Conteúdo do pop-up "Senha alterada com sucesso!" (card centralizado, ícone
// de check num círculo vermelho da marca, texto e botão) — compartilhado
// entre o modal "Alterar senha" do perfil (AlterarSenhaButton) e o modal de
// redefinição por e-mail na tela de login (RedefinirSenhaModal), pra os dois
// serem exatamente o mesmo pop-up. Renderizar DENTRO de um <Modal> sem
// `title` (o card e a borda vermelha do topo vêm do Modal).
export default function SenhaAlteradaSucesso({ onOk }: { onOk: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Check size={26} />
      </div>
      <h2 className="mb-2 text-lg font-bold text-white">Senha alterada com sucesso!</h2>
      <p className="mb-6 text-sm text-on-variant">Sua nova senha já está ativa. Use-a no seu próximo login.</p>
      <button type="button" onClick={onOk} className="btn-primary w-full">
        Ok
      </button>
    </div>
  );
}
