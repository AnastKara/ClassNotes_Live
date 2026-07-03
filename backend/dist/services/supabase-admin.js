import { createClient } from "@supabase/supabase-js";
function getEnvOptional(name) {
    return process.env[name];
}
const SUPABASE_URL = getEnvOptional("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = getEnvOptional("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    // Allow the backend to boot in dev without Supabase credentials.
    // Any endpoint that needs admin privileges will throw a 500 with a clear message.
    console.warn("[supabaseAdmin] Missing env vars: " +
        [
            !SUPABASE_URL ? "SUPABASE_URL" : null,
            !SUPABASE_SERVICE_ROLE_KEY ? "SUPABASE_SERVICE_ROLE_KEY" : null,
        ]
            .filter(Boolean)
            .join(", "));
}
// If Supabase creds are missing, export a lazy getter that throws on usage.
// (Avoid Proxy-on-null, which crashes at runtime.)
export function supabaseAdmin() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Supabase admin client is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            storage: undefined,
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}
// Real client (created lazily only when creds exist)
function createAdminClient() {
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            storage: undefined,
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}
let _supabaseAdmin;
export async function getSupabaseAdmin() {
    if (!_supabaseAdmin)
        _supabaseAdmin = createAdminClient();
    return _supabaseAdmin;
}
