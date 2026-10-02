import type { ReactNode } from "react";
import type { Tone } from "./types";
export function Toast({ children, tone = "success" }: { children: ReactNode; tone?: Tone }) { return <div className={`ui-toast ui-toast--${tone}`} role="status">{children}</div>; }
