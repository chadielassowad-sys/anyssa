/**
 * Applique supabase/migration-auteur.sql via l’API Management Supabase.
 * Usage (PowerShell) :
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
 *   node scripts/apply-migration-auteur.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_REF = "aljasquvpmcespjwnmmb";
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error("Variable SUPABASE_ACCESS_TOKEN manquante (token sbp_… depuis Supabase > Account > Access Tokens).");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(here, "..", "supabase", "migration-auteur.sql"), "utf8");

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ query: sql })
});

const text = await res.text();
if (!res.ok) {
  console.error("Échec", res.status, text);
  process.exit(1);
}

console.log("Migration auteur appliquée.");
console.log(text);
