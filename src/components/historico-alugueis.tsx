"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import type { AluguelComInquilino } from "@/lib/types";

interface HistoricoAlugueisProps {
  alugueis: AluguelComInquilino[];
}

function statusBadge(status: string) {
  switch (status) {
    case "finalizado":
      return <Badge className="bg-blue-600 text-white">Finalizado</Badge>;
    case "cancelado":
      return <Badge variant="destructive">Cancelado</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function HistoricoAlugueis({ alugueis }: HistoricoAlugueisProps) {
  const [open, setOpen] = useState(false);

  if (alugueis.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className="flex items-center gap-2 w-full justify-between rounded-md px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
      >
        <span className="font-semibold">
          Historico de Alugueis ({alugueis.length})
        </span>
        <ChevronDown
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 mt-2">
        {alugueis.map((aluguel) => (
          <div
            key={aluguel.id}
            className="rounded-lg border p-4 space-y-1"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium">{aluguel.inquilino.nome_completo}</p>
              {statusBadge(aluguel.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(aluguel.data_inicio)} a {formatDate(aluguel.data_fim)}
            </p>
            <p className="text-sm">
              {formatCurrency(aluguel.valor_total)} -{" "}
              {aluguel.tipo === "mensal" ? "Mensal" : "Temporada"}
            </p>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
