import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";

/**
 * Schema-only config for `npx auth generate`.
 * The running app uses src/lib/auth.ts, which stays inert when env vars are missing.
 */
export const auth = betterAuth({
  database: memoryAdapter({}),
  baseURL: "http://localhost:3000",
  secret: "schema-generation-only-not-a-real-secret",
  socialProviders: {
    google: {
      clientId: "schema-generation",
      clientSecret: "schema-generation",
    },
  },
  user: {
    additionalFields: {
      nickname: {
        type: "string",
        required: false,
      },
      avatarColor: {
        type: "string",
        required: false,
      },
    },
  },
});
