import { finishOnboarding } from "./actions";
import { Badge, Button, Card, TextField } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/entrar");
    const { data: profile } = await supabase.from("perfis").select("id").eq("id", user.id).maybeSingle();
    if (profile) redirect("/");
    const { data: clubs } = await supabase.from("clubes").select("id, nome, sigla").eq("ativo", true).order("nome");
    const { erro } = await searchParams;
    return (
        <main className="auth-page">
            <Badge tone="primary">PASSO FINAL</Badge>
            <header className="auth-hero"><span className="auth-mark">✦</span><h1>Agora é com você.</h1><p>Defina sua identidade no Escalei antes de montar o time da rodada.</p></header>
            <Card title="Crie seu perfil">
                <form action={finishOnboarding}>
                    {erro && <p className="auth-error">{erro === "apelido_indisponivel" ? "Esse apelido já está em uso." : "Revise os dados e tente novamente."}</p>}
                    <TextField label="Apelido" name="apelido" placeholder="ex.: mestre_da_rodada" minLength={3} maxLength={20} required />
                    <label className="ui-field"><span>Time do coração <em>opcional</em></span><select name="clube_coracao_id" defaultValue=""><option value="">Escolher depois</option>{clubs?.map((club) => <option key={club.id} value={club.id}>{club.nome} ({club.sigla})</option>)}</select></label>
                    <label className="auth-legal"><input type="checkbox" name="aceite_termos" required /> Li e aceito os Termos e a Política de Privacidade v1.</label>
                    <Button type="submit">Concluir cadastro</Button>
                </form>
            </Card>
        </main>
    );
}
