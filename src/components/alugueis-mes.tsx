"use client";

import { useState, useTransition } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { cancelarAluguel, adicionarPagamento } from "@/app/(app)/imoveis/[id]/actions";
import type { AluguelComInquilino, Pagamento } from "@/lib/types";

interface AlugueisMesProps {
  alugueis: AluguelComInquilino[];
  pagamentosPorAluguel: Map<string, Pagamento[]>;
  mes: number;
  ano: number;
  imovelId: string;
}

function getAlugueisDoMes(
  alugueis: AluguelComInquilino[],
  year: number,
  month: number
): AluguelComInquilino[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  return alugueis.filter((a) => {
    const start = new Date(a.data_inicio + "T00:00:00");
    const end = new Date(a.data_fim + "T00:00:00");
    return start <= lastDay && end >= firstDay;
  });
}

function AluguelCard({
  aluguel,
  pagamentos,
  imovelId,
}: {
  aluguel: AluguelComInquilino;
  pagamentos: Pagamento[];
  imovelId: string;
}) {
  const [open, setOpen] = useState(false);
  const [valorPagamento, setValorPagamento] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isCancelling, startCancelTransition] = useTransition();

  const totalPago = pagamentos
    .filter((p) => p.pago)
    .reduce((sum, p) => sum + p.valor, 0);
  const pendente = aluguel.valor_total - totalPago;
  const estaPago = pendente <= 0;

  function handleAdicionarPagamento() {
    const valor = parseFloat(valorPagamento);
    if (isNaN(valor) || valor <= 0) return;

    startTransition(async () => {
      await adicionarPagamento(aluguel.id, valor, imovelId);
      setValorPagamento("");
    });
  }

  function handleCancelar() {
    startCancelTransition(async () => {
      await cancelarAluguel(aluguel.id, imovelId);
    });
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full rounded-lg border p-4 hover:bg-accent hover:text-accent-foreground transition-colors">
        <div className="flex items-center gap-3 text-left">
          <ChevronDown
            className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
          <div>
            <p className="font-medium">{aluguel.inquilino.nome_completo}</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(aluguel.data_inicio)} a {formatDate(aluguel.data_fim)}
            </p>
          </div>
        </div>
        <Badge
          className={
            estaPago
              ? "bg-green-600 text-white"
              : "bg-yellow-500 text-yellow-900"
          }
        >
          {estaPago ? "Pago" : "Pendente"}
        </Badge>
      </CollapsibleTrigger>

      <CollapsibleContent className="border border-t-0 rounded-b-lg p-4 space-y-4">
        {/* Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Tipo</span>
            <p className="font-medium">
              {aluguel.tipo === "mensal" ? "Mensal" : "Temporada"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Valor Total</span>
            <p className="font-medium">{formatCurrency(aluguel.valor_total)}</p>
          </div>
          {aluguel.valor_sinal != null && (
            <div>
              <span className="text-muted-foreground">Sinal</span>
              <p className="font-medium">
                {formatCurrency(aluguel.valor_sinal)}
              </p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Pendente</span>
            <p className="font-medium">
              {pendente > 0 ? formatCurrency(pendente) : "R$ 0,00"}
            </p>
          </div>
        </div>

        {/* Pagamentos list */}
        {pagamentos.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Pagamentos</p>
            {pagamentos.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between text-sm py-1 border-b last:border-0"
              >
                <span>
                  {p.data_pagamento
                    ? formatDate(p.data_pagamento)
                    : formatDate(p.mes_referencia)}
                </span>
                <div className="flex items-center gap-2">
                  <span>{formatCurrency(p.valor)}</span>
                  <Badge
                    variant="secondary"
                    className={
                      p.pago
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {p.pago ? "Pago" : "Pendente"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add payment (only if there's still a pending amount) */}
        {pendente > 0 && (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground">
                Adicionar Pagamento (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={valorPagamento}
                onChange={(e) => setValorPagamento(e.target.value)}
                disabled={isPending}
              />
            </div>
            <Button
              size="sm"
              onClick={handleAdicionarPagamento}
              disabled={isPending || !valorPagamento}
            >
              {isPending ? "..." : "Adicionar"}
            </Button>
          </div>
        )}

        {/* Cancel button */}
        <Dialog>
          <DialogTrigger
            render={
              <Button
                variant="destructive"
                size="sm"
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
                Tem certeza? O aluguel sera cancelado e as datas liberadas. Esta
                acao nao pode ser desfeita.
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
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AlugueisMes({
  alugueis,
  pagamentosPorAluguel,
  mes,
  ano,
  imovelId,
}: AlugueisMesProps) {
  const alugueisDoMes = getAlugueisDoMes(alugueis, ano, mes);

  if (alugueisDoMes.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground">Nenhum aluguel neste mes</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">
        Alugueis ({alugueisDoMes.length})
      </h3>
      {alugueisDoMes.map((aluguel) => (
        <AluguelCard
          key={aluguel.id}
          aluguel={aluguel}
          pagamentos={pagamentosPorAluguel.get(aluguel.id) ?? []}
          imovelId={imovelId}
        />
      ))}
    </div>
  );
}
