'use client';

import Link from 'next/link';
import { Instagram, Facebook, MessageCircle, Mail, Phone, ChevronRight } from 'lucide-react';
import { buildSupportWhatsappLink, slugify, cn } from '@/lib/utils';
import Container from '@/components/institucional/Container';
import BrandLogo from '@/components/institucional/BrandLogo';

// Redes sociais (Instagram/Facebook/WhatsApp). Instagram e Facebook são
// PLACEHOLDER de verdade (href="#") — não existe link real cadastrado em
// lugar nenhum do projeto pra essas duas, avisado no resumo final.
// WhatsApp NÃO é placeholder: usa o MESMO `configuracoes.numero_whatsapp`
// já usado em todo o resto da plataforma (montado logo abaixo, via
// buildSupportWhatsappLink) — MESMA fonte reaproveitada pro telefone do
// bloco de contato, mais abaixo (pedido explícito desta tarefa: "procure
// se já existe um número configurado e reutilize"). Ícone do WhatsApp:
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

// Os três links legais, todos pra /politicas com uma âncora própria — a
// página tem uma seção por âncora (ver app/politicas/page.tsx). Voltaram
// pra linha final nesta tarefa (item 3 — tinham virado uma coluna própria
// numa tarefa anterior; a coluna "Legal" saiu de novo, só restaram as duas
// de menu: Navegação/Cursos), agora no canto DIREITO da barra, ao lado do
// copyright (pedido explícito).
const LINKS_LEGAIS = [
  { label: 'Termos de Uso', href: '/politicas#termos-de-uso' },
  { label: 'Política de Privacidade', href: '/politicas#politica-de-privacidade' },
  { label: 'Política de Cookies', href: '/politicas#politica-de-cookies' },
] as const;

// Classe repetida em TODO link do footer — cor de destaque vermelha (mesma
// dos botões) no hover, com transition-colors explícito de 200ms (era o
// padrão implícito do Tailwind, 150ms).
const LINK_HOVER = 'transition-colors duration-200 hover:text-primary';

// Título pequeno em caixa alta/cinza de cada coluna/seção (estilo
// "NAVEGAÇÃO"/"CURSOS"/"CONTATO"/"REDES SOCIAIS") — extraído do componente
// (era só usado nas colunas) porque esta tarefa reaproveita o MESMO estilo
// também dentro do bloco de marca, pra "Contato" e "Redes Sociais".
function TituloColuna({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('text-xs font-semibold uppercase tracking-widest text-gray-500', className)}>{children}</h3>;
}

/**
 * Link de coluna (Navegação/Cursos) com o efeito de hover pedido nesta
 * tarefa: no estado normal o texto começa exatamente na borda esquerda da
 * coluna, alinhado com o título ("NAVEGAÇÃO"/"CURSOS") — SEM padding-left
 * nem espaço reservado pra seta (era `pl-4` fixo numa tarefa anterior, bug
 * relatado: desalinhava o texto do título da coluna).
 *
 * No hover: o TEXTO desliza ~14-16px pra direita (`group-hover:translate-x-4`
 * no `<span>` interno, via transform — não empurra irmãos, não causa pulo
 * de layout) e fica vermelho (herdado de LINK_HOVER, no `<Link>` pai); a
 * seta (ChevronRight) nasce `absolute left-0` no espaço que o texto acabou
 * de abrir, indo de opacity-0/-translate-x-2 pra opacity-100/translate-x-0.
 * `inline-flex` (não `flex` bloco inteiro): a área de hover fica do
 * tamanho do texto, não da coluna inteira.
 */
function LinkComSeta({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <Link href={href} onClick={onClick} className={cn('group relative inline-flex items-center text-sm text-gray-600 dark:text-gray-400', LINK_HOVER)}>
      <ChevronRight
        size={14}
        className="absolute left-0 -translate-x-2 text-primary opacity-0 transition-all duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100"
      />
      <span className="transition-transform duration-200 ease-out group-hover:translate-x-4">{children}</span>
    </Link>
  );
}

