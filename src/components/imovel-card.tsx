import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Imovel, AluguelComInquilino } from "@/lib/types";

const tipoLabels: Record<string, string> = {
  sitio: "Sitio",
  casa: "Casa",
  ponto_comercial: "Ponto Comercial",
};

interface ImovelCardProps {
  imovel: Imovel;
  aluguelAtivo: AluguelComInquilino | null;
}

export function ImovelCard({ imovel, aluguelAtivo }: ImovelCardProps) {
  return (
    <Link href={`/imoveis/${imovel.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{imovel.nome}</CardTitle>
            <Badge variant={aluguelAtivo ? "default" : "secondary"}>
              {aluguelAtivo ? "Ocupado" : "Livre"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {tipoLabels[imovel.tipo]}
          </p>
        </CardHeader>
        {aluguelAtivo && (
          <CardContent>
            <p className="text-sm">
              <span className="font-medium">Inquilino:</span>{" "}
              {aluguelAtivo.inquilino.nome_completo}
            </p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
