import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Applies drizzle/ the same way `drizzle-kit migrate` does (drizzle-orm's
// postgres.js migrator, table drizzle.__drizzle_migrations). The CLI progress
// view discards the error and exits, so CI would only see a spinner. This
// script prints the failure and scrubs connection strings from the logs.
//
// URL resolution matches drizzle.config.ts: DATABASE_URL_UNPOOLED, then
// DATABASE_URL, then a local Postgres default. `.env.local` is loaded only
// when it exists, and does not override variables already in the environment.

const CONNECTION_URL = /\bpostgres(?:ql)?:\/\/[^\s'"`]+/gi;

function secretValuesFrom(env) {
  return [env.DATABASE_URL_UNPOOLED, env.DATABASE_URL].filter(
    (value) => typeof value === "string" && value.length > 0,
  );
}

function redact(text, env = process.env) {
  let out = text.replace(CONNECTION_URL, "postgres://[redacted]");
  const secrets = secretValuesFrom(env);
  for (const secret of secrets) out = out.split(secret).join("[redacted]");
  for (const secret of secrets) {
    let password = "";
    try {
      password = new URL(secret).password;
    } catch {
      continue;
    }
    if (!password || password.length < 8) continue;
    out = out.split(password).join("[redacted]");
    try {
      const decoded = decodeURIComponent(password);
      if (decoded !== password) out = out.split(decoded).join("[redacted]");
    } catch {
      // Password is not valid percent-encoding.
    }
  }
  return out;
}

function formatError(error) {
  const lines = [];
  const seen = new Set();
  const queue = [error];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    if (current instanceof Error) {
      lines.push(current.stack || current.message);
      if (current.cause) queue.push(current.cause);
      if (Array.isArray(current.errors)) queue.push(...current.errors);
    } else {
      lines.push(String(current));
    }
  }
  return lines.join("\nCaused by: ");
}

function pipeRedacted(childStream, outStream, state) {
  childStream.setEncoding("utf8");
  childStream.on("data", (chunk) => {
    state.pending += chunk;
    const cut = Math.max(state.pending.lastIndexOf("\n"), state.pending.lastIndexOf("\r"));
    if (cut === -1) return;
    outStream.write(redact(state.pending.slice(0, cut + 1)));
    state.pending = state.pending.slice(cut + 1);
  });
}

function flushPending(outStream, state) {
  if (!state.pending) return;
  outStream.write(redact(state.pending));
  state.pending = "";
}

function launch() {
  const entry = fileURLToPath(import.meta.url);
  const args = [];
  if (existsSync(".env.local")) args.push("--env-file=.env.local");
  args.push(entry, "--apply");

  const child = spawn(process.execPath, args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  const stdout = { pending: "" };
  const stderr = { pending: "" };
  pipeRedacted(child.stdout, process.stdout, stdout);
  pipeRedacted(child.stderr, process.stderr, stderr);

  let finished = false;
  const finish = (code) => {
    if (finished) return;
    finished = true;
    flushPending(process.stdout, stdout);
    flushPending(process.stderr, stderr);
    process.exitCode = code ?? 1;
  };

  child.on("error", (error) => {
    console.error(redact(error.message));
    finish(1);
  });
  child.on("close", (code, signal) => {
    if (signal) finish(1);
    else finish(code === null ? 1 : code);
  });
}

async function apply() {
  const postgres = (await import("postgres")).default;
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");

  const url =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    "postgres://localhost:5432/postgres";

  const sql = postgres(url, { max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
    console.log("Migrations applied.");
  } catch (error) {
    console.error(redact(formatError(error)));
    process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

if (process.argv[2] === "--apply") {
  await apply();
} else {
  launch();
}
