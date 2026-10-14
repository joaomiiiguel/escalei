import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/entrar");

    const [{ data: profile }] = await Promise.all([
        supabase.from("perfis").select("apelido").eq("id", user.id).maybeSingle(),
    ]);

    return (
        <main className="!w-full bg-neutral-950 font-sans text-neutral-100 lg:grid lg:grid-cols-[276px_minmax(0,1fr)] lg:gap-0">
            <aside className="hidden min-h-dvh border-r border-neutral-800 bg-neutral-900 p-6 lg:flex lg:flex-col">
                <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-[10px] bg-primary font-black text-primary-foreground">E</span>
                    <div>
                        <p className="m-0 text-lg font-extrabold">escalei</p>
                        <p className="m-0 text-xs font-semibold text-muted-foreground">Administração</p>
                    </div>
                </div>
                <AdminNav />
                <div className="mt-auto grid gap-3">
                    <div className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-800/50 p-3">
                        <span className="grid size-9 place-items-center rounded-full bg-primary/15 text-xs font-extrabold text-primary">{profile?.apelido?.slice(0, 2).toUpperCase() ?? "AD"}</span>
                        <div><p className="m-0 text-sm font-bold">{profile?.apelido ?? "Administrador"}</p><p className="m-0 text-xs text-muted-foreground">Admin</p></div>
                    </div>
                    <form action={signOut}>
                        <Button type="submit" variant="outline" className="h-10 w-full"><LogOut aria-hidden="true" />Sair</Button>
                    </form>
                </div>
            </aside>
            <div className="flex min-h-dvh w-full flex-col px-5 pb-36 pt-8 lg:px-10">
                {children}
            </div>
        </main>
    );
}
