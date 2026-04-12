import { createClient } from "@/lib/supabase/server";
import { ImovelCard } from "@/components/imovel-card";
import type { Imovel, AluguelComInquilino } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: imoveis } = await supabase
    .from("imoveis")
    .select("*")
    .order("nome");

  const { data: alugueis } = await supabase
    .from("alugueis")
    .select("*, inquilino:inquilinos(*)")
    .eq("status", "ativo");

  const aluguelPorImovel = new Map<string, AluguelComInquilino>();
  alugueis?.forEach((a: AluguelComInquilino) => {
    aluguelPorImovel.set(a.imovel_id, a);
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Imoveis</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(imoveis as Imovel[])?.map((imovel) => (
          <ImovelCard
            key={imovel.id}
            imovel={imovel}
            aluguelAtivo={aluguelPorImovel.get(imovel.id) ?? null}
          />
        ))}
      </div>
    </div>
  );
}
