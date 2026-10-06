import type { ReactNode } from "react";
import type { Tone } from "./types";
export function Badge({ tone = "neutral", className = "", children }: { tone?: Tone; className?: string; children: ReactNode }) { return <span className={`ui-badge ui-badge--${tone} ${className}`}>{children}</span>; }
