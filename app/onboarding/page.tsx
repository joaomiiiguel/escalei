import { finishOnboarding } from "./actions";
import { Badge, Button, Card, TextField } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export default async function Onboarding() {
    const supabase = await createClient();
    const { data: clubs } = await supabase.from("clubes").select("id, nome, sigla").eq("ativo", true).order("nome");
    return (
        <main className="auth-page">
            <Badge tone="primary">PASSO FINAL</Badge>
            <header className="auth-hero"><span className="auth-mark">✦</span><h1>Agora é com você.</h1><p>Defina sua identidade no Escalei antes de montar o time da rodada.</p></header>
            <Card title="Crie seu perfil">
                <form action={finishOnboarding}>
                    <TextField label="Apelido" name="apelido" placeholder="ex.: mestre_da_rodada" minLength={3} maxLength={20} required />
                    <label className="ui-field"><span>Time do coração <em>opcional</em></span><select name="clube_coracao_id" defaultValue=""><option value="">Escolher depois</option>{clubs?.map((club) => <option key={club.id} value={club.id}>{club.nome} ({club.sigla})</option>)}</select></label>
                    <p className="auth-legal">Ao continuar, você aceita os Termos e a Política de Privacidade v1.</p>
                    <Button type="submit">Concluir cadastro</Button>
                </form>
            </Card>
        </main>
    );
}
