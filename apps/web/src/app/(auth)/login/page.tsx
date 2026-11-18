import { enabledProviders } from "@/lib/oauth";
import { AuthForm } from "../auth-form";
import { oauthErrorMessage, SocialButtons } from "../social-buttons";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const oauthError = oauthErrorMessage(error);
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Sign in to see what your users are asking for.</p>
      {oauthError && (
        <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {oauthError}
        </p>
      )}
      <SocialButtons providers={enabledProviders()} next={next} />
      <AuthForm mode="login" next={next} />
    </>
  );
}
