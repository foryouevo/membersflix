'use client';

import { useState } from 'react';
import { Mail, MessageCircle, Plus, Send, CheckCircle2 } from 'lucide-react';
import { buildSupportWhatsappLink, cn } from '@/lib/utils';

const EMAIL_SUPORTE = 'suportemembersflix@gmail.com';

// 8 perguntas fixas (pedido explícito — as 5 originais + 3 adicionadas numa
// tarefa posterior) — sem vir do banco: é conteúdo
// institucional, igual ao "Explorar cursos" do hero da Home (CursoDestaque),
// não um dado que o admin cadastra hoje.
const FAQ_ITEMS: { pergunta: string; resposta: string }[] = [
  {
    pergunta: 'O acesso é vitalício?',
    resposta:
      'Sim! O acesso vitalício é garantido de acordo com o que você adquirir: se comprar um curso avulso, tem acesso vitalício àquele curso; se comprar um pacote de cursos, tem acesso vitalício aos cursos daquele pacote; e se optar pelo Pacote Full, tem acesso vitalício a todos os cursos da plataforma.',
  },
  {
    pergunta: 'Como funciona o acesso à plataforma?',
    resposta:
      'O cadastro na plataforma é gratuito! Você cria seu usuário e senha e já pode explorar a plataforma e ver os cursos disponíveis. Ao começar a assistir a um curso, você tem 30 minutos de acesso gratuito ao primeiro módulo — se não houver confirmação de pagamento nesse período, o acesso é bloqueado até a liberação.',
  },
  {
    pergunta: 'Quais as formas de pagamento aceitas?',
    resposta: 'Aceitamos cartão de crédito e Pix.',
  },
  {
    pergunta: 'Posso assistir pelo celular e em mais de um dispositivo?',
    resposta: 'Sim! A plataforma funciona perfeitamente no celular, tablet e computador, sem limite de telas.',
  },
  {
    pergunta: 'Não gostei ou não é o que eu esperava, tem garantia/reembolso?',
    resposta: 'Sim, oferecemos garantia incondicional de 7 dias, conforme o Código de Defesa do Consumidor.',
  },
  {
    pergunta: 'Como funciona o período de teste de 30 minutos?',
    resposta:
      'Ao se cadastrar e escolher um curso, você tem 30 minutos de acesso gratuito para explorar o conteúdo. Se dentro desse período (ou depois) identificarmos seu pagamento, o acesso é liberado normalmente; caso contrário, apenas aquele curso fica bloqueado até a confirmação do pagamento — você continua podendo navegar pela plataforma normalmente.',
  },
  {
    pergunta: 'Preciso instalar algum aplicativo para assistir aos cursos?',
    resposta:
      'Não! O MembersFlix funciona direto pelo navegador, no celular, tablet ou computador, sem necessidade de baixar nenhum aplicativo.',
  },
  {
    pergunta: 'Esqueci minha senha, como recupero o acesso?',
    resposta: "Na tela de login, clique em 'Esqueceu a senha?' e siga as instruções para redefinir sua senha pelo e-mail cadastrado.",
  },
];

