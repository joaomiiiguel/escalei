import { createClient } from "@supabase/supabase-js";

const apiKey = process.env.API_FOOTBALL_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const leagueId = Number(process.env.API_FOOTBALL_LEAGUE_ID ?? "71");
const season = Number(process.env.API_FOOTBALL_SEASON ?? "2024");

const brazilianAbbreviations = {
  "Atletico Goianiense": "ACG",
  "Atletico-MG": "CAM",
};

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

if (!apiKey || !supabaseUrl || !serviceRoleKey) {
  throw new Error("API_FOOTBALL_KEY, NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
}

if (!Number.isInteger(leagueId) || !Number.isInteger(season)) {
  throw new Error("API_FOOTBALL_LEAGUE_ID e API_FOOTBALL_SEASON devem ser números inteiros.");
}

const response = await fetch(`https://v3.football.api-sports.io/teams?league=${leagueId}&season=${season}`, {
  headers: { "x-apisports-key": apiKey },
});

if (!response.ok) throw new Error(`API-Football respondeu HTTP ${response.status}.`);

const payload = await response.json();
if (payload.errors && Object.keys(payload.errors).length > 0) {
  const errorFields = Object.keys(payload.errors).join(", ");
  throw new Error(`A API-Football retornou erros ao consultar os clubes (campos: ${errorFields}).`);
}

const clubs = payload.response?.map(({ team }) => ({
  id: team.id,
  nome: team.name?.trim(),
  sigla: brazilianAbbreviations[team.name] ?? team.code?.trim().toUpperCase(),
  logo_url: team.logo?.trim() || null,
  ativo: true,
  api_atualizado_em: new Date().toISOString(),
})) ?? [];

if (clubs.length === 0) throw new Error("A API-Football não retornou clubes para esta competição e temporada.");

const invalidClub = clubs.find((club) => !Number.isInteger(club.id) || !club.nome || !/^[A-Z0-9]{3}$/.test(club.sigla ?? ""));
if (invalidClub) throw new Error("A API-Football retornou clube sem sigla de três caracteres válida; sincronização cancelada.");

const clubWithInvalidLogo = clubs.find((club) => club.logo_url && !isHttpsUrl(club.logo_url));
if (clubWithInvalidLogo) throw new Error("A API-Football retornou uma URL de logo inválida; sincronização cancelada.");

const duplicatedAbbreviations = clubs
  .filter((club, index) => clubs.findIndex(({ sigla }) => sigla === club.sigla) !== index)
  .map(({ nome, sigla }) => `${sigla} (${nome})`);

if (duplicatedAbbreviations.length > 0) {
  throw new Error(`A API-Football retornou siglas duplicadas: ${duplicatedAbbreviations.join(", ")}.`);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { error } = await supabase.from("clubes").upsert(clubs, { onConflict: "id" });
if (error) throw new Error("Não foi possível gravar o catálogo de clubes no Supabase.");

const { data: existingClubs, error: existingClubsError } = await supabase
  .from("clubes")
  .select("id")
  .eq("ativo", true);

if (existingClubsError) throw new Error("Não foi possível verificar os clubes ativos no Supabase.");

const currentClubIds = new Set(clubs.map((club) => club.id));
const inactiveClubIds = existingClubs.filter(({ id }) => !currentClubIds.has(id)).map(({ id }) => id);

if (inactiveClubIds.length > 0) {
  const { error: deactivateError } = await supabase.from("clubes").update({ ativo: false }).in("id", inactiveClubIds);
  if (deactivateError) throw new Error("Não foi possível desativar clubes fora da temporada selecionada.");
}

const { count, error: verificationError } = await supabase
  .from("clubes")
  .select("id", { count: "exact", head: true })
  .in("id", clubs.map((club) => club.id))
  .eq("ativo", true);

if (verificationError || count !== clubs.length) {
  throw new Error("O catálogo foi gravado, mas a verificação dos clubes ativos falhou.");
}

console.log(`Catálogo atualizado: ${clubs.length} clubes da Série A ${season}.`);
