import { createClient } from '@/lib/supabase/server';
import ConfiguracoesForm from '@/components/admin/ConfiguracoesForm';

export default async function ConfiguracoesPage() {
  const supabase = createClient();
  const { data: config } = await supabase
    .from('configuracoes')
    .select('numero_whatsapp, banner_plataforma_url')
    .eq('id', 1)
    .maybeSingle();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white">Configurações da Plataforma</h1>
      <p className="mb-6 text-sm text-on-variant">Gerencie integrações, comunicações e preferências do sistema.</p>

      <div className="max-w-xl">
        <ConfiguracoesForm numeroAtual={config?.numero_whatsapp ?? ''} bannerAtual={config?.banner_plataforma_url ?? null} />
      </div>
    </div>
  );
}
