"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/login/actions";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Aluguéis", matchAlso: ["/imoveis"] },
  { href: "/relatorios", label: "Dashboard" },
  { href: "/contratos", label: "Contratos" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto relative flex h-14 items-center justify-center px-2 sm:px-4">
        <nav className="flex items-center gap-0.5 sm:gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-md transition-colors whitespace-nowrap",
                pathname === link.href || pathname?.startsWith(link.href + "/") || link.matchAlso?.some((p) => pathname?.startsWith(p))
                  ? "bg-gray-100 font-medium text-gray-900"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Button variant="outline" size="sm" className="absolute right-2 sm:right-4 text-xs sm:text-sm" onClick={() => logout()}>
          Sair
        </Button>
      </div>
    </header>
  );
}
