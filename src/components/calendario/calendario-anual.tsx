"use client";

import { useMemo } from "react";
import { isFeriado, type Feriado } from "@/lib/feriados";

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

export interface CalendarioAnualProps {
  ano: number;
  alugueis: Aluguel[];
  feriados: Feriado[];
  onSelectMonth: (mes: number) => void;
}

const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

function getDaysInMonth(ano: number, mes: number) {
  return new Date(ano, mes + 1, 0).getDate();
}

function getFirstDayOfWeek(ano: number, mes: number) {
  return new Date(ano, mes, 1).getDay();
}

function isDayInRange(date: Date, inicio: string, fim: string): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const start = new Date(inicio + "T00:00:00");
  const end = new Date(fim + "T00:00:00");
  return d >= start && d <= end;
}

function formatYearMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function isDayPaid(date: Date, aluguel: Aluguel): boolean {
  if (aluguel.tipo === "temporada") {
    return aluguel.pagamentos.length > 0 && aluguel.pagamentos.every((p) => p.pago);
  }
  const ym = formatYearMonth(date);
  const pagamento = aluguel.pagamentos.find((p) => p.mes_referencia === ym);
  return pagamento?.pago ?? false;
}

interface DayStatus {
  inContract: boolean;
  paid: boolean;
  holiday: boolean;
}

function getDayStatus(
  date: Date,
  alugueis: Aluguel[],
  feriados: Feriado[]
): DayStatus {
  let inContract = false;
  let paid = false;

  for (const aluguel of alugueis) {
    if (isDayInRange(date, aluguel.data_inicio, aluguel.data_fim)) {
      inContract = true;
      if (isDayPaid(date, aluguel)) {
        paid = true;
      }
    }
  }

  const holiday = !!isFeriado(date, feriados);
  return { inContract, paid, holiday };
}

function MiniMonth({
  ano,
  mes,
  alugueis,
  feriados,
  onSelect,
}: {
  ano: number;
  mes: number;
  alugueis: Aluguel[];
  feriados: Feriado[];
  onSelect: () => void;
}) {
  const totalDays = getDaysInMonth(ano, mes);
  const firstDay = getFirstDayOfWeek(ano, mes);

  const dayStatuses = useMemo(() => {
    const statuses: DayStatus[] = [];
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(ano, mes, d);
      statuses.push(getDayStatus(date, alugueis, feriados));
    }
    return statuses;
  }, [ano, mes, totalDays, alugueis, feriados]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left p-2 rounded-lg border border-border hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="text-xs font-semibold text-center mb-1">
        {MESES[mes]}
      </div>

      {/* Mini weekday headers */}
      <div className="grid grid-cols-7 gap-px mb-0.5">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="text-center text-[8px] text-muted-foreground leading-none">
            {d}
          </div>
        ))}
      </div>

      {/* Mini day cells */}
      <div className="grid grid-cols-7 gap-px">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`e-${i}`} className="aspect-square" />;
          }

          const status = dayStatuses[day - 1];
          let bg = "";
          if (status.paid) {
            bg = "bg-green-200";
          } else if (status.inContract) {
            bg = "bg-blue-200";
          }

          return (
            <div
              key={day}
              className={`relative aspect-square flex items-center justify-center text-[7px] leading-none rounded-[2px] ${bg}`}
            >
              {day}
              {status.holiday && (
                <span className="absolute top-0 right-0 w-1 h-1 rounded-full bg-yellow-400" />
              )}
            </div>
          );
        })}
      </div>
    </button>
  );
}

export function CalendarioAnual({
  ano,
  alugueis,
  feriados,
  onSelectMonth,
}: CalendarioAnualProps) {
  return (
    <div className="w-full">
      <h2 className="text-lg font-semibold text-center mb-4">{ano}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 12 }, (_, mes) => (
          <MiniMonth
            key={mes}
            ano={ano}
            mes={mes}
            alugueis={alugueis}
            feriados={feriados}
            onSelect={() => onSelectMonth(mes)}
          />
        ))}
      </div>
    </div>
  );
}
