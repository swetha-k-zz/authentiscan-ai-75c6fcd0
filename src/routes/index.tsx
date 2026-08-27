import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
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
  Camera,
  RefreshCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { analyzeProduct, type AnalysisResult } from "@/lib/analyze.functions";

const TITLE = "VerifyLens — AI Product Authenticity Check";
const DESC =
  "Upload or capture a product photo and get an instant AI authenticity verdict: genuine, suspicious, or counterfeit, with the evidence behind it.";

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
  authentic: { label: "Likely Authentic", Icon: ShieldCheck, tone: "text-success", bar: "bg-success" },
  suspicious: { label: "Suspicious", Icon: ShieldAlert, tone: "text-warning", bar: "bg-warning" },
  counterfeit: { label: "Likely Counterfeit", Icon: ShieldX, tone: "text-destructive", bar: "bg-destructive" },
  unclear: { label: "Inconclusive", Icon: HelpCircle, tone: "text-muted-foreground", bar: "bg-muted-foreground" },
} as const;

const statusMeta = {
  pass: { Icon: Check, tone: "text-success", dot: "bg-success" },
  warn: { Icon: TriangleAlert, tone: "text-warning", dot: "bg-warning" },
  fail: { Icon: X, tone: "text-destructive", dot: "bg-destructive" },
} as const;

const BRAND_CHIPS = ["Nike", "Louis Vuitton", "Rolex", "Apple"];

