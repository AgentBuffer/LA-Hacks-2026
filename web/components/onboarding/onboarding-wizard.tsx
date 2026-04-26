"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BrandBasicsStep } from "./brand-basics-step";
import { UploadAssetsStep } from "./upload-assets-step";
import { ConnectSocialsStep } from "./connect-socials-step";
import { BrandKitReview } from "./brand-kit-review";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandMark } from "@/components/ui/brand-mark";
import { seedDemoBrand } from "@/actions/seed";
import { saveExtractedBrandKit } from "@/actions/brands";
import { cn } from "@/lib/utils";
import type { BrandKit } from "@/lib/types/models";

const STEPS = ["Brand basics", "Upload assets", "Connect & extract"];

export interface BrandFormData {
  name: string;
  industry: string;
  tagline: string;
  target_audience: string;
  voice_description: string;
  pdfs: File[];
  video_urls: string[];
  linkedin_url: string;
  x_url: string;
  instagram_url: string;
  tiktok_url: string;
}

const INITIAL_FORM: BrandFormData = {
  name: "",
  industry: "",
  tagline: "",
  target_audience: "",
  voice_description: "",
  pdfs: [],
  video_urls: [],
  linkedin_url: "",
  x_url: "",
  instagram_url: "",
  tiktok_url: "",
};

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<BrandFormData>(INITIAL_FORM);
  const [extractedKit, setExtractedKit] = useState<BrandKit | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [seeding, startSeed] = useTransition();
  const router = useRouter();

  function updateForm(updates: Partial<BrandFormData>) {
    setForm((prev) => ({ ...prev, ...updates }));
  }

  async function handleExtract() {
    setExtracting(true);
    try {
      const saved = await saveExtractedBrandKit({
        name: form.name,
        industry: form.industry,
        tagline: form.tagline,
        target_audience: form.target_audience,
        voice_description: form.voice_description,
        color_palette: ["#7C9F3F", "#E8E2D4", "#2C2419"],
        sample_captions: [],
      });
      setExtractedKit(saved);
      toast.success("Brand kit saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setExtracting(false);
    }
  }

  function handleDemo() {
    startSeed(async () => {
      try {
        const res = await seedDemoBrand();
        if (res.alreadySeeded) {
          toast.info("Lumen Coffee data already loaded.");
        } else {
          toast.success("Lumen Coffee sample data loaded.");
        }
        router.push("/dashboard/calendar");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Seed failed");
      }
    });
  }

  if (extractedKit) {
    return <BrandKitReview brandKit={extractedKit} />;
  }

  return (
    <div className="max-w-[680px] mx-auto flex flex-col gap-6">
      <Card className="p-5 flex items-start gap-4 bg-brand-soft border-brand">
        <BrandMark size="lg" className="shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-serif font-semibold text-[18px] text-ink leading-tight">
            Try with Lumen Coffee sample data
          </div>
          <div className="text-[12.5px] text-ink-2 mt-1 leading-[1.55]">
            Drops a fully-populated demo brand into your workspace — 7 calendar
            slots, 3 cognition agents, and a recorded critic rejection beat.
            You can still set up your own brand below.
          </div>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={handleDemo}
          disabled={seeding}
        >
          {seeding ? "Loading…" : "Use demo brand →"}
        </Button>
      </Card>

      {/* Divider */}
      <div className="flex items-center gap-3 px-1">
        <div className="flex-1 h-px bg-line" />
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
          or set up your own
        </span>
        <div className="flex-1 h-px bg-line" />
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <div key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  "h-7 w-7 rounded-md grid place-items-center text-[11px] font-mono font-semibold border-[1.2px]",
                  done && "bg-ink text-paper border-ink",
                  current && "bg-paper text-ink border-ink",
                  !done && !current && "bg-paper text-ink-3 border-line border-dashed"
                )}
              >
                {i + 1}
              </span>
              <span
                className={cn(
                  "text-[12px] font-mono uppercase tracking-wider",
                  current ? "text-ink font-semibold" : "text-ink-3"
                )}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <span className="w-6 h-px bg-line ml-1" />
              )}
            </div>
          );
        })}
      </div>

      {step === 0 && (
        <BrandBasicsStep
          form={form}
          onChange={updateForm}
          onNext={() => setStep(1)}
        />
      )}
      {step === 1 && (
        <UploadAssetsStep
          form={form}
          onChange={updateForm}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <ConnectSocialsStep
          form={form}
          onChange={updateForm}
          onBack={() => setStep(1)}
          onExtract={handleExtract}
          extracting={extracting}
        />
      )}
    </div>
  );
}
