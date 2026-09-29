import { signInWithGoogle, signInWithMagicLink } from "./actions";

export default function SignIn() {
    return (
        <main>
            <h1>Entrar no Escalei</h1>
            <form action={signInWithMagicLink}>
                <label>
                    E-mail
                    <input name="email" type="email" required />
                </label>
                <button>Receber link mágico</button>
            </form>
            <form action={signInWithGoogle}>
                <button>Continuar com Google</button>
            </form>
        </main>
    );
}
