'use client';

import { useId, useRef, useState } from 'react';
import { Upload } from 'lucide-react';

/**
 * Campo de imagem com upload direto (reaproveita o mesmo padrão do Banner
 * Institucional em Configurações): botão "Escolher imagem" sobe o arquivo
 * via `onUpload` e preenche `value` automaticamente com a URL retornada.
 * Mantém também um campo de texto pra colar uma URL manualmente (útil pra
 * reaproveitar um link já existente sem subir de novo).
 */
export default function ImageUploadField({
  label,
  hint,
  value,
  onChange,
  onUpload,
  aspectClassName = 'aspect-video',
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  onUpload: (arquivo: File) => Promise<string>;
  aspectClassName?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(value);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSelecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setErro(null);
    setPreview(URL.createObjectURL(arquivo));
    setEnviando(true);
    try {
      const url = await onUpload(arquivo);
      onChange(url);
      setPreview(url);
    } catch (err: any) {
      setErro(err.message ?? 'Erro ao enviar a imagem.');
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-on-variant">{label}</label>

      {preview && (
        <div className={`relative mb-2 w-full overflow-hidden rounded bg-surface-lowest ${aspectClassName}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={label} className="h-full w-full object-cover" />
        </div>
      )}

      <div className="flex items-center gap-2">
        <input ref={inputRef} type="file" accept="image/*" onChange={handleSelecionarArquivo} className="hidden" id={inputId} />
        <label htmlFor={inputId} className="btn-secondary cursor-pointer py-1.5 text-xs">
          <span className="flex items-center gap-1.5">
            <Upload size={14} /> Escolher imagem
          </span>
        </label>
        {enviando && <span className="text-xs text-on-variant">Enviando...</span>}
      </div>

      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setPreview(e.target.value);
        }}
        placeholder="ou cole uma URL"
        className="input-field mt-2 py-1.5 text-xs"
      />

      {hint && <p className="mt-1 text-xs text-on-variant">{hint}</p>}
      {erro && <p className="mt-1 text-xs text-error">{erro}</p>}
    </div>
  );
}