/**
 * Footer da landing institucional (/) — segue o tema claro/escuro da
 * página (bg/texto via `dark:`, mesma estratégia de LandingHeader.tsx).
 * Logo: mesmo problema/mesma solução do header (BrandLogo.tsx — chip
 * escuro atrás só no tema claro, já que é uma imagem raster com texto
 * branco, não pinta com classe de texto).
 *
 * Layout (pedido explícito desta tarefa): SÓ DUAS colunas de navegação à
 * esquerda (Navegação/Cursos — a coluna "Legal", de uma tarefa anterior,
 * saiu daqui) + bloco de marca (logo, descrição, contato, redes sociais) à
 * direita, mais largo agora que só sobram 2 colunas à esquerda. Os links
 * legais voltaram pra linha final, agora no canto DIREITO (ao lado do
 * copyright, que fica à esquerda) — empilham abaixo do copyright no
 * mobile. Grid empilha em 1 coluna no mobile, na MESMA ordem do DOM
 * (navegação primeiro, bloco de marca por último), sem precisar de nenhuma
 * classe `order-*` extra.
 *
 * `logado`/`categorias`: pra montar os links da coluna "Cursos" — clicar
 * numa categoria leva pra `/cursos/buscar?categoria=<slug>` (MESMA rota/
 * parâmetro que o filtro de categoria da área de membros já usa, ver
 * Header.tsx) se `logado`, ou pro cadastro (`/login?form=cadastro`) se
 * não — `/cursos/buscar` é rota protegida (middleware.ts: prefixo
 * `/cursos`), então um clique deslogado cairia direto no /login genérico
 * de qualquer forma; resolver aqui evita esse "pulo" e já manda direto
 * pro cadastro.
 *
 * `emailContato`: mesma coluna `configuracoes.email_contato` já usada no
 * rodapé da tela de login (app/login/page.tsx) — reaproveitada aqui pro
 * bloco "Contato", nenhum e-mail inventado. `numeroWhatsapp`: mesma coluna
 * já usada pro ícone de WhatsApp/suporte flutuante — reaproveitada também
 * pra linha de telefone do bloco "Contato" (pedido explícito: reutilizar a
 * mesma fonte em vez de um número novo).
 */
