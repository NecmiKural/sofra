import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/admin");
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-sm p-6">
        <div className="text-center text-4xl">🍽️</div>
        <h1 className="mt-2 text-center text-xl font-bold">Sofra staff panel</h1>
        <p className="mt-1 text-center text-sm muted">Sign in to manage your venue.</p>
        <LoginForm />
      </div>
    </div>
  );
}
