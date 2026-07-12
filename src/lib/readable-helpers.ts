// Reusable human-readable helpers for White Style Smart Agent Dashboard

export function translateDecision(decision: unknown): string {
  const d = String(decision || "").trim();
  switch (d) {
    case "decrease_budget":
      return "خفض الميزانية";
    case "increase_budget":
      return "زيادة الميزانية";
    case "pause":
      return "إيقاف";
    case "hold":
      return "إبقاء الميزانية";
    case "watch":
      return "مراقبة";
    default:
      return d || "—";
  }
}

export function translateStatus(status: unknown): string {
  if (!status) return "بانتظار التنفيذ";
  const s = String(status).trim();
  switch (s) {
    case "verified":
      return "تم التنفيذ";
    case "failed":
      return "فشل التنفيذ";
    case "skipped":
      return "تم التخطي";
    case "queued":
    case "executing":
      return "قيد التنفيذ";
    case "rolled_back":
      return "تم التراجع";
    default:
      return s;
  }
}

export function translateEntityType(type: unknown): string {
  const t = String(type || "").trim();
  switch (t) {
    case "campaign":
      return "حملة";
    case "ad_set":
    case "adset":
      return "مجموعة إعلانية";
    case "ad":
      return "إعلان";
    default:
      return t || "—";
  }
}

export function convertMinorUnits(minorUnits: unknown, currency: string = "USD"): number {
  if (minorUnits === null || minorUnits === undefined) return 0;
  
  // Extract number if it's inside an object/string
  let numStr = "";
  if (typeof minorUnits === "object") {
    const obj = minorUnits as Record<string, unknown>;
    const val = obj.daily_budget ?? obj.lifetime_budget ?? obj.budget ?? obj.value;
    if (val !== undefined && val !== null) {
      numStr = String(val);
    }
  } else {
    numStr = String(minorUnits);
  }
  
  const num = Number(numStr.replace(/[^0-9.-]/g, ""));
  if (isNaN(num)) return 0;

  const zeroDecimalCurrencies = ["JPY", "KRW", "VND", "CLP"];
  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return num;
  }
  return num / 100;
}

export function formatCurrency(amount: number, currencyCode: string = "USD"): string {
  const cur = String(currencyCode || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      minimumFractionDigits: cur === "USD" || cur === "EUR" ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${cur}`;
  }
}

// Extract budget number from budget state JSON or numeric fields
export function extractBudgetValue(state: unknown): number | null {
  if (!state) return null;
  if (typeof state === "number") return state;
  if (typeof state === "string") {
    const parsed = Number(state);
    return isNaN(parsed) ? null : parsed;
  }
  if (typeof state === "object") {
    const obj = state as Record<string, unknown>;
    const val = obj.daily_budget ?? obj.lifetime_budget ?? obj.budget ?? obj.value;
    if (val !== undefined && val !== null) {
      const parsed = Number(val);
      return isNaN(parsed) ? null : parsed;
    }
  }
  return null;
}

export function formatBudgetChange(
  beforeState: unknown,
  requestedState: unknown,
  verifiedState: unknown,
  pct: number,
  currency: string = "USD"
): string {
  const beforeRaw = extractBudgetValue(beforeState);
  const requestedRaw = extractBudgetValue(requestedState);
  const verifiedRaw = extractBudgetValue(verifiedState);
  
  const targetVal = verifiedRaw !== null ? verifiedRaw : (requestedRaw !== null ? requestedRaw : null);

  if (beforeRaw !== null && targetVal !== null) {
    const beforeFormatted = formatCurrency(convertMinorUnits(beforeRaw, currency), currency);
    const afterFormatted = formatCurrency(convertMinorUnits(targetVal, currency), currency);
    
    // Calculate percentage change if not provided or to verify
    let percentText = "";
    if (pct) {
      const absPct = Math.abs(pct);
      percentText = pct < 0 ? ` (خفض ${absPct}%)` : ` (زيادة ${absPct}%)`;
    } else {
      const diff = targetVal - beforeRaw;
      if (beforeRaw > 0 && diff !== 0) {
        const calculatedPct = Math.round((diff / beforeRaw) * 100);
        const absPct = Math.abs(calculatedPct);
        percentText = calculatedPct < 0 ? ` (خفض ${absPct}%)` : ` (زيادة ${absPct}%)`;
      }
    }
    
    return `${beforeFormatted} ← ${afterFormatted}${percentText}`;
  }

  // Fallback if we only have the percentage change
  if (pct) {
    const absPct = Math.abs(pct);
    return pct < 0 ? `خفض ${absPct}%` : `زيادة ${absPct}%`;
  }

  return "—";
}

export function formatPauseResult(entityType: unknown): string {
  const type = String(entityType || "").trim();
  switch (type) {
    case "campaign":
      return "تم إيقاف الحملة";
    case "ad_set":
    case "adset":
      return "تم إيقاف المجموعة الإعلانية";
    case "ad":
      return "تم إيقاف الإعلان";
    default:
      return "تم الإيقاف";
  }
}

export function formatArabicDate(dateStr: unknown): string {
  if (!dateStr) return "—";
  const d = new Date(String(dateStr));
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-EG", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function translateMetaError(
  errorCode: unknown,
  errorMessage: unknown
): string {
  const errCode = String(errorCode || "").trim();
  const errMsg = String(errorMessage || "").trim();

  // Check known codes or substrings
  if (errCode === "meta_write_failed" || errMsg.includes("meta_write_failed")) {
    return "تعذر تنفيذ التغيير على Meta";
  }
  if (errCode === "verification_failed" || errMsg.includes("verification_failed")) {
    return "تم إرسال التغيير لكن تعذر التحقق من النتيجة";
  }
  if (errCode === "WHATSAPP_NUMBER_DISCONNECTED" || errMsg.includes("WHATSAPP_NUMBER_DISCONNECTED")) {
    return "رقم واتساب غير مرتبط بشكل صحيح";
  }
  if (errCode === "META_CREATIVE_RESTRICTION" || errMsg.includes("META_CREATIVE_RESTRICTION")) {
    return "توجد مشكلة أو قيود في محتوى الإعلان";
  }
  if (errMsg.includes("permission") || errMsg.includes("OAuth") || errMsg.includes("access token")) {
    return "خطأ في صلاحيات الوصول إلى حساب إعلانات Meta";
  }
  if (errMsg.includes("budget") || errMsg.includes("minimum budget") || errMsg.includes("limit")) {
    return "الميزانية المطلوبة خارج الحدود المسموح بها في Meta";
  }

  // Generic fallback but user-friendly
  return "حدث خطأ أثناء التنفيذ على Meta";
}
