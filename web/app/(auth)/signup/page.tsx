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

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { org_name: orgName },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard/onboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-7 py-12 bg-bg">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 no-underline">
            <BrandMark size="md" />
            <span className="font-semibold text-[15px] text-ink">AgentBuffer</span>
          </Link>
        </div>

        <Card className="p-7">
          <h1 className="font-serif font-semibold text-[26px] text-ink leading-tight mb-1">
            Create account
          </h1>
          <p className="text-[12.5px] text-ink-3 mb-6">
            Set up your brand&apos;s AI agent team.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field htmlFor="org" label="Organization name">
              <Input
                id="org"
                type="text"
                placeholder="lumen.coffee"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />
            </Field>
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
            <Field htmlFor="password" label="Password" hint="Min 6 characters">
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
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
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-line text-center text-[12.5px] text-ink-3">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-brand-ink font-semibold hover:underline"
            >
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}

