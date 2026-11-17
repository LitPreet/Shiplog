import { AuthForm } from "../auth-form";

export const metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Free while in beta. Your first board is live in a minute.</p>
      <AuthForm mode="signup" next={next} />
    </>
  );
}
