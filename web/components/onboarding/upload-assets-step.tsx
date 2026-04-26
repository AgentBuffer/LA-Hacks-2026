"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Upload, X } from "lucide-react";
import type { BrandFormData } from "./onboarding-wizard";

interface Props {
  form: BrandFormData;
  onChange: (updates: Partial<BrandFormData>) => void;
  onBack: () => void;
  onNext: () => void;
}

export function UploadAssetsStep({ form, onChange, onBack, onNext }: Props) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === "application/pdf"
      );
      onChange({ pdfs: [...form.pdfs, ...files] });
    },
    [form.pdfs, onChange]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      onChange({ pdfs: [...form.pdfs, ...files] });
    },
    [form.pdfs, onChange]
  );

  function removePdf(index: number) {
    onChange({ pdfs: form.pdfs.filter((_, i) => i !== index) });
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-serif font-semibold text-[20px] text-ink leading-tight">
          Upload assets
        </h2>
        <p className="text-[12.5px] text-ink-3 mt-1">
          Brand guidelines, marketing PDFs, or past videos — anything that helps
          the strategist learn your voice.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border border-dashed border-line-2 rounded-md p-8 text-center hover:border-brand transition-colors cursor-pointer bg-bg-2"
        >
          <input
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="pdf-upload"
          />
          <label htmlFor="pdf-upload" className="cursor-pointer">
            <Upload className="h-7 w-7 text-ink-3 mx-auto mb-2" />
            <p className="text-[12.5px] text-ink-2 font-medium">
              Drop PDFs here or click to upload
            </p>
            <p className="text-[11px] text-ink-3 mt-1 font-mono">
              brand guidelines · marketing decks · content calendars
            </p>
          </label>
        </div>

        {form.pdfs.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {form.pdfs.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center justify-between bg-bg-2 rounded-md px-3 py-2"
              >
                <span className="text-[12.5px] text-ink-2 truncate font-mono">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removePdf(i)}
                  className="text-ink-3 hover:text-crit"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[10.5px] uppercase tracking-wider font-mono text-ink-3">
            Past video URLs (optional)
          </label>
          <Input
            placeholder="https://youtube.com/watch?v=..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const val = (e.target as HTMLInputElement).value.trim();
                if (val) {
                  onChange({ video_urls: [...form.video_urls, val] });
                  (e.target as HTMLInputElement).value = "";
                }
              }
            }}
          />
          {form.video_urls.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.video_urls.map((url, i) => (
                <span
                  key={`${url}-${i}`}
                  className="inline-flex items-center gap-1 bg-bg-2 border border-line text-[11px] font-mono rounded-full px-2.5 py-1 text-ink-2"
                >
                  {url.length > 40 ? `${url.substring(0, 40)}…` : url}
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        video_urls: form.video_urls.filter((_, j) => j !== i),
                      })
                    }
                    className="text-ink-3 hover:text-crit"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between pt-1">
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <Button variant="primary" onClick={onNext}>
            Next →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
