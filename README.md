# White Style Smart Agent

منصة عربية ذكية لإدارة وتحسين حسابات **white style** الإعلانية على Meta.

## الوضع الحالي

- Dashboard عربي RTL ببيانات تجريبية مبنية على تقارير الحسابين الحاليين.
- محرك قرارات يدعم الإيقاف والتخفيض والزيادة والمراقبة والحماية.
- Autopilot للتنفيذ الذاتي ضمن حدود مالية وفترات تهدئة وKill Switch.
- Supabase schema متعدد العملاء مع RLS وسجل قرارات وتنفيذ وتحقق وتراجع.
- نقاط API محلية لاختبار صحة النظام ومحرك القرار.

## التشغيل

```bash
pnpm install
pnpm dev
```

ثم افتح `http://localhost:3000`.

## اختبار محرك القرار

أرسل طلب `POST` إلى `/api/agent/evaluate`:

```json
{
  "entityId": "ad-demo-1",
  "spend": 20,
  "results": 0,
  "costPerResult": 0,
  "benchmarkCost": 1.5,
  "ageHours": 72,
  "dataFreshnessMinutes": 10
}
```

## الإعدادات

انسخ `.env.example` إلى `.env.local` عند توفر مشروع Supabase وبيانات Meta وn8n وTelegram.

ملفات قاعدة البيانات داخل `supabase/`، وتشمل migration أولي وseed خاص بمنظمة white style.

مشروع Supabase المتصل: `wsmbaueobuzilyagtnuq` في منطقة `eu-central-1`.
