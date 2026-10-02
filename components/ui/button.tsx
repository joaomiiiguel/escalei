import type { ButtonHTMLAttributes } from "react";
import type { Tone } from "./types";
export function Button({ tone = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) { return <button className={`ui-button ui-button--${tone} ${className}`} {...props} />; }
