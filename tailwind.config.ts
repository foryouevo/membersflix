import type { Config } from 'tailwindcss';

const config: Config = {
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
        background: '#0f0f0f',
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
    },
  },
  plugins: [],
};

export default config;