export default function LandingFooter({
  logado,
  categorias,
  numeroWhatsapp,
  emailContato,
}: {
  logado: boolean;
  categorias: { id: string; nome: string }[];
  numeroWhatsapp: string | null;
  emailContato: string | null;
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

  // Divide as categorias em 2 sub-colunas lado a lado ("como são várias,
  // divida em 2 sub-colunas") — metade em cada, a primeira sub-coluna leva
  // 1 a mais quando o total é ímpar.
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
    // rounded-t-[2rem]: bordas de cima arredondadas — só de cima, o footer
    // é sempre o último elemento da página, então o "chão" dele não
    // precisa (nem deveria) ser arredondado.
    <footer className="rounded-t-[2rem] border-t border-black/5 bg-gray-50 py-12 text-gray-600 dark:border-white/10 dark:bg-black dark:text-gray-400">
      <Container>
        {/* SÓ 2 colunas de navegação agora (era 3 — Legal saiu, ver
            comentário do componente); Cursos ganhou mais espaço (2fr, era
            1fr) com a largura que sobrou. */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_2fr_1.3fr]">
          {/* Coluna "Navegação" — âncoras pra dentro da própria página,
              mesma navegação por scroll suave do header. */}
          <div>
            <TituloColuna className="mb-4">Navegação</TituloColuna>
            <ul className="space-y-2.5">
              {ITENS_MENU_FOOTER.map((item) => (
                <li key={item.id}>
                  <LinkComSeta
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      irParaSecao(item.id);
                    }}
                  >
                    {item.label}
                  </LinkComSeta>
                </li>
              ))}
            </ul>
          </div>

          {/* Coluna "Cursos" — categorias REAIS (mesma tabela do filtro da
              área de membros, ver comentário do componente acima),
              divididas em 2 sub-colunas. gap-x-8 (era gap-x-4 — bug
              relatado nesta tarefa: nomes de categoria mais longos, que
              quebram em 2 linhas, ficavam colados/sobrepostos na
              sub-coluna vizinha com só 1rem de respiro entre elas). */}
          <div>
            <TituloColuna className="mb-4">Cursos</TituloColuna>
            {categorias.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma categoria cadastrada ainda.</p>
            ) : (
              <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
                {[colunaCursos1, colunaCursos2].map((coluna, i) => (
                  <ul key={i} className="space-y-2.5">
                    {coluna.map((cat) => (
                      <li key={cat.id}>
                        <LinkComSeta href={hrefCategoria(cat.nome)}>{cat.nome}</LinkComSeta>
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            )}
          </div>

          {/* Bloco de marca — logo + descrição + contato + redes sociais,
              do lado direito no desktop, por último no mobile. Ordem
              pedida explicitamente nesta tarefa: logo -> descrição ->
              (respiro maior) -> "Contato" (e-mail, depois telefone) ->
              (respiro) -> "Redes Sociais" -> ícones. */}
          <div>
            <BrandLogo imgClassName="h-7" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              A plataforma de área de membros para você acessar cursos gravados, evoluir no seu ritmo e aprender com quem já chegou lá.
            </p>

            {/* mt-8 (era mt-4/-mt-2 sem respiro nenhum — bug relatado: o
                título "Contato" ficava colado na descrição de cima). */}
            <TituloColuna className="mb-3 mt-8">Contato</TituloColuna>
            <div className="space-y-2">
              {emailContato ? (
                <a href={`mailto:${emailContato}`} className={cn('flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400', LINK_HOVER)}>
                  <Mail size={15} className="shrink-0" />
                  {emailContato}
                </a>
              ) : (
                <p className="flex items-center gap-2 text-sm text-gray-500">
                  <Mail size={15} className="shrink-0" />
                  E-mail de contato não configurado.
                </p>
              )}
              {/* Telefone/WhatsApp — MESMO número já configurado em
                  `configuracoes.numero_whatsapp` (reaproveitado, não um
                  novo inventado aqui — ver comentário do componente),
                  logo abaixo do e-mail (pedido explícito). */}
              {numeroWhatsapp ? (
                <a href={whatsappLink!} target="_blank" rel="noopener noreferrer" className={cn('flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400', LINK_HOVER)}>
                  <Phone size={15} className="shrink-0" />
                  {numeroWhatsapp}
                </a>
              ) : (
                <p className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone size={15} className="shrink-0" />
                  Telefone de contato não configurado.
                </p>
              )}
            </div>

            <TituloColuna className="mb-3 mt-6">Redes Sociais</TituloColuna>
            <div className="flex items-center gap-3">
              {redesSociais.map(({ nome, Icone, href }) => (
                <a
                  key={nome}
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  aria-label={nome}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-gray-600 transition-all duration-200 hover:scale-110 hover:bg-primary hover:text-white dark:bg-white/5 dark:text-gray-400"
                >
                  <Icone size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Linha final — copyright à esquerda, links legais à direita.
            Empilha (copyright primeiro, depois os links) no mobile.
            text-[13px] (pedido explícito desta tarefa — era text-sm/14px):
            reduzido só um pouco, sem voltar ao text-xs/12px original. */}
        <div className="mt-12 flex flex-col items-center gap-4 border-t border-black/5 pt-6 dark:border-white/10 sm:flex-row sm:justify-between">
          <p className="text-[13px] text-gray-500">© 2026 MembersFlix. Todos os direitos reservados.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {LINKS_LEGAIS.map((link) => (
              <Link key={link.href} href={link.href} className={cn('text-[13px] text-gray-500', LINK_HOVER)}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  );
}
