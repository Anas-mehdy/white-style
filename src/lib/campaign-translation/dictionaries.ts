const GENDER_DICTIONARY: Record<string, string> = {
  all: "الكل",
  male: "ذكور",
  female: "إناث"
};

const COUNTRY_DICTIONARY: Record<string, string> = {
  PS: "فلسطين",
  IL: "إسرائيل",
  JO: "الأردن",
  EG: "مصر",
  AE: "الإمارات",
  SA: "السعودية"
};

const PLACEMENT_DICTIONARY: Record<string, string> = {
  facebook_feed: "آخر أخبار فيسبوك",
  facebook_reels: "ريلز فيسبوك",
  facebook_stories: "قصص فيسبوك",
  instagram_feed: "آخر أخبار إنستغرام",
  instagram_reels: "ريلز إنستغرام",
  instagram_stories: "قصص إنستغرام",
  advantage_plus: "Advantage+ مواضع تلقائية"
};

const OBJECTIVE_DICTIONARY: Record<string, string> = {
  messages: "الرسائل والمحادثات",
  engagement: "التفاعل والنشاط",
  traffic: "زيارات الموقع",
  sales: "المبيعات والتحويلات",
  outcomes: "النتائج والمبيعات"
};

const STATUS_DICTIONARY: Record<string, string> = {
  approved: "معتمد",
  pending_review: "بانتظار المراجعة",
  pending: "بانتظار المراجعة",
  rejected: "مرفوض",
  draft: "مسودة"
};

const CATEGORY_DICTIONARY: Record<string, string> = {
  fashion_and_apparel: "الأزياء والملابس",
  conversations: "المحادثات",
  outcome_engagement: "التفاعل",
  broad: "استهداف واسع",
  conservative: "حذر",
  balanced: "متوازن",
  aggressive: "توسّعي"
};

/**
 * Fallback helper to format unknown strings into readable forms rather than showing [object Object].
 */
export function formatFallbackValue(val: any): string {
  if (val === null || val === undefined) return "غير متوفر";
  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return "بيانات غير صالحة";
    }
  }
  return String(val);
}

export function translateGender(gender: string | null): string {
  if (!gender) return "غير متوفر";
  const key = gender.toLowerCase().trim();
  return GENDER_DICTIONARY[key] || gender;
}

export function translateCountry(code: string | null): string {
  if (!code) return "غير متوفر";
  const key = code.toUpperCase().trim();
  return COUNTRY_DICTIONARY[key] || code;
}

export function translatePlacement(placement: string | null): string {
  if (!placement) return "";
  const key = placement.toLowerCase().trim();
  return PLACEMENT_DICTIONARY[key] || placement;
}

export function translateObjective(objective: string | null): string {
  if (!objective) return "غير متوفر";
  const key = objective.toLowerCase().trim();
  return OBJECTIVE_DICTIONARY[key] || objective;
}

export function translateStatus(status: string | null): string {
  if (!status) return "غير متوفر";
  const key = status.toLowerCase().trim();
  return STATUS_DICTIONARY[key] || status;
}

export function translateCategory(category: string | null): string {
  if (!category) return "غير متوفر";
  const key = category.toLowerCase().trim();
  return CATEGORY_DICTIONARY[key] || category;
}
