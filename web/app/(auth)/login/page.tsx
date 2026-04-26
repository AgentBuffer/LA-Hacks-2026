"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { BrandMark } from "@/components/ui/brand-mark";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard/calendar");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-7 py-12 bg-bg">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 no-underline">
            <BrandMark size="md" />
            <span className="font-semibold text-[15px] text-ink">MediaFlow</span>
          </Link>
        </div>

        <Card className="p-7">
          <h1 className="font-serif font-semibold text-[26px] text-ink leading-tight mb-1">
            Sign in
          </h1>
          <p className="text-[12.5px] text-ink-3 mb-6">
            Welcome back to your brand&apos;s agents.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field htmlFor="email" label="Email">
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field htmlFor="password" label="Password">
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>

            {error && (
              <div className="text-[12px] text-crit border border-crit border-dashed rounded-md px-3 py-2 bg-crit-soft">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-1"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-line text-center text-[12.5px] text-ink-3">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-brand-ink font-semibold hover:underline"
            >
              Sign up
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}

