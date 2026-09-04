import { createClient } from '@/lib/supabase/server';
import ConfiguracoesForm from '@/components/admin/ConfiguracoesForm';

export default async function ConfiguracoesPage() {
  const supabase = createClient();
  const { data: config } = await supabase
    .from('configuracoes')
    .select(
      'numero_whatsapp, banner_plataforma_url, desenvolvido_por, email_contato, telefone_contato, termos_uso_url, banner_capa_url, banner_badge, banner_resumo, hero_destaque_url'
    )
    .eq('id', 1)
    .maybeSingle();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white">Configurações da Plataforma</h1>
      <p className="mb-6 text-sm text-on-variant">Gerencie integrações, comunicações e preferências do sistema.</p>

      <div className="max-w-xl">
<ConfiguracoesForm
          numeroAtual={(config as any)?.numero_whatsapp ?? ''}
          bannerAtual={(config as any)?.banner_plataforma_url ?? null}
          rodapeLoginAtual={{
            desenvolvido_por: (config as any)?.desenvolvido_por ?? '',
            email_contato: (config as any)?.email_contato ?? '',
            telefone_contato: (config as any)?.telefone_contato ?? '',
            termos_uso_url: (config as any)?.termos_uso_url ?? '',
          }}
          bannerHomeAtual={{
            banner_capa_url: (config as any)?.banner_capa_url ?? null,
            banner_badge: (config as any)?.banner_badge ?? '',
            banner_resumo: (config as any)?.banner_resumo ?? '',
          }}
          heroDestaqueAtual={(config as any)?.hero_destaque_url ?? null}
        />
      </div>
    </div>
  );
}
