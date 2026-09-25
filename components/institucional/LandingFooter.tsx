'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Instagram, Facebook, MessageCircle } from 'lucide-react';
import { buildSupportWhatsappLink, slugify } from '@/lib/utils';
import Container from '@/components/institucional/Container';

// Redes sociais (pedido explícito, item 10: Instagram/Facebook/WhatsApp).
// Instagram e Facebook são PLACEHOLDER de verdade (href="#") — não existe
// link real cadastrado em lugar nenhum do projeto pra essas duas, avisado
// no resumo final. WhatsApp NÃO é placeholder: usa o MESMO
// `configuracoes.numero_whatsapp` já usado em todo o resto da plataforma
// (montado logo abaixo, via buildSupportWhatsappLink). Ícone do WhatsApp:
// lucide-react não tem ícones de marca (Instagram/Facebook são exceção,
// ícones genéricos de contorno que a lib mantém por serem MUITO comuns) —
// MessageCircle (mesmo usado no botão de suporte flutuante) como
// substituto, não é o logo oficial do WhatsApp.
const ITENS_MENU_FOOTER = [
  { id: 'inicio', label: 'Início' },
  { id: 'plataforma', label: 'Plataforma' },
  { id: 'cursos', label: 'Cursos' },
  { id: 'diferenciais', label: 'Diferenciais' },
  { id: 'planos', label: 'Planos' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'ajuda', label: 'Ajuda' },
] as const;

// Os três links legais, todos pra /politicas com uma âncora própria (item
// 11) — a página tem uma seção por âncora (ver app/politicas/page.tsx).
const LINKS_LEGAIS = [
  { label: 'Termos de Uso', href: '/politicas#termos-de-uso' },
  { label: 'Política de Privacidade', href: '/politicas#politica-de-privacidade' },
  { label: 'Política de Cookies', href: '/politicas#politica-de-cookies' },
] as const;

/**
 * Footer da landing institucional (/) — tema escuro fixo (bg-black),
 * independente do toggle light/dark do resto da landing: mesma decisão
 * visual que o header (LandingHeader.tsx) já toma, pelo mesmo motivo — um
 * footer institucional sóbrio combina em qualquer tema que a pessoa tenha
 * escolhido pra navegar a página.
 *
 * `logado`/`categorias`: pra montar os links da coluna "Cursos" (item 12)
 * — clicar numa categoria leva pra `/cursos/buscar?categoria=<slug>` (MESMA
 * rota/parâmetro que o filtro de categoria da área de membros já usa, ver
 * Header.tsx) se `logado`, ou pro cadastro (`/login?form=cadastro`) se
 * não — `/cursos/buscar` é rota protegida (middleware.ts: prefixo
 * `/cursos`), então um clique deslogado cairia direto no /login genérico
 * de qualquer forma; resolver aqui evita esse "pulo" e já manda direto
 * pro cadastro, que é o pedido explícito.
 */
export default function LandingFooter({
  logado,
  categorias,
  numeroWhatsapp,
}: {
  logado: boolean;
  categorias: { id: string; nome: string }[];
  numeroWhatsapp: string | null;
}) {
  const whatsappLink = numeroWhatsapp ? buildSupportWhatsappLink(numeroWhatsapp, 'Olá, vim pelo site institucional.') : null;

  const redesSociais = [
    { nome: 'Instagram', Icone: Instagram, href: '#' },
    { nome: 'Facebook', Icone: Facebook, href: '#' },
    { nome: 'WhatsApp', Icone: MessageCircle, href: whatsappLink ?? '#' },
  ] as const;

  function irParaSecao(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Divide as categorias em 2 sub-colunas lado a lado (pedido explícito,
  // item 12 — "como são várias, divida em 2 sub-colunas") — metade em
  // cada, a primeira sub-coluna leva 1 a mais quando o total é ímpar.
  const metade = Math.ceil(categorias.length / 2);
  const colunaCursos1 = categorias.slice(0, metade);
  const colunaCursos2 = categorias.slice(metade);

  function hrefCategoria(nome: string) {
    if (!logado) return '/login?form=cadastro';
    // slugify (lib/utils.ts) — MESMA função que Header.tsx (área de
    // membros) usa pra montar ?categoria=<slug>, não uma reimplementação.
    return `/cursos/buscar?categoria=${slugify(nome)}`;
  }

  return (
    // rounded-t-[2rem] (pedido explícito, item 10): bordas de cima
    // arredondadas — só de cima, o footer é sempre o último elemento da
    // página, então o "chão" dele não precisa (nem deveria) ser
    // arredondado.
    <footer className="rounded-t-[2rem] border-t border-white/10 bg-black py-12 text-gray-400">
      <Container>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-[1.3fr_1fr_1.4fr]">
          {/* Logo + descrição + redes sociais */}
          <div>
            <Image src="/logo.png" alt="MembersFlix" width={160} height={32} className="h-7 w-auto object-contain" />
            {/* Descrição/tagline curta (pedido explícito, item 10) —
                placeholder profissional genérico, ajustável depois. */}
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-400">
              A plataforma de área de membros para você acessar cursos gravados, evoluir no seu ritmo e aprender com quem já chegou lá.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {redesSociais.map(({ nome, Icone, href }) => (
                <a
                  key={nome}
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  aria-label={nome}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Icone size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Coluna "Institucional" (item 12) — âncoras pra dentro da
              própria página, mesma navegação por scroll suave do header. */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">Institucional</h3>
            <ul className="space-y-2.5">
              {ITENS_MENU_FOOTER.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      irParaSecao(item.id);
                    }}
                    className="text-sm text-gray-400 transition-colors hover:text-primary"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Coluna "Cursos" — categorias REAIS (mesma tabela do filtro da
              área de membros, ver comentário do componente acima),
              divididas em 2 sub-colunas (item 12). */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">Cursos</h3>
            {categorias.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma categoria cadastrada ainda.</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-4">
                {[colunaCursos1, colunaCursos2].map((coluna, i) => (
                  <ul key={i} className="space-y-2.5">
                    {coluna.map((cat) => (
                      <li key={cat.id}>
                        <Link href={hrefCategoria(cat.nome)} className="text-sm text-gray-400 transition-colors hover:text-primary">
                          {cat.nome}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Linha final (item 11): copyright à esquerda, links legais à
            direita — todos pra /politicas com âncora própria. */}
        <div className="mt-12 flex flex-col items-center gap-4 border-t border-white/10 pt-6 text-xs text-gray-500 sm:flex-row sm:justify-between">
          <p>© 2026 MembersFlix. Todos os direitos reservados.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {LINKS_LEGAIS.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-primary">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  );
}
