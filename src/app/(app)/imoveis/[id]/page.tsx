import { createClient } from "@/lib/supabase/server";
import { getFeriados } from "@/lib/feriados";
import { Calendario } from "@/components/calendario/calendario";
import { AluguelInfo } from "@/components/aluguel-info";
import { PagamentosTable } from "@/components/pagamentos-table";
import { HistoricoAlugueis } from "@/components/historico-alugueis";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Imovel, AluguelComInquilino, Pagamento } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ImovelPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch imovel
  const { data: imovel } = await supabase
    .from("imoveis")
    .select("*")
    .eq("id", id)
    .single();

  if (!imovel) {
    notFound();
  }

  const typedImovel = imovel as Imovel;

  // Fetch active aluguel with inquilino
  const { data: aluguelAtivoData } = await supabase
    .from("alugueis")
    .select("*, inquilino:inquilinos(*)")
    .eq("imovel_id", id)
    .eq("status", "ativo")
    .single();

  const aluguelAtivo = aluguelAtivoData as AluguelComInquilino | null;

  // Fetch pagamentos for active aluguel
  let pagamentos: Pagamento[] = [];
  if (aluguelAtivo) {
    const { data: pagData } = await supabase
      .from("pagamentos")
      .select("*")
      .eq("aluguel_id", aluguelAtivo.id)
      .order("mes_referencia");

    pagamentos = (pagData as Pagamento[]) ?? [];
  }

  // Fetch historical alugueis
  const { data: historicoData } = await supabase
    .from("alugueis")
    .select("*, inquilino:inquilinos(*)")
    .eq("imovel_id", id)
    .neq("status", "ativo")
    .order("data_inicio", { ascending: false });

  const historico = (historicoData as AluguelComInquilino[]) ?? [];

  // Get feriados for current year
  const feriados = getFeriados(new Date().getFullYear());

  // Build alugueis data for calendar
  const calendarAlugueis = [];
  if (aluguelAtivo) {
    calendarAlugueis.push({
      data_inicio: aluguelAtivo.data_inicio,
      data_fim: aluguelAtivo.data_fim,
      tipo: aluguelAtivo.tipo,
      pagamentos: pagamentos.map((p) => ({
        mes_referencia: p.mes_referencia,
        pago: p.pago,
      })),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{typedImovel.nome}</h2>
        <Link href={`/imoveis/${id}/novo-aluguel`}>
          <Button>Novo Aluguel</Button>
        </Link>
      </div>

      {typedImovel.descricao && (
        <p className="text-muted-foreground">{typedImovel.descricao}</p>
      )}

      <Calendario alugueis={calendarAlugueis} feriados={feriados} />

      <Separator />

      {aluguelAtivo ? (
        <div className="space-y-6">
          <AluguelInfo aluguel={aluguelAtivo} />
          <PagamentosTable
            pagamentos={pagamentos}
            aluguelTipo={aluguelAtivo.tipo}
            aluguelValorSinal={aluguelAtivo.valor_sinal}
            imovelId={id}
          />
        </div>
      ) : (
        <div className="text-center py-8 space-y-4">
          <p className="text-muted-foreground text-lg">Nenhum aluguel ativo</p>
          <Link href={`/imoveis/${id}/novo-aluguel`}>
            <Button size="lg">Novo Aluguel</Button>
          </Link>
        </div>
      )}

      <Separator />

      <HistoricoAlugueis alugueis={historico} />
    </div>
  );
}
