import { evaluateAd } from "@/lib/decision-engine";
import { z } from "zod";

const decisionInputSchema = z.object({
  entityId: z.string().min(1),
  spend: z.number().nonnegative(),
  results: z.number().int().nonnegative(),
  costPerResult: z.number().nonnegative(),
  benchmarkCost: z.number().positive(),
  ageHours: z.number().nonnegative(),
  frequency: z.number().nonnegative().optional(),
  previousCostPerResult: z.number().nonnegative().optional(),
  isProtected: z.boolean().optional(),
  dataFreshnessMinutes: z.number().nonnegative(),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = decisionInputSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      {
        error: "invalid_decision_input",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  return Response.json({
    entityId: parsed.data.entityId,
    decision: evaluateAd(parsed.data),
    ruleVersion: "v1.0.0",
    evaluatedAt: new Date().toISOString(),
  });
}
