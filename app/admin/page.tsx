import { isDemoModeEnabled, requireAdmin } from "@/lib/admin-access";
import { DemoModeToggle } from "./demo-mode-toggle";

const AdminPage = async () => {
    const { supabase, user } = await requireAdmin();
    const demoMode = await isDemoModeEnabled(supabase, user.id);

    return (
        <div className="flex min-h-screen w-full max-w-lg flex-col gap-4 px-5 pt-1 pb-36 text-foreground">
            <h1>Admin</h1>
            <DemoModeToggle initialEnabled={demoMode} />
        </div>
    );
};

export default AdminPage;
