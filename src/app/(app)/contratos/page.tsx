import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ContratosPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Contratos</h2>
      <Card>
        <CardHeader>
          <CardTitle>Em breve</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            A geracao de contratos estara disponivel em uma atualizacao futura.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