/**
 * /suporte — item "Suporte" do menu/bottom nav deixou de abrir o WhatsApp
 * direto (target="_blank") e passou a navegar pra cá (pedido de uma tarefa
 * anterior). Layout desta tarefa (referência enviada pelo usuário): duas
 * colunas (lg:grid-cols-2 — empilha em 1 coluna abaixo de lg).
 *
 * ESQUERDA (ordem fixa, pedido explícito de uma tarefa anterior): título
 * "Suporte" + subtítulo, card de contato (e-mail/WhatsApp), título "Fale
 * conosco" + subtítulo, card do formulário — contato e formulário são
 * cards SEPARADOS (antes viviam juntos num único card).
 *
 * DIREITA: título "Perguntas Frequentes" + subtítulo + as 5 perguntas em
 * cards SEPARADOS (antes era uma lista única com divide-y) — cada card com
 * um ícone "+" que gira 45deg (via CSS, mesmo elemento <Plus>, nunca troca
 * pra outro ícone) virando um "×" quando aberto.
 *
 * numeroWhatsapp vem do Server Component (app/(portal)/suporte/page.tsx),
 * MESMA configuração (`configuracoes.numero_whatsapp`) já usada em todo o
 * resto da plataforma — nenhum número novo inventado aqui.
 *
 * Formulário: por pedido explícito de uma tarefa anterior, ainda NÃO
 * envia os dados pra lugar nenhum de verdade — só loga no console e
 * mostra uma mensagem de sucesso (mesmo padrão de estado "sucesso" já
 * usado em AlterarSenhaButton.tsx). Quando o destino real for definido, é
 * só trocar o corpo de `handleSubmit` por uma server action/fetch — a UI
 * já está pronta.
 */
export default function SuportePageClient({ numeroWhatsapp }: { numeroWhatsapp: string | null }) {
  const whatsappLink = numeroWhatsapp ? buildSupportWhatsappLink(numeroWhatsapp, 'Olá, preciso de suporte com minha conta.') : null;

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);

    // TODO: ainda não tem destino definido pro formulário (pedido
    // explícito — "vou definir depois para onde esse formulário deve
    // realmente enviar os dados"). Por enquanto só loga e mostra sucesso.
    console.log('[suporte] formulário de contato enviado:', { nome, email, telefone, mensagem });

    setEnviando(false);
    setEnviado(true);
    setNome('');
    setEmail('');
    setTelefone('');
    setMensagem('');
  }

  return (
    <div className="px-4 py-6 md:px-6 lg:px-16 lg:pb-10 lg:pt-24 lg:-mt-20">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* ═══ ESQUERDA — Suporte / Fale conosco / card contato / card formulário ═══ */}
        <div>
          <h1 className="mb-2 text-2xl font-bold text-white">Suporte</h1>
          <p className="mb-4 text-sm text-on-variant">Entre em contato — nossa equipe responde o mais rápido possível.</p>

          {/* Card de contato — separado do card do formulário (pedido de uma
              tarefa anterior; antes ambos viviam no mesmo card). */}
          <div className="mb-4 space-y-3 rounded-lg bg-card p-5">
            <a
              href={`mailto:${EMAIL_SUPORTE}`}
              className="flex items-center gap-3 rounded-lg bg-surface-container p-3 text-sm text-white transition-colors hover:bg-surface-high"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Mail size={18} />
              </span>
              <span>
                <span className="block text-xs text-on-variant">E-mail</span>
                {EMAIL_SUPORTE}
              </span>
            </a>

            {whatsappLink ? (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg bg-surface-container p-3 text-sm text-white transition-colors hover:bg-surface-high"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <MessageCircle size={18} />
                </span>
                <span>
                  <span className="block text-xs text-on-variant">WhatsApp</span>
                  Chamar no WhatsApp
                </span>
              </a>
            ) : (
              <div
                title="Número de suporte não configurado pelo admin"
                className="flex cursor-not-allowed items-center gap-3 rounded-lg bg-surface-container p-3 text-sm opacity-60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <MessageCircle size={18} />
                </span>
                <span>
                  <span className="block text-xs text-on-variant">WhatsApp</span>
                  Não configurado no momento
                </span>
              </div>
            )}
          </div>

          {/* "Fale conosco" — mesma estrutura título+subtítulo de "Suporte"
              acima e "Perguntas Frequentes" à direita. Reordenado pra ficar
              entre o card de contato e o card do formulário (pedido desta
              tarefa). */}
          <h2 className="mb-2 text-2xl font-bold text-white">Fale conosco</h2>
          <p className="mb-4 text-sm text-on-variant">Escolha o canal que preferir para falar com a gente.</p>

          {/* Card do formulário — separado do card de contato acima. */}
          <div className="rounded-lg bg-card p-5">
            {enviado ? (
              <div className="flex items-start gap-2 rounded-lg bg-primary/10 p-4 text-sm text-primary">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <span>
                  Mensagem enviada com sucesso! Nossa equipe vai te responder em breve.
                  <button type="button" onClick={() => setEnviado(false)} className="mt-2 block text-xs font-semibold underline">
                    Enviar outra mensagem
                  </button>
                </span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Nome + Telefone lado a lado (mantido de uma tarefa
                    anterior); E-mail e Mensagem continuam ocupando a
                    linha inteira. */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="suporte-nome" className="mb-1.5 block text-sm font-medium text-on-surface">
                      Nome
                    </label>
                    <input
                      id="suporte-nome"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="input-field"
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label htmlFor="suporte-telefone" className="mb-1.5 block text-sm font-medium text-on-surface">
                      Telefone
                    </label>
                    <input
                      id="suporte-telefone"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(28) 99999-9999"
                      className="input-field"
                      autoComplete="tel"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="suporte-email" className="mb-1.5 block text-sm font-medium text-on-surface">
                    E-mail
                  </label>
                  <input
                    id="suporte-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label htmlFor="suporte-mensagem" className="mb-1.5 block text-sm font-medium text-on-surface">
                    Mensagem
                  </label>
                  <textarea
                    id="suporte-mensagem"
                    required
                    rows={3}
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    placeholder="Conte pra gente o motivo do contato..."
                    className="input-field resize-none"
                  />
                </div>

                <button type="submit" disabled={enviando} className="btn-primary flex w-full items-center justify-center gap-2">
                  <Send size={16} />
                  {enviando ? 'Enviando...' : 'Enviar mensagem'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ═══ DIREITA — Perguntas Frequentes, cards separados ═══ */}
        <div>
          <h2 className="mb-2 text-2xl font-bold text-white">Perguntas Frequentes</h2>
          <p className="mb-4 text-sm text-on-variant">Tire suas dúvidas antes de começar.</p>
          <FaqCards itens={FAQ_ITEMS} />
        </div>
      </div>
    </div>
  );
}

