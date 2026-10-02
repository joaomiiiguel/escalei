import type { ButtonHTMLAttributes, ReactNode } from "react";
export function FilterChip({ children, active = false, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; active?: boolean }) { return <button className={`ui-filter-chip ${active ? "is-active" : ""}`} {...props}>{children}</button>; }
