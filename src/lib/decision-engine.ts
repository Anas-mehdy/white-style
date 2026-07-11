export interface DecisionInput {
  entityId: string;
  spend: number;
  results: number;
  costPerResult: number;
  benchmarkCost: number;
  ageHours: number;
  frequency?: number;
  previousCostPerResult?: number;
  isProtected?: boolean;
  dataFreshnessMinutes: number;
}

export type DecisionType =
  | "hold"
  | "watch"
  | "pause"
  | "decrease_budget"
  | "increase_budget";

export interface AgentDecision {
  type: DecisionType;
  confidence: number;
  budgetChangePercent: number;
  reason: string;
  autonomous: boolean;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function evaluateAd(input: DecisionInput): AgentDecision {
  if (input.isProtected) {
    return {
      type: "hold",
      confidence: 100,
      budgetChangePercent: 0,
      reason: "الكيان محمي من التعديلات الآلية.",
      autonomous: false,
    };
  }

  if (input.dataFreshnessMinutes > 120 || input.ageHours < 48) {
    return {
      type: "watch",
      confidence: 70,
      budgetChangePercent: 0,
      reason: "البيانات غير كافية أو قديمة؛ يستمر الرصد دون تدخل.",
      autonomous: true,
    };
  }

  const spendMultiple = input.benchmarkCost
    ? input.spend / input.benchmarkCost
    : 0;
  const costMultiple = input.benchmarkCost
    ? input.costPerResult / input.benchmarkCost
    : 0;

  if (input.results === 0 && spendMultiple >= 8) {
    return {
      type: "pause",
      confidence: 98,
      budgetChangePercent: 0,
      reason: "الإنفاق تجاوز 8 أضعاف المعيار دون أي نتيجة.",
      autonomous: true,
    };
  }

  if (input.results >= 10 && costMultiple >= 2) {
    return {
      type: "decrease_budget",
      confidence: clamp(Math.round(82 + costMultiple * 5), 82, 97),
      budgetChangePercent: -15,
      reason: "تكلفة النتيجة أعلى من ضعفي معيار الحساب مع عينة كافية.",
      autonomous: true,
    };
  }

  const isFatiguing =
    (input.frequency ?? 0) >= 4 &&
    input.previousCostPerResult !== undefined &&
    input.costPerResult > input.previousCostPerResult * 1.3;

  if (isFatiguing) {
    return {
      type: "decrease_budget",
      confidence: 89,
      budgetChangePercent: -12,
      reason: "ارتفاع التكرار ترافق مع تدهور التكلفة بأكثر من 30%.",
      autonomous: true,
    };
  }

  if (input.results >= 30 && costMultiple > 0 && costMultiple <= 0.75) {
    return {
      type: "increase_budget",
      confidence: 91,
      budgetChangePercent: 12,
      reason: "أداء مستقر وأقل من معيار الحساب مع حجم عينة مناسب.",
      autonomous: true,
    };
  }

  return {
    type: "hold",
    confidence: 84,
    budgetChangePercent: 0,
    reason: "الأداء ضمن النطاق الطبيعي للحساب.",
    autonomous: true,
  };
}
