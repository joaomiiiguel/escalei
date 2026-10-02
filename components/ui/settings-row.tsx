import type { ReactNode } from "react";
export function SettingsRow({ label, description, action }: { label: string; description?: string; action?: ReactNode }) { return <div className="ui-settings-row"><div><b>{label}</b>{description && <small>{description}</small>}</div>{action ?? <span aria-hidden="true">›</span>}</div>; }
