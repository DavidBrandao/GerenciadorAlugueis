import { createClient } from "@/lib/supabase/server";
import type { Imovel, Pagamento } from "@/lib/types";
import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch all imoveis
  const { data: imoveisData } = await supabase
    .from("imoveis")
    .select("*")
    .order("nome");

  const imoveis = (imoveisData as Imovel[]) ?? [];

  // Fetch all alugueis
  const { data: alugueisData } = await supabase
    .from("alugueis")
    .select("id, imovel_id, status");

  const aluguelIds = alugueisData?.map((a) => a.id) ?? [];
  const aluguelMap: Record<string, { imovel_id: string; status: string }> = {};
  alugueisData?.forEach((a) => {
    aluguelMap[a.id] = { imovel_id: a.imovel_id, status: a.status };
  });

  let pagamentos: (Pagamento & { imovel_id: string; aluguel_status: string })[] = [];
  if (aluguelIds.length > 0) {
    const { data: pagData } = await supabase
      .from("pagamentos")
      .select("*")
      .in("aluguel_id", aluguelIds)
      .order("mes_referencia");

    pagamentos = ((pagData as Pagamento[]) ?? []).map((p) => ({
      ...p,
      imovel_id: aluguelMap[p.aluguel_id]?.imovel_id ?? "",
      aluguel_status: aluguelMap[p.aluguel_id]?.status ?? "",
    }));
  }

  return <DashboardClient imoveis={imoveis} pagamentos={pagamentos} />;
}
