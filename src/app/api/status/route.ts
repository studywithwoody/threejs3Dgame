import { missingAuthEnv } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  const missing = missingAuthEnv();
  return Response.json({
    authConfigured: missing.length === 0,
    missing,
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    // No hosted realtime provider yet. Same-browser BroadcastChannel is the fallback.
    realtimeConfigured: false,
    urlConfigured: Boolean(process.env.BETTER_AUTH_URL),
  });
}
