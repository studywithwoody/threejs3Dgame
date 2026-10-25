import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import * as authSchema from "@/db/auth-schema";
import { getDb } from "@/lib/db";

const schema = {
  user: authSchema.user,
  session: authSchema.session,
  account: authSchema.account,
  verification: authSchema.verification,
  userRelations: authSchema.userRelations,
  sessionRelations: authSchema.sessionRelations,
  accountRelations: authSchema.accountRelations,
};

export function missingAuthEnv(): string[] {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if ((process.env.BETTER_AUTH_SECRET ?? "").length < 32) missing.push("BETTER_AUTH_SECRET");
  if (!process.env.GOOGLE_CLIENT_ID) missing.push("GOOGLE_CLIENT_ID");
  if (!process.env.GOOGLE_CLIENT_SECRET) missing.push("GOOGLE_CLIENT_SECRET");
  return missing;
}

export function isAuthConfigured() {
  return missingAuthEnv().length === 0;
}

function createAuth() {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not set");

  return betterAuth({
    ...(process.env.BETTER_AUTH_URL ? { baseURL: process.env.BETTER_AUTH_URL } : {}),
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [
      "http://localhost:3000",
      "https://threejs3dgame.vercel.app",
      "https://*.vercel.app",
    ],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        prompt: "select_account",
      },
    },
    user: {
      additionalFields: {
        nickname: { type: "string", required: false },
        avatarColor: { type: "string", required: false },
      },
    },
    session: {
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    plugins: [nextCookies()],
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { __dawnAuth?: AuthInstance };

export function getAuth(): AuthInstance | null {
  if (!isAuthConfigured()) return null;
  if (!globalForAuth.__dawnAuth) globalForAuth.__dawnAuth = createAuth();
  return globalForAuth.__dawnAuth;
}
