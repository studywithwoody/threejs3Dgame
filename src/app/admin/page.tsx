import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AdminSceneControl from "./AdminSceneControl";
import { getAuth, isAuthConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (isAuthConfigured() || process.env.NODE_ENV === "production") {
    const auth = getAuth();
    const session = auth ? await auth.api.getSession({ headers: await headers() }) : null;
    const role = session?.user ? (session.user as typeof session.user & { role?: string }).role : null;
    if (!session?.user || role !== "admin") redirect("/");
  }
  return <AdminSceneControl />;
}
