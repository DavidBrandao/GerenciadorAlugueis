"use client";

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
import { useState, useTransition } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import { excluirAluguel } from "@/app/(app)/imoveis/[id]/actions";
import type { AluguelComInquilino } from "@/lib/types";

interface HistoricoAlugueisProps {
  alugueis: AluguelComInquilino[];
  imovelId: string;
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

function ExcluirButton({ aluguelId, imovelId }: { aluguelId: string; imovelId: string }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleExcluir() {
    setErro("");
    startTransition(async () => {
      const result = await excluirAluguel(aluguelId, senha, imovelId);
      if (result.error) {
        setErro(result.error);
      } else {
        setDialogOpen(false);
        setSenha("");
      }
    });
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setSenha(""); setErro(""); } }}>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>
        Excluir
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir Aluguel</DialogTitle>
          <DialogDescription>
            Esta ação irá excluir permanentemente o aluguel e todos os pagamentos associados. Digite a senha para confirmar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            disabled={isPending}
          />
          {erro && <p className="text-sm text-red-600">{erro}</p>}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancelar
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleExcluir}
            disabled={isPending || !senha}
          >
            {isPending ? "Excluindo..." : "Confirmar Exclusão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HistoricoAlugueis({ alugueis, imovelId }: HistoricoAlugueisProps) {
  const [open, setOpen] = useState(false);

  if (alugueis.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className="flex items-center gap-2 w-full justify-between rounded-md px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
      >
        <span className="font-semibold">
          Histórico de Aluguéis ({alugueis.length})
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
              <div className="flex items-center gap-2">
                {statusBadge(aluguel.status)}
                {aluguel.status === "cancelado" && (
                  <ExcluirButton aluguelId={aluguel.id} imovelId={imovelId} />
                )}
              </div>
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
