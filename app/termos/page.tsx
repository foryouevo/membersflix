import { redirect } from 'next/navigation';

// /termos virou uma seção (com âncora própria) dentro de /politicas
// (pedido desta tarefa — os 3 links legais do rodapé, incluindo "Termos de
// Uso", agora apontam todos pra /politicas com uma âncora cada, ver
// LandingFooter.tsx). Esta rota continua existindo só como redirect, pra
// não quebrar quem já tinha o link antigo salvo/compartilhado.
export default function TermosRedirect() {
  redirect('/politicas#termos-de-uso');
}
