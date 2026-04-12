"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/login/actions";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/contratos", label: "Contratos" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-semibold whitespace-nowrap">
            <span className="hidden sm:inline">Gerenciador de Alugueis</span>
            <span className="sm:hidden">GerAlug</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm px-2 py-1 rounded-md transition-colors",
                  pathname === link.href || pathname?.startsWith(link.href + "/")
                    ? "bg-gray-100 font-medium text-gray-900"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <Button variant="outline" size="sm" onClick={() => logout()}>
          Sair
        </Button>
      </div>
    </header>
  );
}
