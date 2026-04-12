import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Imovel, AluguelComInquilino, Pagamento } from "@/lib/types";

const tipoLabels: Record<string, string> = {
  sitio: "Sitio",
  casa: "Casa",
  ponto_comercial: "Ponto Comercial",
};

interface ImovelCardProps {
  imovel: Imovel;
  alugueisAtivos: AluguelComInquilino[];
  pagamentosPorAluguel: Map<string, Pagamento[]>;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function isMesOcupadoCompleto(
  alugueis: AluguelComInquilino[],
  year: number,
  month: number
): boolean {
  if (alugueis.length === 0) return false;
  const totalDays = getDaysInMonth(year, month);

  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month, day);
    const coberto = alugueis.some((a) => {
      const start = new Date(a.data_inicio + "T00:00:00");
      const end = new Date(a.data_fim + "T00:00:00");
      return d >= start && d <= end;
    });
    if (!coberto) return false;
  }
  return true;
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

function getDiasDoMes(
  aluguel: AluguelComInquilino,
  year: number,
  month: number
): number[] {
  const dias: number[] = [];
  const start = new Date(aluguel.data_inicio + "T00:00:00");
  const end = new Date(aluguel.data_fim + "T00:00:00");
  const totalDays = getDaysInMonth(year, month);

  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month, day);
    if (d >= start && d <= end) {
      dias.push(day);
    }
  }
  return dias;
}

function SitioContent({
  alugueisAtivos,
  pagamentosPorAluguel,
}: {
  alugueisAtivos: AluguelComInquilino[];
  pagamentosPorAluguel: Map<string, Pagamento[]>;
}) {
  const hoje = new Date();
  const year = hoje.getFullYear();
  const month = hoje.getMonth();

  const alugueisDoMes = getAlugueisDoMes(alugueisAtivos, year, month);

  if (alugueisDoMes.length === 0) return null;

  return (
    <CardContent className="space-y-2">
      {alugueisDoMes.map((aluguel) => {
        const dias = getDiasDoMes(aluguel, year, month);
        const pags = pagamentosPorAluguel.get(aluguel.id) ?? [];
        const totalPago = pags
          .filter((p) => p.pago)
          .reduce((sum, p) => sum + p.valor, 0);
        const pendente = aluguel.valor_total - totalPago;

        return (
          <div key={aluguel.id} className="text-sm space-y-0.5">
            <p>
              <span className="font-medium">
                {aluguel.inquilino.nome_completo}
              </span>
              {" — Dias "}
              {dias.map((d) => String(d).padStart(2, "0")).join(", ")}
            </p>
            <p className="text-muted-foreground">
              {formatCurrency(totalPago)} pago
              {pendente > 0 && (
                <> · {formatCurrency(pendente)} pendente</>
              )}
            </p>
          </div>
        );
      })}
    </CardContent>
  );
}

function MesesGrid({
  aluguel,
  pagamentos,
}: {
  aluguel: AluguelComInquilino;
  pagamentos: Pagamento[];
}) {
  const inicio = new Date(aluguel.data_inicio + "T00:00:00");
  const fim = new Date(aluguel.data_fim + "T00:00:00");

  // Build list of months in contract period
  const meses: { mes: number; ano: number; ym: string; label: string }[] = [];
  const current = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  const lastMonth = new Date(fim.getFullYear(), fim.getMonth(), 1);

  while (current <= lastMonth) {
    const m = current.getMonth() + 1;
    const y = current.getFullYear();
    meses.push({
      mes: m,
      ano: y,
      ym: `${y}-${String(m).padStart(2, "0")}`,
      label: `${String(m).padStart(2, "0")}/${String(y).slice(2)}`,
    });
    current.setMonth(current.getMonth() + 1);
  }

  // Filter out fiança (valor_sinal record with mes_referencia = data_inicio and valor = sinal)
  const mensalidades = pagamentos.filter((p) => {
    if (aluguel.valor_sinal != null && p.valor === aluguel.valor_sinal && p.mes_referencia === aluguel.data_inicio) {
      return false;
    }
    return true;
  });

  return (
    <div className="grid grid-cols-6 gap-1">
      {meses.map(({ ym, label }) => {
        const pagMes = mensalidades.find((p) => p.mes_referencia.startsWith(ym));
        const pago = pagMes?.pago ?? false;

        return (
          <div
            key={ym}
            className={`flex items-center justify-center rounded text-xs font-bold h-7 text-white ${
              pago ? "bg-green-600" : "bg-red-500"
            }`}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}

function CasaContent({
  aluguel,
  pagamentosPorAluguel,
}: {
  aluguel: AluguelComInquilino;
  pagamentosPorAluguel: Map<string, Pagamento[]>;
}) {
  const pags = pagamentosPorAluguel.get(aluguel.id) ?? [];

  return (
    <CardContent className="space-y-2">
      <p className="text-sm">
        <span className="font-medium">Inquilino:</span>{" "}
        {aluguel.inquilino.nome_completo}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
        <p className="text-muted-foreground">Início Contrato</p>
        <p className="font-medium">{formatDate(aluguel.data_inicio)}</p>
        <p className="text-muted-foreground">Final Contrato</p>
        <p className="font-medium">{formatDate(aluguel.data_fim)}</p>
        <p className="text-muted-foreground">Valor Aluguel</p>
        <p className="font-medium">{formatCurrency(aluguel.valor_total)}</p>
        {aluguel.valor_sinal != null && (
          <>
            <p className="text-muted-foreground">Fiança</p>
            <p className="font-medium">{formatCurrency(aluguel.valor_sinal)}</p>
          </>
        )}
      </div>
      <MesesGrid aluguel={aluguel} pagamentos={pags} />
    </CardContent>
  );
}

export function ImovelCard({
  imovel,
  alugueisAtivos,
  pagamentosPorAluguel,
}: ImovelCardProps) {
  const hoje = new Date();
  const isSitio = imovel.tipo === "sitio";

  // Determine badge
  let badgeVariant: "default" | "secondary" = "secondary";
  let badgeText = "Livre";

  if (isSitio) {
    const alugueisDoMes = getAlugueisDoMes(
      alugueisAtivos,
      hoje.getFullYear(),
      hoje.getMonth()
    );
    if (alugueisDoMes.length > 0) {
      const ocupadoCompleto = isMesOcupadoCompleto(
        alugueisAtivos,
        hoje.getFullYear(),
        hoje.getMonth()
      );
      if (ocupadoCompleto) {
        badgeVariant = "default";
        badgeText = "Ocupado";
      } else {
        badgeVariant = "default";
        badgeText = `${alugueisDoMes.length} ${alugueisDoMes.length === 1 ? "aluguel" : "aluguéis"}`;
      }
    }
  } else {
    if (alugueisAtivos.length > 0) {
      badgeVariant = "default";
      badgeText = "Ocupado";
    }
  }

  return (
    <Link href={`/imoveis/${imovel.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{imovel.nome}</CardTitle>
            <Badge variant={badgeVariant}>{badgeText}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {tipoLabels[imovel.tipo]}
          </p>
        </CardHeader>
        {isSitio ? (
          <SitioContent
            alugueisAtivos={alugueisAtivos}
            pagamentosPorAluguel={pagamentosPorAluguel}
          />
        ) : (
          alugueisAtivos.length > 0 && (
            <CasaContent
              aluguel={alugueisAtivos[0]}
              pagamentosPorAluguel={pagamentosPorAluguel}
            />
          )
        )}
      </Card>
    </Link>
  );
}
