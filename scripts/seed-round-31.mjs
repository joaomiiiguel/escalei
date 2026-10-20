import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const now = new Date();
const hoursFromNow = (hours) => new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();

// Rodada 31 da temporada simulada (2024)
const { data: round, error: roundError } = await supabase
  .from("rodadas")
  .upsert({
    temporada: 2024,
    numero: 31,
    rotulo_api: "Regular Season - 31",
    simulada: true,
    status: "AGENDADA",
    abre_em: hoursFromNow(-24),
    trava_em: hoursFromNow(48),
    fechada_em: null,
    fechamento_simulado_em: null,
    versao_regras: 1,
  }, { onConflict: "temporada,numero" })
  .select("id, status, trava_em, rotulo_api")
  .single();

if (roundError || !round) throw new Error(`Não foi possível gravar a rodada 31: ${roundError?.message ?? "resposta vazia"}`);

console.log(`Rodada 31 criada: ${round.rotulo_api} (id: ${round.id}, trava em ${round.trava_em})`);