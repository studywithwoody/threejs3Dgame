import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NOT_CONFIGURED = {
  error: "auth_not_configured",
  message:
    "Google 登入尚未設定。請在環境變數設定 BETTER_AUTH_SECRET、GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET 與 DATABASE_URL。本地與正式環境還需要 BETTER_AUTH_URL。",
};

async function handle(request: NextRequest) {
  const auth = getAuth();
  if (!auth) return NextResponse.json(NOT_CONFIGURED, { status: 503 });

  try {
    const handler = toNextJsHandler(auth);
    if (request.method === "POST") return await handler.POST(request);
    return await handler.GET(request);
  } catch (error) {
    console.error("[auth]", error);
    return NextResponse.json(
      { error: "auth_error", message: "登入服務暫時無法連線資料庫。" },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;
