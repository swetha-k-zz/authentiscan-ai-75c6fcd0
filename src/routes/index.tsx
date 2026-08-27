import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  HelpCircle,
  Upload,
  ScanLine,
  Loader2,
  Check,
  TriangleAlert,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { analyzeProduct, type AnalysisResult } from "@/lib/analyze.functions";

const TITLE = "VerifyLens — AI Product Authenticity Check";
const DESC =
  "Upload a product photo and get an instant AI authenticity verdict: genuine, suspicious, or counterfeit, with the evidence behind it.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const verdictMeta = {
  authentic: { label: "Likely Authentic", Icon: ShieldCheck, tone: "text-success" },
  suspicious: { label: "Suspicious", Icon: ShieldAlert, tone: "text-warning" },
  counterfeit: { label: "Likely Counterfeit", Icon: ShieldX, tone: "text-destructive" },
  unclear: { label: "Inconclusive", Icon: HelpCircle, tone: "text-muted-foreground" },
} as const;

const statusMeta = {
  pass: { Icon: Check, tone: "text-success" },
  warn: { Icon: TriangleAlert, tone: "text-warning" },
  fail: { Icon: X, tone: "text-destructive" },
} as const;

function Index() {
  const [preview, setPreview] = useState<string | null>(null);
  const [brand, setBrand] = useState("");
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const run = useServerFn(analyzeProduct);
  const mutation = useMutation<AnalysisResult, Error, void>({
    mutationFn: async () => run({ data: { imageDataUrl: preview!, brandHint: brand || undefined } }),
  });

  function handleFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    mutation.reset();
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  const result = mutation.data;
  const meta = result ? verdictMeta[result.verdict] ?? verdictMeta.unclear : null;

  return (
    <main className="hero-surface min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <header className="mb-12 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium tracking-wide text-primary uppercase">
            <ScanLine className="size-3.5" /> AI authenticity engine
          </span>
          <h1 className="mt-5 text-4xl leading-tight font-bold sm:text-5xl">
            Is your product genuine — or a convincing fake?
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Upload a clear photo of the item. VerifyLens inspects logo geometry, typography,
            stitching, materials, labels and finish, then reports a verdict with the evidence.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
          <section className="panel p-6">
            <h2 className="text-lg font-semibold">Upload product image</h2>

            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className="relative mt-4 flex aspect-4/3 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-secondary/40 transition-colors hover:border-primary/60"
            >
              {preview ? (
                <>
                  <img
                    src={preview}
                    alt={fileName || "Uploaded product"}
                    className="size-full object-contain"
                  />
                  {mutation.isPending && <span className="scan-beam" />}
                </>
              ) : (
                <div className="px-6 text-center">
                  <Upload className="mx-auto size-7 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">Drop an image or click to browse</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPG or PNG — sharp, well-lit, logo visible
                  </p>
                </div>
              )}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            <div className="mt-5 space-y-2">
              <Label htmlFor="brand">Claimed brand (optional)</Label>
              <Input
                id="brand"
                placeholder="e.g. Nike, Rolex, Apple"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>

            <Button
              className="mt-5 w-full"
              size="lg"
              disabled={!preview || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" /> Analyzing…
                </>
              ) : (
                <>
                  <ScanLine /> Run authenticity check
                </>
              )}
            </Button>

            {mutation.isError && (
              <p className="mt-3 text-sm text-destructive">{mutation.error.message}</p>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              AI guidance only — not an official brand authentication.
            </p>
          </section>

          <section className="panel min-h-100 p-6">
            {!result && !mutation.isPending && (
              <div className="flex h-full min-h-80 flex-col items-center justify-center text-center">
                <ShieldCheck className="size-9 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Your authenticity report will appear here.
                </p>
              </div>
            )}

            {mutation.isPending && (
              <div className="flex h-full min-h-80 flex-col items-center justify-center text-center">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Comparing against known brand signatures…
                </p>
              </div>
            )}

            {result && meta && (
              <div className="space-y-7">
                <div className="glow-ring flex flex-wrap items-center gap-4 rounded-xl bg-secondary/40 p-5">
                  <meta.Icon className={`size-10 ${meta.tone}`} />
                  <div className="min-w-40 flex-1">
                    <p className={`text-xl font-semibold ${meta.tone}`}>{meta.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.brand} · {result.product}
                    </p>
                  </div>
                  <div className="w-40">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Confidence</span>
                      <span>{result.confidence}%</span>
                    </div>
                    <Progress value={result.confidence} className="mt-2" />
                  </div>
                </div>

                <p className="text-sm leading-relaxed">{result.summary}</p>

                {result.checkpoints.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                      Inspection checkpoints
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {result.checkpoints.map((c, i) => {
                        const s = statusMeta[c.status] ?? statusMeta.warn;
                        return (
                          <li
                            key={i}
                            className="flex gap-3 rounded-lg border border-border bg-secondary/30 p-3"
                          >
                            <s.Icon className={`mt-0.5 size-4 shrink-0 ${s.tone}`} />
                            <div>
                              <p className="text-sm font-medium">{c.label}</p>
                              <p className="text-sm text-muted-foreground">{c.detail}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <EvidenceList
                    title="Red flags"
                    items={result.redFlags}
                    tone="text-destructive"
                  />
                  <EvidenceList
                    title="Authentic markers"
                    items={result.authenticMarkers}
                    tone="text-success"
                  />
                </div>

                {result.recommendation && (
                  <div className="rounded-xl border border-border bg-secondary/40 p-4">
                    <p className="text-sm font-semibold">Recommended next step</p>
                    <p className="mt-1 text-sm text-muted-foreground">{result.recommendation}</p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function EvidenceList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: string;
}) {
  return (
    <div>
      <h3 className={`text-sm font-semibold tracking-wide uppercase ${tone}`}>{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">None detected.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-muted-foreground">
              • {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
