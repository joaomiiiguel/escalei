import type { ReactNode } from "react";
export function Chip({ active = false, children }: { active?: boolean; children: ReactNode }) { return <span className={`ui-chip ${active ? "ui-chip--active" : ""}`}>{children}</span>; }
