"use client";

import { useState, useTransition } from "react";
import { Calendario } from "@/components/calendario/calendario";
import { AlugueisMes } from "@/components/alugueis-mes";
import { AluguelInfo } from "@/components/aluguel-info";
import { PagamentosTable } from "@/components/pagamentos-table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { cancelarAluguel } from "@/app/(app)/imoveis/[id]/actions";
import type { Imovel, AluguelComInquilino, Pagamento } from "@/lib/types";
import Link from "next/link";

interface ImovelDetailClientProps {
  imovel: Imovel;
  alugueisAtivos: AluguelComInquilino[];
  calendarAlugueis: Array<{
    data_inicio: string;
    data_fim: string;
    tipo: "mensal" | "temporada";
    inquilino_nome?: string;
    pagamentos: Array<{ mes_referencia: string; pago: boolean }>;
  }>;
  pagamentosSerializado: Record<string, Pagamento[]>;
}

export function ImovelDetailClient({
  imovel,
  alugueisAtivos,
  calendarAlugueis,
  pagamentosSerializado,
}: ImovelDetailClientProps) {
  const hoje = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());
  const [isCancelling, startCancelTransition] = useTransition();

  const pagamentosPorAluguel = new Map<string, Pagamento[]>(
    Object.entries(pagamentosSerializado)
  );

  const isSitio = imovel.tipo === "sitio";

  function handleMonthChange(mes: number, ano: number) {
    setMesSelecionado(mes);
    setAnoSelecionado(ano);
  }

  if (isSitio) {
    return (
      <>
        <Calendario
          alugueis={calendarAlugueis}
          onMonthChange={handleMonthChange}
        />

        <Separator />

        <AlugueisMes
          alugueis={alugueisAtivos}
          pagamentosPorAluguel={pagamentosPorAluguel}
          mes={mesSelecionado}
          ano={anoSelecionado}
          imovelId={imovel.id}
        />
      </>
    );
  }

  // Casa / ponto_comercial
  const aluguelAtivo = alugueisAtivos[0] ?? null;
  const pagamentos = aluguelAtivo
    ? pagamentosPorAluguel.get(aluguelAtivo.id) ?? []
    : [];

  function handleCancelar() {
    if (!aluguelAtivo) return;
    startCancelTransition(async () => {
      await cancelarAluguel(aluguelAtivo.id, imovel.id);
    });
  }

  return (
    <>
      {aluguelAtivo && (
        <>
          <Calendario alugueis={calendarAlugueis} />
          <Separator />
        </>
      )}

      {aluguelAtivo ? (
        <div className="space-y-6">
          <AluguelInfo aluguel={aluguelAtivo} imovelId={imovel.id} pagamentos={pagamentos} tipoImovel={imovel.tipo} />
          <PagamentosTable
            pagamentos={pagamentos}
            aluguelTipo={aluguelAtivo.tipo}
            aluguelValorSinal={aluguelAtivo.valor_sinal}
            imovelId={imovel.id}
            tipoImovel={imovel.tipo}
            aluguelId={aluguelAtivo.id}
          />
          <Dialog>
            <DialogTrigger
              render={
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={isCancelling}
                />
              }
            >
              {isCancelling ? "Cancelando..." : "Cancelar Aluguel"}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancelar Aluguel</DialogTitle>
                <DialogDescription>
                  Tem certeza? O aluguel será cancelado e as datas liberadas.
                  Esta ação não pode ser desfeita.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Voltar
                </DialogClose>
                <Button variant="destructive" onClick={handleCancelar}>
                  Confirmar Cancelamento
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="flex flex-col items-center py-12 space-y-4">
          <p className="text-muted-foreground text-lg">Nenhum aluguel ativo</p>
          <Link href={`/imoveis/${imovel.id}/novo-aluguel`} className="w-full max-w-md">
            <Button size="lg" className="w-full text-lg py-6">
              Novo Aluguel
            </Button>
          </Link>
        </div>
      )}
    </>
  );
}
