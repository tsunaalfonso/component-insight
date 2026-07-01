import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";

const InputSchema = z.object({
  imagePath: z.string().min(1),
  bucket: z.enum(["component-images", "camera-captures"]),
});

const DiagnosisSchema = z.object({
  component_name: z.string(),
  package_type: z.string(),
  manufacturer: z.string(),
  visible_damage: z.array(z.string()),
  severity: z.enum(["none", "minor", "moderate", "severe", "unknown"]),
  possible_cause: z.string(),
  confidence: z.number().min(0).max(100),
  summary: z.string(),
  recommendation: z.string(),
  repairability: z.enum(["repairable", "replace_recommended", "unrepairable", "unknown"]),
  status: z.enum(["healthy", "defective", "severe", "unknown"]),
});

const SYSTEM_PROMPT = `You are a senior electronics diagnostic AI assisting a repair laboratory technician analyzing integrated circuits (ICs) and electronic components.

Analyze the image and identify visible defects including: burn marks, broken pins, corrosion, oxidation, missing pins, bent pins, physical cracks, heat damage, package deformation, PCB contamination, improper solder residue, label readability issues, and surface discoloration.

Assess overall condition and choose status:
- "healthy": no visible defects
- "defective": one or more minor/moderate defects
- "severe": severe damage (heavy burns, cracks, major missing pins)
- "unknown": image insufficient (blurry, obscured, not a component)

Return an unbiased, technical assessment. Never invent details you cannot see. Confidence must reflect image clarity and your certainty (0-100).

For recommendation, give clear actionable numbered steps appropriate to the detected condition (e.g. replace IC, straighten pins with tweezers, clean with IPA, verify power supply). For healthy components recommend electrical continuity testing with a multimeter.

Return manufacturer as empty string if not visible on the package. Return component_name as best-guess from markings (or "Unknown IC" if unreadable). Package type examples: DIP-8, SOIC-14, TQFP-64, BGA, QFN-32, TO-220.`;

export const analyzeComponent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI gateway not configured");

    // Signed URL to the private image
    const { data: signed, error: signErr } = await context.supabase
      .storage.from(data.bucket).createSignedUrl(data.imagePath, 60 * 10);
    if (signErr || !signed?.signedUrl) throw new Error(signErr?.message || "Could not sign image URL");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    let result;
    try {
      result = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this electronic component / IC and return a structured diagnosis." },
              { type: "image", image: signed.signedUrl },
            ],
          },
        ],
        output: Output.object({ schema: DiagnosisSchema }),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("429")) throw new Error("AI rate limit reached. Try again shortly.");
      if (message.includes("402")) throw new Error("AI credits exhausted. Please top up your workspace.");
      throw new Error(`AI analysis failed: ${message}`);
    }

    const analysis = result.output;

    // Public URL not usable (private bucket); store storage path — client will sign as needed.
    const { data: inserted, error: insertErr } = await context.supabase
      .from("diagnoses")
      .insert({
        user_id: context.userId,
        image_url: data.imagePath,
        image_path: data.imagePath,
        source: data.bucket === "camera-captures" ? "camera" : "upload",
        component_name: analysis.component_name,
        package_type: analysis.package_type,
        manufacturer: analysis.manufacturer || null,
        visible_damage: analysis.visible_damage,
        severity: analysis.severity,
        possible_cause: analysis.possible_cause,
        confidence: analysis.confidence,
        summary: analysis.summary,
        recommendation: analysis.recommendation,
        repairability: analysis.repairability,
        status: analysis.status,
        raw_analysis: analysis,
      })
      .select("*")
      .single();

    if (insertErr) throw new Error(insertErr.message);

    await context.supabase.from("system_logs").insert({
      user_id: context.userId,
      action: "diagnosis.create",
      metadata: { diagnosis_id: inserted.id, status: analysis.status, confidence: analysis.confidence },
    });

    return { id: inserted.id as string };
  });
