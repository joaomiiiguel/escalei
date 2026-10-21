import { Logo } from "./logo";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Logo
      variant="circle"
      size={compact ? "sm" : "lg"}
      className={compact ? "ui-brand ui-brand--compact" : "ui-brand"}
    />
  );
}
