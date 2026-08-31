'use client';

import { useRef, useState } from 'react';
import { MessageCircle, Save, Image as ImageIcon, Upload, LayoutTemplate } from 'lucide-react';
import {
  salvarNumeroWhatsapp,
  salvarRodapeLogin,
  salvarBannerHomeTexto,
  uploadBannerPlataforma,
  uploadBannerHomeCapa,
} from '@/app/admin/configuracoes/actions';

export default function ConfiguracoesForm({
  numeroAtual,
  bannerAtual,
  rodapeLoginAtual,
  bannerHomeAtual,
}: {
  numeroAtual: string;
  bannerAtual: string | null;
  rodapeLoginAtual: {
    desenvolvido_por: string;
    email_contato: string;
    telefone_contato: string;
    termos_uso_url: string;
  };
  bannerHomeAtual: {
    banner_capa_url: string | null;
    banner_badge: string;
    banner_resumo: string;
  };
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

      <BannerHomeCard bannerHomeAtual={bannerHomeAtual} />
      <BannerPlataformaCard bannerAtual={bannerAtual} />
      <RodapeLoginCard rodapeAtual={rodapeLoginAtual} />
    </div>
  );
}

function RodapeLoginCard({
  rodapeAtual,
}: {
  rodapeAtual: { desenvolvido_por: string; email_contato: string; telefone_contato: string; termos_uso_url: string };
}) {
  const [desenvolvidoPor, setDesenvolvidoPor] = useState(rodapeAtual.desenvolvido_por);
  const [emailContato, setEmailContato] = useState(rodapeAtual.email_contato);
  const [telefoneContato, setTelefoneContato] = useState(rodapeAtual.telefone_contato);
  const [termosUsoUrl, setTermosUsoUrl] = useState(rodapeAtual.termos_uso_url);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setSalvo(false);
    await salvarRodapeLogin({
      desenvolvido_por: desenvolvidoPor,
      email_contato: emailContato,
      telefone_contato: telefoneContato,
      termos_uso_url: termosUsoUrl,
    });
    setSalvando(false);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  }

  return (
    <div className="rounded-lg bg-card p-6">
      <div className="mb-4 flex items-center gap-2 text-primary">
        <LayoutTemplate size={18} />
        <h2 className="font-semibold text-white">Rodapé da Tela de Login</h2>
      </div>

      <p className="mb-3 text-xs text-on-variant">
        Exibido fora do card de login, na base da tela. Qualquer campo vazio simplesmente não aparece — não precisa
        preencher todos.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-primary">Texto "desenvolvido por"</label>
          <input
            value={desenvolvidoPor}
            onChange={(e) => setDesenvolvidoPor(e.target.value)}
            placeholder="membersflix.com"
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-primary">Email de contato</label>
          <input
            value={emailContato}
            onChange={(e) => setEmailContato(e.target.value)}
            placeholder="contato@membersflix.com"
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-primary">Telefone de contato</label>
          <input
            value={telefoneContato}
            onChange={(e) => setTelefoneContato(e.target.value)}
            placeholder="(28) 99966-2113"
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-primary">Link dos Termos de Uso</label>
          <input
            value={termosUsoUrl}
            onChange={(e) => setTermosUsoUrl(e.target.value)}
            placeholder="https://membersflix.com/termos"
            className="input-field"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={salvando} className="btn-primary flex items-center gap-2">
            <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar Rodapé'}
          </button>
          {salvo && <span className="text-sm text-primary">Configuração salva.</span>}
        </div>
      </form>
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
        Substituído pelo banner acima ("Banner da Página Inicial") — a Home não exibe mais essa imagem. Deixado aqui
        caso queira reaproveitar o campo/upload em outro lugar futuramente; não precisa preencher.
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

function BannerHomeCard({
  bannerHomeAtual,
}: {
  bannerHomeAtual: { banner_capa_url: string | null; banner_badge: string; banner_resumo: string };
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(bannerHomeAtual.banner_capa_url);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [imagemEnviada, setImagemEnviada] = useState(false);
  const [erroImagem, setErroImagem] = useState<string | null>(null);

  const [badge, setBadge] = useState(bannerHomeAtual.banner_badge);
  const [resumo, setResumo] = useState(bannerHomeAtual.banner_resumo);
  const [salvandoTexto, setSalvandoTexto] = useState(false);
  const [textoSalvo, setTextoSalvo] = useState(false);

  function handleSelecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0] ?? null;
    setArquivoSelecionado(arquivo);
    setErroImagem(null);
    setImagemEnviada(false);
    if (arquivo) setPreview(URL.createObjectURL(arquivo));
  }

  async function handleUploadImagem() {
    if (!arquivoSelecionado) return;
    setEnviandoImagem(true);
    setErroImagem(null);
    try {
      const formData = new FormData();
      formData.set('arquivo', arquivoSelecionado);
      const url = await uploadBannerHomeCapa(formData);
      setPreview(url);
      setArquivoSelecionado(null);
      if (inputRef.current) inputRef.current.value = '';
      setImagemEnviada(true);
      setTimeout(() => setImagemEnviada(false), 2500);
    } catch (err: any) {
      setErroImagem(err.message ?? 'Erro ao enviar a imagem.');
    } finally {
      setEnviandoImagem(false);
    }
  }

  async function handleSubmitTexto(e: React.FormEvent) {
    e.preventDefault();
    setSalvandoTexto(true);
    setTextoSalvo(false);
    await salvarBannerHomeTexto({ banner_badge: badge, banner_resumo: resumo });
    setSalvandoTexto(false);
    setTextoSalvo(true);
    setTimeout(() => setTextoSalvo(false), 2500);
  }

  return (
    <div className="rounded-lg bg-card p-6">
      <div className="mb-4 flex items-center gap-2 text-primary">
        <ImageIcon size={18} />
        <h2 className="font-semibold text-white">Banner da Página Inicial</h2>
      </div>

      <p className="mb-3 text-xs text-on-variant">
        Banner exibido no topo da Home (/membros). O badge, a logo da plataforma e o resumo abaixo são renderizados
        por cima da imagem — envie uma foto de fundo <strong>sem texto embutido</strong>. Qualquer campo de texto
        vazio simplesmente não aparece.
      </p>

      <div className="mb-5">
        <label className="mb-1 block text-xs font-medium text-primary">Capa do banner (16:9)</label>
        {preview && (
          <div className="mb-2 aspect-video w-full overflow-hidden rounded bg-surface-lowest">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Prévia da capa do banner da Home" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleSelecionarArquivo}
            className="hidden"
            id="banner-home-capa-input"
          />
          <label htmlFor="banner-home-capa-input" className="btn-secondary cursor-pointer">
            Escolher imagem
          </label>
          <button
            type="button"
            onClick={handleUploadImagem}
            disabled={!arquivoSelecionado || enviandoImagem}
            className="btn-primary flex items-center gap-2"
          >
            <Upload size={16} /> {enviandoImagem ? 'Enviando...' : 'Enviar Capa'}
          </button>
          {imagemEnviada && <span className="text-sm text-primary">Capa atualizada.</span>}
        </div>
        {erroImagem && <p className="mt-2 text-sm text-error">{erroImagem}</p>}
      </div>

      <form onSubmit={handleSubmitTexto} className="space-y-3 border-t border-border/60 pt-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-primary">Badge</label>
          <input
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            placeholder="Plataforma de Cursos Online"
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-primary">Resumo rápido</label>
          <textarea
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
            placeholder="Seus cursos, todos em um só lugar."
            rows={2}
            className="input-field resize-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={salvandoTexto} className="btn-primary flex items-center gap-2">
            <Save size={16} /> {salvandoTexto ? 'Salvando...' : 'Salvar Textos'}
          </button>
          {textoSalvo && <span className="text-sm text-primary">Textos salvos.</span>}
        </div>
      </form>
    </div>
  );
}
