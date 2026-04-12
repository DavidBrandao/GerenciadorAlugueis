"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { criarAluguel } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NovoAluguelPage() {
  const params = useParams();
  const router = useRouter();
  const imovelId = params.id as string;

  const [tipo, setTipo] = useState<"mensal" | "temporada">("mensal");
  const [temSinal, setTemSinal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set("tipo", tipo);
      formData.set("tem_sinal", temSinal ? "true" : "false");
      await criarAluguel(imovelId, formData);
    } catch (err) {
      // redirect() throws a NEXT_REDIRECT error, which is expected
      if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
        return;
      }
      setError("Erro ao criar aluguel. Verifique os dados e tente novamente.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/imoveis/${imovelId}`}>
          <Button variant="outline" size="sm">
            ← Voltar
          </Button>
        </Link>
        <h2 className="text-2xl font-bold">Novo Aluguel</h2>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Inquilino Section */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Inquilino</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome_completo">Nome Completo</Label>
              <Input
                id="nome_completo"
                name="nome_completo"
                required
                placeholder="Nome completo do inquilino"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                name="cpf"
                required
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rg">RG</Label>
              <Input id="rg" name="rg" required placeholder="RG do inquilino" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                name="endereco"
                required
                placeholder="Endereço do inquilino"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                name="telefone"
                required
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="email@exemplo.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Rental Section */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Aluguel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={tipo}
                onValueChange={(value) => {
                  if (value) setTipo(value as "mensal" | "temporada");
                }}
              >
                <SelectTrigger id="tipo">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="temporada">Temporada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_inicio">Data de Início</Label>
              <Input
                id="data_inicio"
                name="data_inicio"
                type="date"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_fim">Data de Fim</Label>
              <Input id="data_fim" name="data_fim" type="date" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_total">
                {tipo === "mensal"
                  ? "Valor Mensal (R$)"
                  : "Valor Total (R$)"}
              </Label>
              <Input
                id="valor_total"
                name="valor_total"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="tem_sinal"
                type="checkbox"
                checked={temSinal}
                onChange={(e) => setTemSinal(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300"
              />
              <Label htmlFor="tem_sinal" className="cursor-pointer">
                Tem sinal?
              </Label>
            </div>

            {temSinal && (
              <div className="space-y-2">
                <Label htmlFor="valor_sinal">Valor do Sinal (R$)</Label>
                <Input
                  id="valor_sinal"
                  name="valor_sinal"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting}>
          {isSubmitting ? "Criando..." : "Criar Aluguel"}
        </Button>
      </form>
    </div>
  );
}
