const saoPaulo = "America/Sao_Paulo";

export default function formatDateTime(value: string) {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: saoPaulo, weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function formatKickoffTime(value: string) {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: saoPaulo, hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}