import { Logo } from "@/components/ui/logo";
import { LandingShell } from "@/app/_landing/sections";

// Carregamento das páginas públicas: só a logo e o aviso, sem o esqueleto do app logado.
export default function Loading() {
  return (
    <LandingShell>
      <main aria-busy="true" aria-label="Carregando a página" className="flex min-h-svh flex-col items-center justify-center gap-5 px-5">
        <Logo size="lg" priority alt="Escalou" className="motion-safe:animate-pulse" />
        <p role="status" className="text-base font-bold text-muted-foreground">Carregando...</p>
      </main>
    </LandingShell>
  );
}
