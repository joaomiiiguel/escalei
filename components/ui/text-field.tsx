import type { InputHTMLAttributes } from "react";
export function TextField({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="ui-field"><span>{label}</span><input {...props} /></label>; }
