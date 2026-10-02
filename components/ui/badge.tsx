import type { ReactNode } from "react";
import type { Tone } from "./types";
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) { return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>; }
