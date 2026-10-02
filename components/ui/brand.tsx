export function Brand({ compact = false }: { compact?: boolean }) { return <span className={`ui-brand ${compact ? "ui-brand--compact" : ""}`}><i aria-hidden="true">◉</i>escalei</span>; }
