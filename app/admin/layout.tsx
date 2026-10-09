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
        <main className="!w-full bg-[#f8faf7] p-6 font-sans text-[#102117] lg:grid lg:grid-cols-[276px_minmax(0,1fr)] lg:gap-0 lg:p-0">
            <aside className="hidden min-h-dvh border-r border-foreground bg-white p-6 lg:flex lg:flex-col">
                <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-[10px] bg-success font-black text-white">E</span>
                    <div>
                        <p className="m-0 text-lg font-extrabold">escalei</p>
                        <p className="m-0 text-xs font-semibold text-[#637469]">Administração</p>
                    </div>
                </div>
                <AdminNav />
                <div className="mt-auto grid gap-3">
                    <div className="flex items-center gap-3 rounded-lg border border-foreground bg-[#f1f5f2] p-3">
                        <span className="grid size-9 place-items-center rounded-full bg-[#ddf7e8] text-xs font-extrabold text-success">{profile?.apelido?.slice(0, 2).toUpperCase() ?? "AD"}</span>
                        <div><p className="m-0 text-sm font-bold">{profile?.apelido ?? "Administrador"}</p><p className="m-0 text-xs text-[#637469]">Admin</p></div>
                    </div>
                    <form action={signOut}>
                        <Button type="submit" variant="outline" className="h-10 w-full border-foreground text-[#48594e] hover:bg-[#f1f5f2]"><LogOut aria-hidden="true" />Sair</Button>
                    </form>
                </div>
            </aside>
            <div className="flex min-h-screen w-full flex-col px-5 pt-8 pb-36">
                {children}
            </div>
        </main>
    );
}