function Index() {
  const [preview, setPreview] = useState<string | null>(null);
  const [brand, setBrand] = useState("");
  const [fileName, setFileName] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  async function openCamera() {
    setCameraError(null);
    mutation.reset();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      setCameraError("Camera unavailable — check permissions, or upload a photo instead.");
    }
  }

  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOpen]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    setPreview(canvas.toDataURL("image/jpeg", 0.9));
    setFileName("camera-capture.jpg");
    stopCamera();
  }

  const result = mutation.data;
  const meta = result ? verdictMeta[result.verdict] ?? verdictMeta.unclear : null;
  const passed = result?.checkpoints.filter((c) => c.status === "pass").length ?? 0;

  return (
    <main className="hero-surface min-h-screen">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-8 sm:px-6 md:grid-cols-12 md:py-12">
        {/* Brand / hero tile */}
        <header className="panel flex flex-col justify-between gap-8 p-8 md:col-span-8">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="glow-ring grid size-10 place-items-center rounded-xl bg-primary">
                <ShieldCheck className="size-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold tracking-tight">VerifyLens</span>
            </div>
            <h1 className="max-w-md text-4xl leading-tight font-semibold sm:text-5xl">
              AI-Powered <span className="text-primary">Authenticity</span> Verification.
            </h1>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              Upload or capture a clear photo of the item. VerifyLens inspects logo geometry,
              typography, stitching, materials, labels and finish, then reports a verdict with
              the evidence.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" /> Real-time scanning
            </span>
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" /> Evidence-based verdicts
            </span>
          </div>
        </header>

        {/* Brand tile */}
        <section className="panel flex flex-col gap-4 p-6 md:col-span-4">
          <h2 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Identify brand
          </h2>
          <Input
            aria-label="Claimed brand"
            placeholder="Enter brand name…"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {BRAND_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setBrand(chip)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  brand === chip
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
          <p className="mt-auto text-xs text-muted-foreground">
            Optional — a brand hint sharpens the inspection.
          </p>
        </section>

        {/* Upload / camera tile */}
        <section className="panel flex flex-col gap-4 p-6 md:col-span-5">
          {cameraOpen ? (
            <div className="relative flex-1 overflow-hidden rounded-2xl border border-border bg-background">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="size-full min-h-64 object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-3 bg-gradient-to-t from-background/90 to-transparent p-4">
                <Button onClick={capturePhoto}>
                  <Camera /> Capture
                </Button>
                <Button variant="secondary" onClick={stopCamera}>
                  <X /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className="group relative flex min-h-56 flex-1 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50 hover:bg-secondary/40"
            >
              {preview ? (
                <>
                  <img
                    src={preview}
                    alt={fileName || "Uploaded product"}
                    className="absolute inset-0 size-full object-contain"
                  />
                  {mutation.isPending && <span className="scan-beam" />}
                  <span className="absolute right-3 top-3 rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                    Click to replace
                  </span>
                </>
              ) : (
                <>
                  <div className="mb-4 grid size-12 place-items-center rounded-full bg-secondary transition-transform group-hover:scale-110">
                    <Upload className="size-6 text-primary" />
                  </div>
                  <p className="font-medium">Drop item images here</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPG or PNG — sharp, well-lit, logo visible
                  </p>
                </>
              )}
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {!cameraOpen && (
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={openCamera}>
                <Camera /> Open camera
              </Button>
              <Button
                disabled={!preview || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin" /> Analyzing…
                  </>
                ) : (
                  <>
                    <ScanLine /> Run check
                  </>
                )}
              </Button>
            </div>
          )}

          {cameraError && <p className="text-xs text-destructive">{cameraError}</p>}
          {mutation.isError && <p className="text-sm text-destructive">{mutation.error.message}</p>}
          <p className="text-xs text-muted-foreground">
            AI guidance only — not an official brand authentication.
          </p>
        </section>

        {/* Report tile */}
        <section className="panel relative overflow-hidden p-6 md:col-span-7">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Inspection report
            </h2>
            <span
              className={`rounded-full border px-3 py-1 text-[10px] tracking-widest uppercase ${
                result
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-secondary/40 text-muted-foreground"
              }`}
            >
              {mutation.isPending ? "Scanning…" : result ? "Analysis ready" : "Awaiting scan"}
            </span>
          </div>

          {!result && !mutation.isPending && (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <ShieldCheck className="size-9 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                Your authenticity report will appear here.
              </p>
            </div>
          )}

          {mutation.isPending && (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">
                Comparing against known brand signatures…
              </p>
            </div>
          )}

          {result && meta && (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div className="flex flex-col gap-6">
                <div>
                  <div className={`flex items-center gap-3 text-3xl font-bold ${meta.tone}`}>
                    <meta.Icon className="size-8 shrink-0" />
                    {meta.label}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {result.brand} · {result.product}
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${meta.bar}`}
                        style={{ width: `${result.confidence}%` }}
                      />
                    </div>
                    <span className="font-mono text-sm text-primary">
                      {result.confidence}% confidence
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {result.summary}
                  </p>
                </div>

                {result.checkpoints.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Checkpoints</span>
                      <span>
                        {passed}/{result.checkpoints.length} passed
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {result.checkpoints.map((c, i) => {
                        const s = statusMeta[c.status] ?? statusMeta.warn;
                        return (
                          <li
                            key={i}
                            className="rounded-lg border border-border bg-secondary/30 p-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`size-2 shrink-0 rounded-full ${s.dot}`} />
                              <span className="text-sm font-medium">{c.label}</span>
                              <s.Icon className={`ml-auto size-4 shrink-0 ${s.tone}`} />
                            </div>
                            <p className="mt-1 pl-5 text-xs text-muted-foreground">{c.detail}</p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <span className="mb-2 block text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                    Authentic markers
                  </span>
                  {result.authenticMarkers.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">None identified.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {result.authenticMarkers.map((m, i) => (
                        <span
                          key={i}
                          className="rounded-lg border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
                  <span className="mb-2 block text-[10px] font-semibold tracking-widest text-destructive uppercase">
                    Red flags
                  </span>
                  {result.redFlags.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No anomalies detected in the current inspection.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {result.redFlags.map((f, i) => (
                        <li key={i} className="flex gap-2 text-xs">
                          <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {result.recommendation && (
                  <div className="rounded-2xl border border-border bg-secondary/40 p-4">
                    <p className="text-sm font-semibold">Recommended next step</p>
                    <p className="mt-1 text-sm text-muted-foreground">{result.recommendation}</p>
                  </div>
                )}

                <Button variant="secondary" size="sm" onClick={() => mutation.reset()}>
                  <RefreshCcw /> New scan
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
