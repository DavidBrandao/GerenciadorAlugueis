"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function togglePagamento(pagamentoId: string, pago: boolean, imovelId: string) {
  const supabase = await createClient();

  await supabase
    .from("pagamentos")
    .update({
      pago,
      data_pagamento: pago ? new Date().toISOString().split("T")[0] : null,
    })
    .eq("id", pagamentoId);

  revalidatePath(`/imoveis/${imovelId}`);
}

export async function toggleSinal(aluguelId: string, sinalPago: boolean, imovelId: string) {
  const supabase = await createClient();

  await supabase
    .from("alugueis")
    .update({ sinal_pago: sinalPago })
    .eq("id", aluguelId);

  revalidatePath(`/imoveis/${imovelId}`);
}

export async function cancelarAluguel(aluguelId: string, imovelId: string) {
  const supabase = await createClient();

  await supabase
    .from("alugueis")
    .update({ status: "cancelado" })
    .eq("id", aluguelId);

  revalidatePath(`/imoveis/${imovelId}`);
  revalidatePath("/dashboard");
}

export async function excluirAluguel(
  aluguelId: string,
  senha: string,
  imovelId: string
): Promise<{ error?: string }> {
  if (senha !== "admin") {
    return { error: "Senha incorreta" };
  }

  const supabase = await createClient();

  // Delete pagamentos first (foreign key)
  await supabase
    .from("pagamentos")
    .delete()
    .eq("aluguel_id", aluguelId);

  await supabase
    .from("alugueis")
    .delete()
    .eq("id", aluguelId);

  revalidatePath(`/imoveis/${imovelId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function editarAluguel(
  aluguelId: string,
  inquilinoId: string,
  nomeCompleto: string,
  valorTotal: number,
  imovelId: string
) {
  const supabase = await createClient();

  await supabase
    .from("inquilinos")
    .update({ nome_completo: nomeCompleto })
    .eq("id", inquilinoId);

  await supabase
    .from("alugueis")
    .update({ valor_total: valorTotal })
    .eq("id", aluguelId);

  revalidatePath(`/imoveis/${imovelId}`);
  revalidatePath("/dashboard");
}

export async function quitarAluguel(aluguelId: string, imovelId: string) {
  const supabase = await createClient();
  const hoje = new Date().toISOString().split("T")[0];

  await supabase
    .from("pagamentos")
    .update({ pago: true, data_pagamento: hoje })
    .eq("aluguel_id", aluguelId)
    .eq("pago", false);

  revalidatePath(`/imoveis/${imovelId}`);
  revalidatePath("/dashboard");
}

export async function adicionarPagamento(
  aluguelId: string,
  valor: number,
  imovelId: string
) {
  const supabase = await createClient();

  await supabase.from("pagamentos").insert({
    aluguel_id: aluguelId,
    mes_referencia: new Date().toISOString().split("T")[0],
    valor,
    pago: true,
    data_pagamento: new Date().toISOString().split("T")[0],
  });

  revalidatePath(`/imoveis/${imovelId}`);
  revalidatePath("/dashboard");
}
