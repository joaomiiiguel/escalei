import { signInWithGoogle, signInWithMagicLink } from "./actions";
import { Badge, Button, Card, Chip, TextField } from "@/components/ui";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ enviado?: string; erro?: string }> }) {
    const params = await searchParams;
    return (
        <main className="auth-page">
            <Badge tone="success">BETA DO BRASILEIRÃO</Badge>
            <header className="auth-hero"><span className="auth-mark">⚽</span><h1>Escalei seu time.<br />Viva cada rodada.</h1><p>Fantasy futebol gratuito, sem apostas e feito para competir com os amigos.</p></header>
            <div className="auth-steps" aria-label="Como funciona"><Chip active>1. Monte seu time</Chip><Chip>2. Acompanhe os pontos</Chip><Chip>3. Suba no ranking</Chip></div>
            <Card title="Entre para começar">
                {params.enviado && <p className="auth-success">Enviamos seu link de acesso. Confira seu e-mail.</p>}
                {params.erro && <p className="auth-error">Não foi possível iniciar o acesso. Tente novamente.</p>}
                <form action={signInWithGoogle}><Button type="submit" className="auth-google">G&nbsp;&nbsp; Continuar com Google</Button></form>
                <div className="auth-divider"><span>ou</span></div>
                <form action={signInWithMagicLink}>
                    <TextField label="Seu melhor e-mail" name="email" type="email" placeholder="voce@email.com" required />
                    <Button type="submit" tone="secondary">Receber link mágico</Button>
                </form>
            </Card>
            <p className="auth-legal">Ao continuar, você concorda com os Termos e a Política de Privacidade.</p>
        </main>
    );
}
