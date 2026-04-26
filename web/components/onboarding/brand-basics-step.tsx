"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import type { BrandFormData } from "./onboarding-wizard";

interface Props {
  form: BrandFormData;
  onChange: (updates: Partial<BrandFormData>) => void;
  onNext: () => void;
}

export function BrandBasicsStep({ form, onChange, onNext }: Props) {
  const canProceed =
    form.name.trim() && form.industry.trim() && form.tagline.trim();

  return (
    <Card>
      <CardHeader>
        <h2 className="font-serif font-semibold text-[20px] text-ink leading-tight">
          Brand basics
        </h2>
        <p className="text-[12.5px] text-ink-3 mt-1">
          Tell us about your brand so the agents can write on-brand content.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field label="Brand name">
          <Input
            placeholder="lumen.coffee"
            value={form.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </Field>
        <Field label="Industry">
          <Input
            placeholder="Coffee & Beverage"
            value={form.industry}
            onChange={(e) => onChange({ industry: e.target.value })}
          />
        </Field>
        <Field label="Tagline">
          <Input
            placeholder="Light up your morning"
            value={form.tagline}
            onChange={(e) => onChange({ tagline: e.target.value })}
          />
        </Field>
        <Field label="Target audience">
          <Textarea
            placeholder="Urban professionals aged 25-40 who appreciate specialty coffee"
            value={form.target_audience}
            onChange={(e) => onChange({ target_audience: e.target.value })}
          />
        </Field>
        <Field label="Brand voice">
          <Textarea
            placeholder="Warm, artisan, approachable. We speak like a knowledgeable barista..."
            value={form.voice_description}
            onChange={(e) => onChange({ voice_description: e.target.value })}
          />
        </Field>
        <div className="flex justify-end pt-1">
          <Button variant="primary" onClick={onNext} disabled={!canProceed}>
            Next →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

