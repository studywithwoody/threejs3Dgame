import { missingAuthEnv } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  const missing = missingAuthEnv();
  const realtimeConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
  return Response.json({
    authConfigured: missing.length === 0,
    missing,
    realtimeConfigured,
    urlConfigured: Boolean(process.env.BETTER_AUTH_URL),
  });
}
