"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function criarAluguel(imovelId: string, formData: FormData) {
  const supabase = await createClient();

  // Extract form data
  const cpf = formData.get("cpf") as string;
  const nomeCompleto = formData.get("nome_completo") as string;
  const rg = formData.get("rg") as string;
  const endereco = formData.get("endereco") as string;
  const telefone = formData.get("telefone") as string;
  const email = (formData.get("email") as string) || null;
  const tipo = formData.get("tipo") as "mensal" | "temporada";
  const dataInicio = formData.get("data_inicio") as string;
  const dataFim = formData.get("data_fim") as string;
  const valorTotal = parseFloat(formData.get("valor_total") as string);
  const temSinal = formData.get("tem_sinal") === "true";
  const valorSinal = temSinal
    ? parseFloat(formData.get("valor_sinal") as string)
    : null;

  // Find or create inquilino
  let inquilinoId: string;
  const { data: existing } = await supabase
    .from("inquilinos")
    .select("id")
    .eq("cpf", cpf)
    .single();

  if (existing) {
    inquilinoId = existing.id;
  } else {
    const { data: newInquilino } = await supabase
      .from("inquilinos")
      .insert({
        nome_completo: nomeCompleto,
        cpf,
        rg,
        endereco,
        telefone,
        email,
      })
      .select("id")
      .single();
    inquilinoId = newInquilino!.id;
  }

  // Create aluguel
  const { data: aluguel } = await supabase
    .from("alugueis")
    .insert({
      imovel_id: imovelId,
      inquilino_id: inquilinoId,
      tipo,
      data_inicio: dataInicio,
      data_fim: dataFim,
      valor_total: valorTotal,
      valor_sinal: valorSinal,
      sinal_pago: false,
      status: "ativo",
    })
    .select("id")
    .single();

  // Generate pagamento records
  const pagamentos: Array<{
    aluguel_id: string;
    mes_referencia: string;
    valor: number;
    pago: boolean;
  }> = [];

  if (tipo === "temporada") {
    if (valorSinal) {
      pagamentos.push({
        aluguel_id: aluguel!.id,
        mes_referencia: dataInicio,
        valor: valorSinal,
        pago: false,
      });
      pagamentos.push({
        aluguel_id: aluguel!.id,
        mes_referencia: dataInicio,
        valor: valorTotal - valorSinal,
        pago: false,
      });
    } else {
      pagamentos.push({
        aluguel_id: aluguel!.id,
        mes_referencia: dataInicio,
        valor: valorTotal,
        pago: false,
      });
    }
  } else {
    // mensal: one record per month
    const start = new Date(dataInicio + "T00:00:00");
    const end = new Date(dataFim + "T00:00:00");
    const current = new Date(start.getFullYear(), start.getMonth(), 1);

    while (current <= end) {
      pagamentos.push({
        aluguel_id: aluguel!.id,
        mes_referencia: current.toISOString().split("T")[0],
        valor: valorTotal,
        pago: false,
      });
      current.setMonth(current.getMonth() + 1);
    }
  }

  if (pagamentos.length > 0) {
    await supabase.from("pagamentos").insert(pagamentos);
  }

  revalidatePath(`/imoveis/${imovelId}`);
  redirect(`/imoveis/${imovelId}`);
}
