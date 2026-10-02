import type { InputHTMLAttributes } from "react";
export function Toggle({ label, checked, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string; checked?: boolean }) { return <label className="ui-toggle"><input type="checkbox" checked={checked} {...props} /><span aria-hidden="true" /><b>{label}</b></label>; }
