"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Check } from "lucide-react";
import type { BrandKit } from "@/lib/types/models";

interface Props {
  brandKit: BrandKit;
}

export function BrandKitReview({ brandKit }: Props) {
  return (
    <div className="max-w-[680px] mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-ok-soft border border-ok grid place-items-center">
          <Check className="h-4 w-4 text-ok" />
        </div>
        <div>
          <h2 className="font-serif font-semibold text-[20px] text-ink leading-tight">
            Brand kit extracted
          </h2>
          <p className="text-[12.5px] text-ink-3 mt-0.5">
            Review the results below — agents will use this voice on every post.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-serif font-semibold text-[18px] text-ink">
            {brandKit.name}
          </h3>
          <p className="text-[11px] text-ink-3 mt-0.5 font-mono uppercase tracking-wider">
            {brandKit.industry}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Tagline">
            <p className="text-[13px] text-ink leading-[1.55]">
              {brandKit.tagline}
            </p>
          </Field>
          <Field label="Brand voice">
            <p className="text-[13px] text-ink leading-[1.55]">
              {brandKit.voice_description}
            </p>
          </Field>
          <Field label="Target audience">
            <p className="text-[13px] text-ink leading-[1.55]">
              {brandKit.target_audience}
            </p>
          </Field>
          <Field label="Color palette">
            <div className="flex gap-2 mt-1">
              {brandKit.color_palette.map((color) => (
                <div key={color} className="flex items-center gap-1.5">
                  <div
                    className="h-6 w-6 rounded-md border border-line"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[11px] text-ink-3 font-mono">
                    {color}
                  </span>
                </div>
              ))}
            </div>
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Link href="/dashboard/calendar">
          <Button variant="primary" size="lg">
            Go to calendar →
          </Button>
        </Link>
      </div>
    </div>
  );
}

