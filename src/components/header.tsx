"use client";

import { Button } from "@/components/ui/button";
import { logout } from "@/app/login/actions";

export function Header() {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <h1 className="text-lg font-semibold">Gerenciador de Alugueis</h1>
        <Button variant="outline" size="sm" onClick={() => logout()}>
          Sair
        </Button>
      </div>
    </header>
  );
}
