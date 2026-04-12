import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { AluguelComInquilino } from "@/lib/types";

interface AluguelInfoProps {
  aluguel: AluguelComInquilino;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

export function AluguelInfo({ aluguel }: AluguelInfoProps) {
  const remaining =
    aluguel.valor_sinal != null
      ? aluguel.valor_total - aluguel.valor_sinal
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Aluguel Ativo</span>
          <Badge variant="default" className="bg-green-600">
            {aluguel.tipo === "mensal" ? "Mensal" : "Temporada"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <span className="text-sm text-muted-foreground">Inquilino</span>
          <p className="font-medium">{aluguel.inquilino.nome_completo}</p>
        </div>

        <div>
          <span className="text-sm text-muted-foreground">Periodo</span>
          <p className="font-medium">
            {formatDate(aluguel.data_inicio)} a {formatDate(aluguel.data_fim)}
          </p>
        </div>

        <Separator />

        <div>
          <span className="text-sm text-muted-foreground">Valor Total</span>
          <p className="font-medium text-lg">
            {formatCurrency(aluguel.valor_total)}
          </p>
        </div>

        {aluguel.valor_sinal != null && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-muted-foreground">
                  Valor Sinal
                </span>
                <p className="font-medium">
                  {formatCurrency(aluguel.valor_sinal)}
                </p>
              </div>
              <Badge
                variant={aluguel.sinal_pago ? "default" : "secondary"}
                className={
                  aluguel.sinal_pago
                    ? "bg-green-600"
                    : "bg-yellow-500 text-yellow-900"
                }
              >
                {aluguel.sinal_pago ? "Sinal Pago" : "Sinal Pendente"}
              </Badge>
            </div>

            {remaining != null && (
              <div>
                <span className="text-sm text-muted-foreground">
                  Valor Restante
                </span>
                <p className="font-medium">{formatCurrency(remaining)}</p>
              </div>
            )}
          </>
        )}

        {aluguel.observacoes && (
          <>
            <Separator />
            <div>
              <span className="text-sm text-muted-foreground">Observacoes</span>
              <p className="text-sm">{aluguel.observacoes}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
