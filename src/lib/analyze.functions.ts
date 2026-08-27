import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  imageDataUrl: z.string().min(32),
  brandHint: z.string().max(120).optional(),
});

export type AuthenticityVerdict = "authentic" | "suspicious" | "counterfeit" | "unclear";

export interface AnalysisResult {
  verdict: AuthenticityVerdict;
  confidence: number;
  brand: string;
  product: string;
  summary: string;
  redFlags: string[];
  authenticMarkers: string[];
  checkpoints: { label: string; status: "pass" | "warn" | "fail"; detail: string }[];
  recommendation: string;
}

const SYSTEM_PROMPT = `You are a product authentication analyst. Given a photo of a product, judge whether it appears to be a genuine branded item or a counterfeit.
Inspect logo geometry, typography, stitching/finish, materials, print quality, labels, serials, packaging and hardware.
Be honest about uncertainty from photo quality. Respond ONLY with JSON matching:
{"verdict":"authentic|suspicious|counterfeit|unclear","confidence":0-100,"brand":"string","product":"string","summary":"2-3 sentences","redFlags":["..."],"authenticMarkers":["..."],"checkpoints":[{"label":"Logo & typography","status":"pass|warn|fail","detail":"..."}],"recommendation":"one actionable next step"}
Provide 4-6 checkpoints.`;

export const analyzeProduct = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<AnalysisResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: data.brandHint
                  ? `Claimed brand: ${data.brandHint}. Authenticate this product.`
                  : "Authenticate this product.",
              },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Too many requests right now — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Please top up to continue.");
    if (!res.ok) throw new Error(`Analysis failed (${res.status}): ${await res.text()}`);

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not read the analysis result.");
    const parsed = JSON.parse(match[0]) as AnalysisResult;
    return {
      verdict: parsed.verdict ?? "unclear",
      confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),
      brand: parsed.brand ?? "Unknown",
      product: parsed.product ?? "Unknown item",
      summary: parsed.summary ?? "",
      redFlags: parsed.redFlags ?? [],
      authenticMarkers: parsed.authenticMarkers ?? [],
      checkpoints: parsed.checkpoints ?? [],
      recommendation: parsed.recommendation ?? "",
    };
  });