// Cada pergunta é seu próprio card (pedido desta tarefa — antes era uma
// lista única com divide-y), com espaçamento entre eles (space-y-3). O
// ícone "+" é o MESMO elemento <Plus> sempre — só gira 45deg via CSS
// (rotate-45) quando aberto, virando visualmente um "×"; não troca pra um
// ícone diferente (ex.: Minus/X). Animação de abrir/fechar via
// grid-template-rows 0fr -> 1fr (mesma técnica já usada na busca mobile do
// Header — ver Header.tsx — só CSS, sem medir altura em pixels via JS); o
// <div> logo dentro precisa de min-h-0 + overflow-hidden pra essa técnica
// funcionar (senão o conteúdo não encolhe abaixo da própria altura
// intrínseca). Só 1 pergunta aberta por vez (abrir uma fecha a anterior).
function FaqCards({ itens }: { itens: { pergunta: string; resposta: string }[] }) {
  const [abertoIndex, setAbertoIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {itens.map((item, i) => {
        const aberto = abertoIndex === i;
        return (
          <div key={item.pergunta} className="rounded-lg bg-card p-5">
            <button
              type="button"
              onClick={() => setAbertoIndex(aberto ? null : i)}
              aria-expanded={aberto}
              className="flex w-full items-center justify-between gap-3 text-left text-[1rem] font-medium text-white"
            >
              {item.pergunta}
              <Plus
                size={18}
                className={cn('shrink-0 text-on-variant transition-transform duration-200', aberto && 'rotate-45 text-primary')}
              />
            </button>
            <div className={cn('grid transition-[grid-template-rows] duration-300 ease-out', aberto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
              <div className="min-h-0 overflow-hidden">
                <p className="mt-2.5 text-sm leading-relaxed text-on-variant">{item.resposta}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
