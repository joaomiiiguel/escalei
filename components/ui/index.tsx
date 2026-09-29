import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type Tone = "primary" | "secondary" | "danger" | "success" | "neutral";

export function Button({ tone = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return <button className={`ui-button ui-button--${tone} ${className}`} {...props} />;
}

export function IconButton({ label, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button className="ui-icon-button" aria-label={label} title={label} {...props}>{children}</button>;
}

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>;
}

export function Chip({ active = false, children }: { active?: boolean; children: ReactNode }) {
  return <span className={`ui-chip ${active ? "ui-chip--active" : ""}`}>{children}</span>;
}

export function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return <section className={`ui-card ${className}`}>{title && <h2 className="ui-card__title">{title}</h2>}{children}</section>;
}

export function TextField({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="ui-field"><span>{label}</span><input {...props} /></label>;
}

export function Toggle({ label, checked, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string; checked?: boolean }) {
  return <label className="ui-toggle"><input type="checkbox" checked={checked} {...props} /><span aria-hidden="true" /><b>{label}</b></label>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="ui-empty-state"><span aria-hidden="true">⚽</span><h2>{title}</h2><p>{description}</p>{action}</div>;
}

export function Toast({ children, tone = "success" }: { children: ReactNode; tone?: Tone }) {
  return <div className={`ui-toast ui-toast--${tone}`} role="status">{children}</div>;
}

export function BudgetBar({ value, max = 100 }: { value: number; max?: number }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return <div className="ui-budget" aria-label={`Orçamento: ${value} de ${max}`}><div><span>Orçamento</span><strong>C$ {value.toFixed(2)}</strong></div><div className="ui-budget__track"><i style={{ width: `${percentage}%` }} /></div></div>;
}
