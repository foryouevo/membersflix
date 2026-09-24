import Image from 'next/image';
import Link from 'next/link';
import { Instagram, Facebook, Youtube } from 'lucide-react';

// Redes sociais — placeholder (pedido explícito: "deixe como placeholder
// por enquanto, vou te passar os links reais depois"). href="#" temporário
// em todos; trocar por link real de cada rede quando vier.
const REDES_SOCIAIS = [
  { nome: 'Instagram', Icone: Instagram, href: '#' },
  { nome: 'Facebook', Icone: Facebook, href: '#' },
  { nome: 'YouTube', Icone: Youtube, href: '#' },
] as const;

const COLUNAS_LINKS = [
  {
    titulo: 'Institucional',
    links: [
      { label: 'Suporte', href: '/suporte' },
      { label: 'Política de Privacidade', href: '/politicas' },
    ],
  },
  {
    titulo: 'Legal',
    links: [{ label: 'Termos de Uso', href: '/termos' }],
  },
] as const;

/**
 * Footer da landing institucional (/) — pedido explícito desta tarefa.
 * Tema escuro fixo (bg-black), independente do toggle light/dark do resto
 * da landing: mesma decisão visual que o resto do app (área de membros)
 * já usa — um footer institucional sóbrio/escuro combina com a identidade
 * da marca em qualquer tema que a pessoa tenha escolhido pra navegar a
 * página, e evita ficar claro/estranho junto do restante quase sempre
 * escuro do produto.
 */
export default function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-black px-6 py-12 text-gray-400 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-[1.2fr_1fr_1fr]">
          {/* Logo + redes sociais */}
          <div>
            <Image src="/logo.png" alt="MembersFlix" width={160} height={32} className="h-7 w-auto object-contain" />
            <div className="mt-5 flex items-center gap-3">
              {REDES_SOCIAIS.map(({ nome, Icone, href }) => (
                <a
                  key={nome}
                  href={href}
                  aria-label={nome}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Icone size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Colunas de links */}
          {COLUNAS_LINKS.map((coluna) => (
            <div key={coluna.titulo}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">{coluna.titulo}</h3>
              <ul className="space-y-2.5">
                {coluna.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-gray-400 transition-colors hover:text-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Copyright — sem CNPJ por enquanto (pedido explícito), ano fixo em
            2026 (não Date().getFullYear(): o ano informado no pedido é o
            ano corrente do projeto, não precisa recalcular sozinho — se
            vocês quiserem que atualize automaticamente ano após ano, é só
            trocar por new Date().getFullYear() depois). */}
        <div className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-gray-500">
          © 2026 MembersFlix. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
