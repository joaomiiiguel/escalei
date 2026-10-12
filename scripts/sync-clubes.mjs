import { createClient } from "@supabase/supabase-js";

const apiKey = process.env.API_FOOTBALL_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const leagueId = Number(process.env.API_FOOTBALL_LEAGUE_ID ?? "71");
const season = Number(process.env.API_FOOTBALL_SEASON ?? "2024");
const abbreviations = { "Atletico Goianiense": "ACG", "Atletico-MG": "CAM", "Grêmio": "GRE", "São Paulo": "SAO", "Coritiba": "CTB", "Internacional": "INT" };

if (!apiKey || !supabaseUrl || !serviceRoleKey) throw new Error("API_FOOTBALL_KEY, NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
if (!Number.isInteger(leagueId) || !Number.isInteger(season)) throw new Error("API_FOOTBALL_LEAGUE_ID e API_FOOTBALL_SEASON devem ser números inteiros.");

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: existing, error: existingError } = await supabase.from("clubes").select("id, sigla, api_football_id");
if (existingError) throw new Error(`Não foi possível consultar clubes: ${existingError.message}`);

const response = await fetch(`https://v3.football.api-sports.io/teams?league=${leagueId}&season=${season}`, { headers: { "x-apisports-key": apiKey, Accept: "application/json" } });
const payload = await response.json().catch(() => ({}));
if (!response.ok || !Array.isArray(payload.response) || Object.keys(payload.errors ?? {}).length) throw new Error(`API-Football não retornou clubes: HTTP ${response.status}.`);

const byExternalId = new Map((existing ?? []).flatMap((club) => club.api_football_id ? [[club.api_football_id, club]] : []));
const byAbbreviation = new Map((existing ?? []).map((club) => [club.sigla, club]));
const clubs = payload.response.map(({ team }) => {
  const sigla = abbreviations[team.name] ?? team.code?.trim().toUpperCase();
  const saved = byExternalId.get(team.id) ?? byAbbreviation.get(sigla);
  if (!Number.isInteger(team.id) || !team.name?.trim() || !/^[A-Z0-9]{3}$/.test(sigla ?? "")) throw new Error(`Clube inválido retornado pela API-Football: ${team.name ?? team.id}.`);
  return { id: saved?.id ?? 1_100_000_000 + team.id, api_football_id: team.id, nome: team.name.trim(), sigla, logo_url: team.logo ?? null, ativo: true, api_atualizado_em: new Date().toISOString() };
});
if (clubs.length !== 20) throw new Error(`A Série A ${season} retornou ${clubs.length} clubes; sincronização cancelada.`);
const { error } = await supabase.from("clubes").upsert(clubs, { onConflict: "id" });
if (error) throw new Error(`Não foi possível gravar clubes: ${error.message}`);
console.log(`Catálogo atualizado: ${clubs.length} clubes da Série A ${season}, via API-Football.`);
