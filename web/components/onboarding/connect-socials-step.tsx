"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Sparkles, Loader2 } from "lucide-react";
import type { BrandFormData } from "./onboarding-wizard";

interface Props {
  form: BrandFormData;
  onChange: (updates: Partial<BrandFormData>) => void;
  onBack: () => void;
  onExtract: () => void;
  extracting: boolean;
}

export function ConnectSocialsStep({
  form,
  onChange,
  onBack,
  onExtract,
  extracting,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-serif font-semibold text-[20px] text-ink leading-tight">
          Connect socials & extract
        </h2>
        <p className="text-[12.5px] text-ink-3 mt-1">
          Link the channels the publisher should post to. Voice is extracted
          from past posts.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field label="LinkedIn URL">
          <Input
            placeholder="https://linkedin.com/company/lumen-coffee"
            value={form.linkedin_url}
            onChange={(e) => onChange({ linkedin_url: e.target.value })}
          />
        </Field>
        <Field label="X (Twitter) URL">
          <Input
            placeholder="https://x.com/lumencoffee"
            value={form.x_url}
            onChange={(e) => onChange({ x_url: e.target.value })}
          />
        </Field>
        <Field label="Instagram URL">
          <Input
            placeholder="https://instagram.com/lumencoffee"
            value={form.instagram_url}
            onChange={(e) => onChange({ instagram_url: e.target.value })}
          />
        </Field>
        <Field label="TikTok URL">
          <Input
            placeholder="https://tiktok.com/@lumencoffee"
            value={form.tiktok_url}
            onChange={(e) => onChange({ tiktok_url: e.target.value })}
          />
        </Field>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack} disabled={extracting}>
            ← Back
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={onExtract}
            disabled={extracting}
          >
            {extracting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Extracting…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Extract brand kit with AI
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

