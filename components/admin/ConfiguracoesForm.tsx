'use client';

import { useRef, useState } from 'react';
import { MessageCircle, Save, Image as ImageIcon, Upload } from 'lucide-react';
import { salvarNumeroWhatsapp, uploadBannerPlataforma } from '@/app/admin/configuracoes/actions';

export default function ConfiguracoesForm({
  numeroAtual,
  bannerAtual,
}: {
  numeroAtual: string;
  bannerAtual: string | null;
}) {
  const [numero, setNumero] = useState(numeroAtual);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setSalvo(false);
    await salvarNumeroWhatsapp(numero);
    setSalvando(false);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-card p-6">
        <div className="mb-4 flex items-center gap-2 text-primary">
          <MessageCircle size={18} />
          <h2 className="font-semibold text-white">Integração com WhatsApp</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          <label className="block text-xs font-medium text-primary">Número de Suporte</label>
          <input
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="+55 (11) 99999-9999"
            className="input-field"
          />
          <p className="text-xs text-on-variant">
            Este número será usado em todos os links de liberação de acesso enviados aos alunos.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={salvando} className="btn-primary flex items-center gap-2">
              <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar Configuração'}
            </button>
            {salvo && <span className="text-sm text-primary">Configuração salva.</span>}
          </div>
        </form>
      </div>

      <BannerPlataformaCard bannerAtual={bannerAtual} />
    </div>
  );
}

function BannerPlataformaCard({ bannerAtual }: { bannerAtual: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(bannerAtual);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function handleSelecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0] ?? null;
    setArquivoSelecionado(arquivo);
    setErro(null);
    setEnviado(false);
    if (arquivo) setPreview(URL.createObjectURL(arquivo));
  }

  async function handleUpload() {
    if (!arquivoSelecionado) return;
    setEnviando(true);
    setErro(null);
    try {
      const formData = new FormData();
      formData.set('arquivo', arquivoSelecionado);
      const url = await uploadBannerPlataforma(formData);
      setPreview(url);
      setArquivoSelecionado(null);
      if (inputRef.current) inputRef.current.value = '';
      setEnviado(true);
      setTimeout(() => setEnviado(false), 2500);
    } catch (err: any) {
      setErro(err.message ?? 'Erro ao enviar a imagem.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="rounded-lg bg-card p-6">
      <div className="mb-4 flex items-center gap-2 text-primary">
        <ImageIcon size={18} />
        <h2 className="font-semibold text-white">Banner Institucional</h2>
      </div>

      <p className="mb-3 text-xs text-on-variant">
        Imagem fixa exibida no topo da Home dos alunos, antes do banner do curso em destaque. Formato widescreen
        (recomendado 1600×700px), sem texto ou botões sobrepostos — use uma imagem que já traga a identidade da
        plataforma.
      </p>

      {preview && (
        <div className="mb-4 aspect-[16/6] w-full overflow-hidden rounded bg-surface-lowest">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Prévia do banner institucional" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input ref={inputRef} type="file" accept="image/*" onChange={handleSelecionarArquivo} className="hidden" id="banner-plataforma-input" />
        <label htmlFor="banner-plataforma-input" className="btn-secondary cursor-pointer">
          Escolher imagem
        </label>
        <button
          type="button"
          onClick={handleUpload}
          disabled={!arquivoSelecionado || enviando}
          className="btn-primary flex items-center gap-2"
        >
          <Upload size={16} /> {enviando ? 'Enviando...' : 'Enviar Banner'}
        </button>
        {enviado && <span className="text-sm text-primary">Banner atualizado.</span>}
      </div>

      {erro && <p className="mt-2 text-sm text-error">{erro}</p>}
    </div>
  );
}
