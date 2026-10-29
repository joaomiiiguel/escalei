import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "cn";

type LoadingContentProps = {
  children: ReactNode;
  className?: string;
  loading: boolean;
  loadingText?: ReactNode;
};

// Empilha o conteúdo normal e o de carregamento na mesma célula do grid:
// o botão mantém a largura do maior dos dois e não "pula" ao trocar o texto.
export function LoadingContent({ children, className, loading, loadingText }: LoadingContentProps) {
  return <span className={cn("inline-grid gap-[inherit]", className)}>
    <span className={cn("col-start-1 row-start-1 inline-flex items-center justify-center gap-[inherit]", loading && "invisible")}>{children}</span>
    {loading && <span className="col-start-1 row-start-1 inline-flex items-center justify-center gap-2">
      <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" data-testid="loading-spinner" />
      {loadingText}
    </span>}
  </span>;
}
