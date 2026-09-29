import type { Config } from 'tailwindcss';

const config: Config = {
  // 'class' (era o padrão 'media', baseado só em prefers-color-scheme) —
  // necessário pro next-themes controlar o tema via classe no <html>
  // (ThemeProvider attribute="class", ver app/layout.tsx). Só afeta quem
  // realmente usa o prefixo `dark:` — hoje só a landing institucional
  // (components/institucional/LandingPageClient.tsx); o resto do app
  // (login, área de membros, admin) é tema escuro fixo via cores próprias
  // (bg-background, bg-card etc.), nunca usou `dark:`, e continua igual.
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#131313',
          dim: '#131313',
          bright: '#3a3939',
          lowest: '#0e0e0e',
          low: '#1c1b1b',
          container: '#201f1f',
          high: '#2a2a2a',
          highest: '#353534',
        },
        // var(--background) (era #0f0f0f fixo — pedido explícito desta
        // tarefa: "centralize a cor em uma variável CSS... faça o token
        // do Tailwind apontar pra essa variável", ver app/globals.css
        // `:root`). Mesmo valor (#0e0e0e) agora usado por html/body
        // (globals.css) E pela landing institucional (`dark:bg-background`,
        // LandingPageClient.tsx) — uma fonte única pro fundo escuro do
        // site inteiro, em vez de 3 hex quase-iguais espalhados.
        background: 'var(--background)',
        card: '#1c1c1c',
        border: '#333333',
        on: {
          surface: '#e5e2e1',
          variant: '#a0a0a0',
        },
        primary: {
          DEFAULT: '#e50914',
          hover: '#b0060f',
          on: '#fff7f6',
          container: '#e50914',
        },
        secondary: {
          DEFAULT: '#c8c6c5',
          container: '#474746',
        },
        outline: '#af8782',
        error: '#ffb4ab',
      },
      fontFamily: {
        // var(--font-poppins): a custom property que next/font gera em
        // app/layout.tsx — mesma fonte referenciada em app/globals.css
        // (regra `body`), então `font-sans`/o preflight do Tailwind e o
        // `body` explícito nunca ficam dessincronizados.
        sans: ['var(--font-poppins)', 'sans-serif'],
      },
      fontWeight: {
        // Redefine o PESO que `font-bold` aplica (era 700, o padrão do
        // Tailwind) — não troca o nome da classe. Feito aqui em vez de
        // trocar `font-bold` por `font-semibold` em cada um dos ~20
        // arquivos que já usam a classe hoje: fonte única de verdade, sem
        // risco de esquecer alguma ocorrência (inclusive as que ficam
        // dentro de template strings condicionais, tipo `${ativo ?
        // 'font-bold' : ...}`, que um find/replace no código poderia não
        // pegar direito). Qualquer `font-bold` novo que alguém escrever
        // depois também já nasce com 600, sem precisar lembrar da regra.
        bold: '600',
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
      },
      spacing: {
        18: '4.5rem',
      },
      boxShadow: {
        overlay: '0px 8px 24px rgba(0,0,0,0.15)',
      },
      // Cursor "|" piscando do efeito de digitação do hero (HeroSection.tsx)
      // — animation-iteration-count infinite, step-end (não fade suave):
      // um cursor de terminal pisca ligado/desligado, não esmaece.
      keyframes: {
        blink: { '0%, 49%': { opacity: '1' }, '50%, 100%': { opacity: '0' } },
      },
      animation: {
        blink: 'blink 1s step-end infinite',
      },
    },
  },
  plugins: [],
};

export default config;
