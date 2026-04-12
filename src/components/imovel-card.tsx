import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
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

function CasaContent({
  aluguel,
  pagamentosPorAluguel,
}: {
  aluguel: AluguelComInquilino;
  pagamentosPorAluguel: Map<string, Pagamento[]>;
}) {
  const hoje = new Date();
  const pags = pagamentosPorAluguel.get(aluguel.id) ?? [];

  // For mensal: find pagamento for current month
  // For temporada: use all pagamentos
  let valorMes = 0;
  let pagoMes = false;

  if (aluguel.tipo === "mensal") {
    const ym = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    const pagMes = pags.find((p) => p.mes_referencia.startsWith(ym));
    if (pagMes) {
      valorMes = pagMes.valor;
      pagoMes = pagMes.pago;
    }
  } else {
    valorMes = aluguel.valor_total;
    const totalPago = pags.filter((p) => p.pago).reduce((sum, p) => sum + p.valor, 0);
    pagoMes = totalPago >= aluguel.valor_total;
  }

  return (
    <CardContent className="space-y-1">
      <p className="text-sm">
        <span className="font-medium">Inquilino:</span>{" "}
        {aluguel.inquilino.nome_completo}
      </p>
      <p className="text-sm text-muted-foreground">
        {formatCurrency(valorMes)} —{" "}
        <span className={pagoMes ? "text-green-600" : "text-yellow-600"}>
          {pagoMes ? "Pago" : "Pendente"}
        </span>
      </p>
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
        badgeText = `${alugueisDoMes.length} ${alugueisDoMes.length === 1 ? "aluguel" : "alugueis"}`;
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
