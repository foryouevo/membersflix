'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
      setErro('Email ou senha inválidos.');
      setLoading(false);
      return;
    }

    router.replace('/');
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect width=%22100%22 height=%22100%22 fill=%22%230f0f0f%22/></svg>')",
        }}
      />

      <header className="relative z-10 px-6 py-6 sm:px-16">
        <Image src="/logo.png" alt="MembersFlix" width={180} height={36} priority className="h-8 w-auto object-contain" />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md rounded-lg border-t-2 border-t-primary bg-card p-8 shadow-overlay">
          <h1 className="mb-6 text-2xl font-bold text-white">Entrar</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              autoComplete="email"
            />
            <input
              type="password"
              required
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="input-field"
              autoComplete="current-password"
            />

            {erro && <p className="text-sm text-error">{erro}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <div className="flex items-center justify-between pt-1 text-sm">
              <label className="flex items-center gap-2 text-on-variant">
                <input
                  type="checkbox"
                  checked={lembrar}
                  onChange={(e) => setLembrar(e.target.checked)}
                  className="h-4 w-4 rounded border-border bg-card accent-primary"
                />
                Lembrar-me
              </label>
              <a href="#" className="text-on-variant hover:text-white">
                Precisa de ajuda?
              </a>
            </div>
          </form>
        </div>
      </main>

      <footer className="relative z-10 flex flex-col items-center justify-between gap-2 border-t border-border/50 px-6 py-4 text-xs text-on-variant sm:flex-row sm:px-16">
        <span>Dúvidas? Ligue para 0800 123 4567</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white">
            Termos de Uso
          </a>
          <a href="#" className="hover:text-white">
            Privacidade
          </a>
        </div>
      </footer>
    </div>
  );
}
