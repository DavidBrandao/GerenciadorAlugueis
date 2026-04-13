"use client";

import { useMemo, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isFeriado, type Feriado } from "@/lib/feriados";

interface Pagamento {
  mes_referencia: string;
  pago: boolean;
}

interface Aluguel {
  data_inicio: string;
  data_fim: string;
  tipo: "mensal" | "temporada";
  inquilino_nome?: string;
  pagamentos: Pagamento[];
}

export interface CalendarioMensalProps {
  mes: number; // 0-11
  ano: number;
  alugueis: Aluguel[];
  feriados: Feriado[];
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  // Interactive props for date range selection
  selectedRange?: { start: Date | null; end: Date | null };
  onDayClick?: (date: Date) => void;
  disabledDates?: (date: Date) => boolean;
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function getDaysInMonth(ano: number, mes: number) {
  return new Date(ano, mes + 1, 0).getDate();
}

function getFirstDayOfWeek(ano: number, mes: number) {
  return new Date(ano, mes, 1).getDay();
}

function formatYearMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function isDayInRange(date: Date, inicio: string, fim: string): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const start = new Date(inicio + "T00:00:00");
  const end = new Date(fim + "T00:00:00");
  return d >= start && d <= end;
}

function isDayPaid(date: Date, aluguel: Aluguel): boolean {
  if (aluguel.tipo === "temporada") {
    return aluguel.pagamentos.length > 0 && aluguel.pagamentos.every((p) => p.pago);
  }
  // mensal: check if the payment for this month is paid
  const ym = formatYearMonth(date);
  const pagamento = aluguel.pagamentos.find((p) => p.mes_referencia.startsWith(ym));
  return pagamento?.pago ?? false;
}

interface DayInfo {
  bg: string;
  feriado: Feriado | undefined;
  tooltipLines: string[];
  inquilinoNome: string | null;
}

export function CalendarioMensal({
  mes,
  ano,
  alugueis,
  feriados,
  onPrevMonth,
  onNextMonth,
  selectedRange,
  onDayClick,
  disabledDates,
}: CalendarioMensalProps) {
  const totalDays = getDaysInMonth(ano, mes);
  const firstDay = getFirstDayOfWeek(ano, mes);

  const dayInfoMap = useMemo(() => {
    const map = new Map<number, DayInfo>();

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(ano, mes, day);
      const tooltipLines: string[] = [];
      let inContract = false;
      let paid = false;
      let inquilinoNome: string | null = null;

      for (const aluguel of alugueis) {
        if (isDayInRange(date, aluguel.data_inicio, aluguel.data_fim)) {
          inContract = true;
          if (aluguel.inquilino_nome) {
            inquilinoNome = aluguel.inquilino_nome.split(" ")[0];
            tooltipLines.push(`Inquilino: ${aluguel.inquilino_nome}`);
          }
          const tipoLabel = aluguel.tipo === "mensal" ? "Mensal" : "Temporada";
          tooltipLines.push(`${tipoLabel}: ${aluguel.data_inicio} a ${aluguel.data_fim}`);

          if (isDayPaid(date, aluguel)) {
            paid = true;
            tooltipLines.push("Status: Reserva Paga");
          } else {
            tooltipLines.push("Status: Reservado");
          }
        }
      }

      const feriadoInfo = isFeriado(date, feriados);
      if (feriadoInfo) {
        tooltipLines.push(`Feriado: ${feriadoInfo.nome}`);
      }

      let bg = "";
      if (paid) {
        bg = "bg-green-100";
      } else if (inContract) {
        bg = "bg-orange-100";
      }

      map.set(day, { bg, feriado: feriadoInfo, tooltipLines, inquilinoNome });
    }

    return map;
  }, [ano, mes, totalDays, alugueis, feriados]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    cells.push(d);
  }

  function isDayInSelectedRange(day: number): "start" | "end" | "middle" | null {
    if (!selectedRange?.start) return null;
    const date = new Date(ano, mes, day);
    const start = selectedRange.start;
    const end = selectedRange.end;

    if (start && date.getTime() === start.getTime()) return "start";
    if (end && date.getTime() === end.getTime()) return "end";
    if (start && end && date > start && date < end) return "middle";
    if (start && !end && date.getTime() === start.getTime()) return "start";
    return null;
  }

  const [tappedDay, setTappedDay] = useState<number | null>(null);

  function handleDayTap(day: number, date: Date, hasTooltip: boolean, isInteractive: boolean) {
    if (isInteractive) {
      onDayClick!(date);
      return;
    }
    if (hasTooltip) {
      setTappedDay(tappedDay === day ? null : day);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={onPrevMonth} aria-label="Mês anterior">
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {MESES[mes]} {ano}
        </h2>
        <Button variant="ghost" size="icon" onClick={onNextMonth} aria-label="Próximo mês">
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <TooltipProvider>
        <div className="grid grid-cols-7 gap-px">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="aspect-square" />;
            }

            const info = dayInfoMap.get(day)!;
            const hasTooltip = info.tooltipLines.length > 0;
            const date = new Date(ano, mes, day);
            const isDisabled = disabledDates?.(date) ?? false;
            const rangePos = isDayInSelectedRange(day);
            const isInteractive = !!onDayClick && !isDisabled;
            const hoje = new Date();
            const isHoje =
              date.getDate() === hoje.getDate() &&
              date.getMonth() === hoje.getMonth() &&
              date.getFullYear() === hoje.getFullYear();

            // Build classes
            let selectionClasses = "";
            if (rangePos === "start" || rangePos === "end") {
              selectionClasses = "bg-primary text-primary-foreground";
            } else if (rangePos === "middle") {
              selectionClasses = "bg-primary/20";
            }

            const disabledClasses = isDisabled
              ? "opacity-40 cursor-not-allowed"
              : "";

            const interactiveClasses = isInteractive
              ? "cursor-pointer hover:ring-2 hover:ring-primary/50"
              : hasTooltip
                ? "cursor-pointer"
                : "cursor-default";

            const cellContent = (
              <div
                className={`relative aspect-square flex flex-col items-center justify-center text-sm rounded-md transition-colors ${info.bg} ${selectionClasses} ${disabledClasses} ${interactiveClasses} ${isHoje ? "ring-2 ring-blue-500" : ""}`}
                onClick={() => handleDayTap(day, date, hasTooltip, isInteractive)}
                role={isInteractive || hasTooltip ? "button" : undefined}
                tabIndex={isInteractive || hasTooltip ? 0 : undefined}
                onKeyDown={
                  isInteractive
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onDayClick!(date);
                        }
                      }
                    : undefined
                }
              >
                {info.inquilinoNome && (
                  <span className="text-[8px] leading-none font-medium truncate w-full text-center">
                    {info.inquilinoNome}
                  </span>
                )}
                <span>{day}</span>
                {info.feriado && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-yellow-400" />
                )}
              </div>
            );

            if (!hasTooltip) {
              return <div key={day}>{cellContent}</div>;
            }

            return (
              <Tooltip key={day} open={tappedDay === day}>
                <TooltipTrigger>
                  {cellContent}
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-0.5">
                    {info.tooltipLines.map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}
