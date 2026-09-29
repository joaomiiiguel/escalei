import { finishOnboarding } from "./actions";
export default function Onboarding() {
    return (
        <main>
            <h1>Complete seu perfil</h1>
            <form action={finishOnboarding}>
                <label>
                    Apelido
                    <input name="apelido" minLength={3} maxLength={20} required />
                </label>
                <label>
                    ID do clube do coração (opcional)
                    <input name="clube_coracao_id" type="number" />
                </label>
                <p>
                    Ao continuar, você aceita os Termos e a Política de Privacidade v1.
                </p>
                <button>Concluir cadastro</button>
            </form>
        </main>
    );
}
