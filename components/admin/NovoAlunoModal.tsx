'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { criarAluno } from '@/app/admin/alunos/actions';
import type { Curso } from '@/types';

function gerarSenha() {
  return Math.random().toString(36).slice(-10) + 'A1!';
}

export default function NovoAlunoModal({ open, onClose, cursos }: { open: boolean; onClose: () => void; cursos: Curso[] }) {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState(gerarSenha());
  const [cursoIds, setCursoIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function toggleCurso(id: string) {
    setCursoIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function resetAndClose() {
    setNome('');
    setEmail('');
    setTelefone('');
    setSenha(gerarSenha());
    setCursoIds([]);
    setErro(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      await criarAluno({ nome, email, senha, telefone, cursoIds });
      router.refresh();
      resetAndClose();
    } catch (err: any) {
      setErro(err.message ?? 'Erro ao criar aluno.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={resetAndClose} title="Novo Aluno" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-on-variant">Nome</label>
          <input required value={nome} onChange={(e) => setNome(e.target.value)} className="input-field" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-on-variant">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-on-variant">Telefone</label>
            <input value={telefone} onChange={(e) => setTelefone(e.target.value)} className="input-field" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-on-variant">Senha inicial</label>
          <input
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="input-field font-mono"
          />
          <p className="mt-1 text-xs text-on-variant">Envie essa senha ao aluno pelo WhatsApp após o cadastro.</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-on-variant">Cursos liberados</label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded border border-border bg-surface-lowest p-2">
            {cursos.length === 0 && <p className="p-2 text-xs text-on-variant">Nenhum curso cadastrado.</p>}
            {cursos.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-high">
                <input
                  type="checkbox"
                  checked={cursoIds.includes(c.id)}
                  onChange={() => toggleCurso(c.id)}
                  className="h-4 w-4 rounded border-border bg-card accent-primary"
                />
                {c.titulo}
              </label>
            ))}
          </div>
        </div>

        {erro && <p className="text-sm text-error">{erro}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={resetAndClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : 'Cadastrar Aluno'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
