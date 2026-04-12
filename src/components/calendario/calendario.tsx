"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarioMensal } from "./calendario-mensal";
import { CalendarioAnual } from "./calendario-anual";
import { Legenda } from "./legenda";
import { getFeriados, type Feriado } from "@/lib/feriados";

interface Pagamento {
  mes_referencia: string;
  pago: boolean;
}

interface Aluguel {
  data_inicio: string;
  data_fim: string;
  tipo: "mensal" | "temporada";
  pagamentos: Pagamento[];
}

export interface CalendarioProps {
  alugueis: Aluguel[];
  feriados?: Feriado[];
  onMonthChange?: (mes: number, ano: number) => void;
}

type Visao = "mensal" | "anual";

export function Calendario({ alugueis, feriados: feriadosProp, onMonthChange }: CalendarioProps) {
  const hoje = new Date();
  const [visao, setVisao] = useState<Visao>("mensal");
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());

  const feriados = useMemo(() => {
    if (feriadosProp) return feriadosProp;
    return getFeriados(ano);
  }, [feriadosProp, ano]);

  useEffect(() => {
    onMonthChange?.(mes, ano);
  }, [mes, ano, onMonthChange]);

  function irMesAnterior() {
    if (mes === 0) {
      setMes(11);
      setAno((a) => a - 1);
    } else {
      setMes((m) => m - 1);
    }
  }

  function irProximoMes() {
    if (mes === 11) {
      setMes(0);
      setAno((a) => a + 1);
    } else {
      setMes((m) => m + 1);
    }
  }

  function selecionarMes(m: number) {
    setMes(m);
    setVisao("mensal");
  }

  return (
    <div className="space-y-4">
      {/* Toggle and year navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* View toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setVisao("mensal")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              visao === "mensal"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground hover:bg-muted"
            }`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setVisao("anual")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              visao === "anual"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground hover:bg-muted"
            }`}
          >
            Anual
          </button>
        </div>

        {/* Year navigation (shown in annual view) */}
        {visao === "anual" && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setAno((a) => a - 1)} aria-label="Ano anterior">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-medium">{ano}</span>
            <Button variant="ghost" size="icon" onClick={() => setAno((a) => a + 1)} aria-label="Próximo ano">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      <Legenda />

      {/* Calendar content */}
      {visao === "mensal" ? (
        <CalendarioMensal
          mes={mes}
          ano={ano}
          alugueis={alugueis}
          feriados={feriados}
          onPrevMonth={irMesAnterior}
          onNextMonth={irProximoMes}
        />
      ) : (
        <CalendarioAnual
          ano={ano}
          alugueis={alugueis}
          feriados={feriados}
          onSelectMonth={selecionarMes}
        />
      )}
    </div>
  );
}
