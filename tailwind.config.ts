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
        sans: ['Inter', 'sans-serif'],
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
