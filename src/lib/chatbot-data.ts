import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  ChatbotKpiMetrics,
  ChatbotDailyTrend,
  CampaignProfitability,
  ChatbotProduct,
  ChatbotProductVariant,
  ChatbotProductMedia,
  ChatbotOrder,
  ChatbotOrderItem,
  ChatbotChannel,
  ProductDetailViewModel,
  OrderDetailViewModel,
  AdMappingViewModel,
  HealthCardStatus,
  OrderStatus
} from "@/types/chatbot";

export const DEFAULT_ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";

/**
 * 1. Chatbot Overview KPI Data & Daily Trends
 */
export async function getChatbotOverviewData(days = 30, adAccountId?: string) {
  const supabase = await createClient();
  const orgId = DEFAULT_ORGANIZATION_ID;

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const sinceISO = sinceDate.toISOString();

  // Query 1: Conversations count & mode
  const convsQuery = supabase
    .from("ws_chatbot_conversations")
    .select("id, mode, status, created_at")
    .eq("organization_id", orgId);
  
  // Query 2: Orders query
  const ordersQuery = supabase
    .from("ws_chatbot_orders")
    .select("id, status, subtotal, shipping_fee, actual_shipping_cost, cogs, total, gross_profit, created_at, ad_id")
    .eq("organization_id", orgId)
    .gte("created_at", sinceISO);

  // Query 3: Daily Meta Spend
  let spendQuery = supabase
    .from("ad_insights_daily")
    .select("ad_account_id, insight_date, spend")
    .eq("organization_id", orgId)
    .gte("insight_date", sinceISO.split("T")[0]);

  if (adAccountId) {
    spendQuery = spendQuery.eq("ad_account_id", adAccountId);
  }

  const [convsRes, ordersRes, spendRes] = await Promise.all([
    convsQuery,
    ordersQuery,
    spendQuery
  ]);

  const convs = convsRes.data ?? [];
  const orders = ordersRes.data ?? [];
  const spendRows = spendRes.data ?? [];

  // Calculate KPIs
  const openBotConversations = convs.filter(c => c.mode === "bot" && c.status === "open").length;
  const waitingHandoffs = convs.filter(c => c.status === "waiting_handoff" || c.mode === "human").length;

  const confirmedOrdersList = orders.filter(o => o.status === "confirmed");
  const deliveredOrdersList = orders.filter(o => o.status === "delivered");

  const confirmedOrders = confirmedOrdersList.length;
  const deliveredOrders = deliveredOrdersList.length;

  // Delivered revenue uses DELIVERED orders ONLY
  const deliveredRevenue = deliveredOrdersList.reduce((sum, o) => sum + Number(o.total ?? 0), 0);
  
  // Gross profit uses DELIVERED orders ONLY with formula: gross_profit = total - cogs - actual_shipping_cost
  const grossProfit = deliveredOrdersList.reduce((sum, o) => {
    if (o.actual_shipping_cost === null || o.actual_shipping_cost === undefined) return sum;
    const computedProfit = o.gross_profit !== null && o.gross_profit !== undefined
      ? Number(o.gross_profit)
      : (Number(o.total ?? 0) - Number(o.cogs ?? 0) - Number(o.actual_shipping_cost));
    return sum + computedProfit;
  }, 0);

  // Meta spend aggregated separately
  const metaSpend = spendRows.reduce((sum, s) => sum + Number(s.spend ?? 0), 0);

  // Contribution Profit = Delivered Gross Profit - Meta Spend
  const contributionProfit = grossProfit - metaSpend;

  // Conversion Rates
  const totalConvsCount = convs.length || 1;
  const conversionConfirmedPct = Math.round((confirmedOrders / totalConvsCount) * 100 * 10) / 10;
  const conversionDeliveredPct = Math.round((deliveredOrders / totalConvsCount) * 100 * 10) / 10;

  const kpis: ChatbotKpiMetrics = {
    openBotConversations,
    waitingHandoffs,
    confirmedOrders,
    deliveredOrders,
    deliveredRevenue,
    grossProfit,
    metaSpend,
    contributionProfit,
    conversionConfirmedPct,
    conversionDeliveredPct
  };

  // Build daily trend dataset
  const dailyMap = new Map<string, { conversations: number; orders: number; deliveredRevenue: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    dailyMap.set(dateStr, { conversations: 0, orders: 0, deliveredRevenue: 0 });
  }

  for (const c of convs) {
    const dStr = c.created_at.split("T")[0];
    if (dailyMap.has(dStr)) {
      dailyMap.get(dStr)!.conversations++;
    }
  }

  for (const o of orders) {
    const dStr = o.created_at.split("T")[0];
    if (dailyMap.has(dStr)) {
      const entry = dailyMap.get(dStr)!;
      entry.orders++;
      if (o.status === "delivered") {
        entry.deliveredRevenue += Number(o.total ?? 0);
      }
    }
  }

  const dailyTrends: ChatbotDailyTrend[] = Array.from(dailyMap.entries()).map(([date, val]) => ({
    date,
    conversations: val.conversations,
    orders: val.orders,
    deliveredRevenue: val.deliveredRevenue
  }));

  return { kpis, dailyTrends };
}

/**
 * 2. Products Catalog & Detail Data
 */
export async function getProductsList() {
  const supabase = await createClient();
  const orgId = DEFAULT_ORGANIZATION_ID;

  const { data: products, error: pError } = await supabase
    .from("ws_chatbot_products")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (pError) throw new Error(pError.message);

  const productIds = (products ?? []).map(p => p.id);
  let variants: ChatbotProductVariant[] = [];
  let media: ChatbotProductMedia[] = [];

  if (productIds.length > 0) {
    const [vRes, mRes] = await Promise.all([
      supabase.from("ws_chatbot_product_variants").select("*").eq("organization_id", orgId).in("product_id", productIds),
      supabase.from("ws_chatbot_product_media").select("*").eq("organization_id", orgId).in("product_id", productIds)
    ]);
    variants = vRes.data ?? [];
    media = mRes.data ?? [];
  }

  return {
    products: products ?? [],
    variants,
    media
  };
}

export async function getProductDetail(productId: string): Promise<ProductDetailViewModel | null> {
  const supabase = await createClient();
  const orgId = DEFAULT_ORGANIZATION_ID;

  const { data: product } = await supabase
    .from("ws_chatbot_products")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", productId)
    .single();

  if (!product) return null;

  const [vRes, mRes, aRes, mapRes, ordersRes] = await Promise.all([
    supabase.from("ws_chatbot_product_variants").select("*").eq("organization_id", orgId).eq("product_id", productId),
    supabase.from("ws_chatbot_product_media").select("*").eq("organization_id", orgId).eq("product_id", productId).order("option_number", { ascending: true }),
    supabase.from("ws_chatbot_product_aliases").select("*").eq("organization_id", orgId).eq("product_id", productId),
    supabase.from("ws_chatbot_ad_product_mappings").select("*").eq("organization_id", orgId).eq("product_id", productId),
    supabase.from("ws_chatbot_order_items").select("order_id").eq("organization_id", orgId).eq("product_id", productId)
  ]);

  const variants = vRes.data ?? [];
  const media = mRes.data ?? [];
  const aliases = aRes.data ?? [];
  const rawMappings = mapRes.data ?? [];
  const orderItemRows = ordersRes.data ?? [];

  const adIds = rawMappings.map(m => m.ad_id);
  const adNamesMap = new Map<string, string>();
  if (adIds.length > 0) {
    const { data: ads } = await supabase.from("meta_ads").select("id, name").in("id", adIds);
    (ads ?? []).forEach(a => adNamesMap.set(a.id, a.name));
  }

  const adMappings = rawMappings.map(m => ({
    ...m,
    ad_name: adNamesMap.get(m.ad_id) ?? "إعلان غير معنون"
  }));

  const orderIds = Array.from(new Set(orderItemRows.map(o => o.order_id)));
  let recentOrders: ChatbotOrder[] = [];
  if (orderIds.length > 0) {
    const { data: ords } = await supabase
      .from("ws_chatbot_orders")
      .select("*")
      .eq("organization_id", orgId)
      .in("id", orderIds)
      .order("created_at", { ascending: false })
      .limit(10);
    recentOrders = ords ?? [];
  }

  return {
    product,
    variants,
    media,
    aliases,
    adMappings,
    recentOrders
  };
}

/**
 * 3. Orders Pipeline & Detail Data
 */
export async function getOrdersList(statusFilter?: OrderStatus | "all") {
  const supabase = await createClient();
  const orgId = DEFAULT_ORGANIZATION_ID;

  let query = supabase
    .from("ws_chatbot_orders")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: orders, error } = await query;
  if (error) throw new Error(error.message);

  const orderIds = (orders ?? []).map(o => o.id);
  let items: ChatbotOrderItem[] = [];
  if (orderIds.length > 0) {
    const { data: itemRows } = await supabase
      .from("ws_chatbot_order_items")
      .select("*")
      .eq("organization_id", orgId)
      .in("order_id", orderIds);
    items = itemRows ?? [];
  }

  return { orders: orders ?? [], items };
}

export async function getOrderDetail(orderId: string): Promise<OrderDetailViewModel | null> {
  const supabase = await createClient();
  const orgId = DEFAULT_ORGANIZATION_ID;

  const { data: order } = await supabase
    .from("ws_chatbot_orders")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", orderId)
    .single();

  if (!order) return null;

  const [customerRes, itemsRes, zoneRes, attrRes, eventsRes, convRes] = await Promise.all([
    order.customer_id ? supabase.from("ws_chatbot_customers").select("*").eq("organization_id", orgId).eq("id", order.customer_id).single() : Promise.resolve({ data: null }),
    supabase.from("ws_chatbot_order_items").select("*").eq("organization_id", orgId).eq("order_id", orderId),
    order.shipping_zone_id ? supabase.from("ws_chatbot_shipping_zones").select("*").eq("organization_id", orgId).eq("id", order.shipping_zone_id).single() : Promise.resolve({ data: null }),
    order.conversation_id ? supabase.from("ws_chatbot_conversation_attributions").select("*").eq("organization_id", orgId).eq("conversation_id", order.conversation_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("ws_chatbot_order_events").select("*").eq("organization_id", orgId).eq("order_id", orderId).order("created_at", { ascending: true }),
    order.conversation_id ? supabase.from("ws_chatbot_conversations").select("*").eq("organization_id", orgId).eq("id", order.conversation_id).single() : Promise.resolve({ data: null })
  ]);

  return {
    order,
    customer: customerRes.data ?? null,
    items: itemsRes.data ?? [],
    shippingZone: zoneRes.data ?? null,
    attribution: attrRes.data ?? null,
    events: eventsRes.data ?? [],
    conversation: convRes.data ?? null
  };
}

/**
 * 4. Inbox Conversations & Messages (Polling enabled)
 */
export async function getInboxConversations() {
  const supabase = await createClient();
  const orgId = DEFAULT_ORGANIZATION_ID;

  const { data: convs, error } = await supabase
    .from("ws_chatbot_conversations")
    .select("*")
    .eq("organization_id", orgId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  const convIds = (convs ?? []).map(c => c.id);
  const handoffs: Record<string, string> = {};
  if (convIds.length > 0) {
    const { data: hRows } = await supabase
      .from("ws_chatbot_handoffs")
      .select("conversation_id, status")
      .eq("organization_id", orgId)
      .in("conversation_id", convIds);
    (hRows ?? []).forEach(h => {
      handoffs[h.conversation_id] = h.status;
    });
  }

  return { conversations: convs ?? [], handoffs };
}

export async function getConversationMessages(conversationId: string) {
  const supabase = await createClient();
  const orgId = DEFAULT_ORGANIZATION_ID;

  const { data: messages, error } = await supabase
    .from("ws_chatbot_messages")
    .select("*")
    .eq("organization_id", orgId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return messages ?? [];
}

/**
 * 5. Offers & Shipping Settings Data
 */
export async function getOffersAndShippingData() {
  const supabase = await createClient();
  const orgId = DEFAULT_ORGANIZATION_ID;

  const [rulesRes, zonesRes, aliasesRes] = await Promise.all([
    supabase.from("ws_chatbot_discount_rules").select("*").eq("organization_id", orgId).order("priority", { ascending: true }),
    supabase.from("ws_chatbot_shipping_zones").select("*").eq("organization_id", orgId),
    supabase.from("ws_chatbot_shipping_zone_aliases").select("*").eq("organization_id", orgId)
  ]);

  return {
    discountRules: rulesRes.data ?? [],
    shippingZones: zonesRes.data ?? [],
    shippingAliases: aliasesRes.data ?? []
  };
}

/**
 * 6. Attribution & Profitability Aggregation Data
 * Rule: Aggregate delivered orders by ad/campaign/account first.
 * Aggregate Meta spend separately. Join after aggregation.
 */
export async function getAttributionAndProfitabilityData(days = 30) {
  const supabase = await createClient();
  const orgId = DEFAULT_ORGANIZATION_ID;

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const sinceISO = sinceDate.toISOString();

  const [mappingsRes, productsRes, adsRes, campaignsRes, accountsRes, ordersRes, spendRes] = await Promise.all([
    supabase.from("ws_chatbot_ad_product_mappings").select("*").eq("organization_id", orgId).order("priority", { ascending: true }),
    supabase.from("ws_chatbot_products").select("id, name_ar, sku").eq("organization_id", orgId),
    supabase.from("meta_ads").select("id, name, meta_ad_id, campaign_id, adset_id, ad_account_id").eq("organization_id", orgId),
    supabase.from("meta_campaigns").select("id, name, meta_campaign_id").eq("organization_id", orgId),
    supabase.from("meta_ad_accounts").select("id, name, meta_account_id").eq("organization_id", orgId),
    supabase.from("ws_chatbot_orders").select("*").eq("organization_id", orgId).gte("created_at", sinceISO),
    supabase.from("ad_insights_daily").select("ad_account_id, campaign_id, ad_id, spend").eq("organization_id", orgId).gte("insight_date", sinceISO.split("T")[0])
  ]);

  const mappings = mappingsRes.data ?? [];
  const products = productsRes.data ?? [];
  const ads = adsRes.data ?? [];
  const campaigns = campaignsRes.data ?? [];
  const accounts = accountsRes.data ?? [];
  const orders = ordersRes.data ?? [];
  const spendRows = spendRes.data ?? [];

  // Mappings View Models (Supports multiple products per ad)
  const productMap = new Map(products.map(p => [p.id, p]));
  const adMap = new Map(ads.map(a => [a.id, a]));
  const campaignMap = new Map(campaigns.map(c => [c.id, c.name]));
  const accountMap = new Map(accounts.map(a => [a.id, a.name]));

  const mappedAdIds = new Set(mappings.filter(m => m.active).map(m => m.ad_id));
  const unmappedAdsCount = ads.filter(a => !mappedAdIds.has(a.id)).length;

  const adMappingViewModels: AdMappingViewModel[] = mappings.map(m => {
    const adObj = adMap.get(m.ad_id);
    const prodObj = productMap.get(m.product_id);
    return {
      mapping: m,
      product: prodObj ? { ...prodObj, organization_id: orgId } as ChatbotProduct : null,
      ad_name: adObj?.name ?? "إعلان غير معنون",
      campaign_name: adObj ? campaignMap.get(adObj.campaign_id) ?? "—" : "—",
      account_name: adObj ? accountMap.get(adObj.ad_account_id) ?? "—" : "—"
    };
  });

  // Aggregation for Profitability: Group by Campaign
  const campaignStats = new Map<string, {
    campaignName: string;
    accountName: string;
    adAccountId: string;
    confirmedOrders: number;
    confirmedValue: number;
    deliveredOrders: number;
    deliveredRevenue: number;
    cogs: number;
    shippingFee: number;
    actualShippingCost: number;
    grossProfit: number;
    metaSpend: number;
  }>();

  // Aggregate orders by ad/campaign first
  for (const o of orders) {
    const adObj = o.ad_id ? adMap.get(o.ad_id) : null;
    const campaignId = adObj?.campaign_id ?? "unattributed";
    const campaignName = adObj ? (campaignMap.get(adObj.campaign_id) ?? "حملة غير معنونة") : "مبيعات مباشرة / غير منسوبة";
    const accountName = adObj ? (accountMap.get(adObj.ad_account_id) ?? "—") : "—";
    const adAccountId = adObj?.ad_account_id ?? "";

    if (!campaignStats.has(campaignId)) {
      campaignStats.set(campaignId, {
        campaignName,
        accountName,
        adAccountId,
        confirmedOrders: 0,
        confirmedValue: 0,
        deliveredOrders: 0,
        deliveredRevenue: 0,
        cogs: 0,
        shippingFee: 0,
        actualShippingCost: 0,
        grossProfit: 0,
        metaSpend: 0
      });
    }

    const stat = campaignStats.get(campaignId)!;
    if (o.status === "confirmed") {
      stat.confirmedOrders++;
      stat.confirmedValue += Number(o.total ?? 0); // Pipeline value
    } else if (o.status === "delivered") {
      stat.deliveredOrders++;
      stat.deliveredRevenue += Number(o.total ?? 0); // Final revenue
      stat.cogs += Number(o.cogs ?? 0);
      stat.shippingFee += Number(o.shipping_fee ?? 0);
      if (o.actual_shipping_cost !== null && o.actual_shipping_cost !== undefined) {
        const actualCost = Number(o.actual_shipping_cost);
        stat.actualShippingCost += actualCost;
        const computedProfit = o.gross_profit !== null && o.gross_profit !== undefined
          ? Number(o.gross_profit)
          : (Number(o.total ?? 0) - Number(o.cogs ?? 0) - actualCost);
        stat.grossProfit += computedProfit;
      }
    }
  }

  // Aggregate Meta spend separately
  for (const s of spendRows) {
    const campaignId = s.campaign_id ?? "unattributed";
    if (campaignStats.has(campaignId)) {
      campaignStats.get(campaignId)!.metaSpend += Number(s.spend ?? 0);
    }
  }

  // Combine aggregated datasets
  const profitability: CampaignProfitability[] = Array.from(campaignStats.entries()).map(([campaignId, val]) => {
    const contributionProfit = val.grossProfit - val.metaSpend;
    const poas = val.metaSpend > 0 ? val.grossProfit / val.metaSpend : null;

    return {
      campaignId,
      campaignName: val.campaignName,
      adAccountId: val.adAccountId,
      accountName: val.accountName,
      confirmedOrders: val.confirmedOrders,
      confirmedValue: val.confirmedValue,
      deliveredOrders: val.deliveredOrders,
      deliveredRevenue: val.deliveredRevenue,
      cogs: val.cogs,
      shippingFee: val.shippingFee,
      actualShippingCost: val.actualShippingCost,
      grossProfit: val.grossProfit,
      metaSpend: val.metaSpend,
      contributionProfit,
      poas
    };
  });

  return {
    adMappings: adMappingViewModels,
    unmappedAdsCount,
    profitability
  };
}

/**
 * 7. Settings & Health Cards Data
 */
export async function getSettingsAndHealthData() {
  const supabase = await createClient();
  const orgId = DEFAULT_ORGANIZATION_ID;

  const [channelRes, prodRes, varRes, convRes, handoffRes, outboxRes] = await Promise.all([
    supabase.from("ws_chatbot_channels").select("*").eq("organization_id", orgId).maybeSingle(),
    supabase.from("ws_chatbot_products").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("ws_chatbot_product_variants").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("active", true),
    supabase.from("ws_chatbot_conversations").select("mode").eq("organization_id", orgId),
    supabase.from("ws_chatbot_handoffs").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "active"),
    supabase.from("ws_chatbot_conversion_outbox").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "pending")
  ]);

  const channel: ChatbotChannel = channelRes.data ?? {
    id: "default",
    organization_id: orgId,
    provider: "nashir_internal",
    bot_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: null
  };

  const productCount = prodRes.count ?? 0;
  const activeVariantCount = varRes.count ?? 0;
  const convs = convRes.data ?? [];
  const botConvsCount = convs.filter(c => c.mode === "bot").length;
  const humanConvsCount = convs.filter(c => c.mode === "human").length;
  const pendingHandoffsCount = handoffRes.count ?? 0;
  const pendingOutboxCount = outboxRes.count ?? 0;

  const healthCards: HealthCardStatus[] = [
    {
      title: "قناة الاتصال الداخلية",
      value: channel.bot_enabled ? "نشط وشغّال" : "متوقف مؤقتاً",
      status: channel.bot_enabled ? "healthy" : "warning",
      description: `المزود الحالي: ${channel.provider || "داخلي"} (ملاحظة: الربط مع ناشر قادم قريباً)`
    },
    {
      title: "كتالوج المنتجات والأنواع",
      value: `${productCount} منتجات / ${activeVariantCount} أنواع نشطة`,
      status: productCount > 0 ? "healthy" : "warning",
      description: "عدد المنتجات الجاهزة والأنواع النشطة المتاحة في البوت"
    },
    {
      title: "المحادثات (بوت / بشري)",
      value: `${botConvsCount} بوت / ${humanConvsCount} بشري`,
      status: "healthy",
      description: "توزيع المحادثات الحالية بين الرد الآلي والاستلام البشري"
    },
    {
      title: "طلبات التدخل البشري المعلقة",
      value: `${pendingHandoffsCount} طلبات`,
      status: pendingHandoffsCount === 0 ? "healthy" : "warning",
      description: "المحادثات المنتظرة لموظف الدعم لاستلامها"
    },
    {
      title: "صندوق التحويلات المعلق (Outbox)",
      value: `${pendingOutboxCount} أحداث`,
      status: pendingOutboxCount === 0 ? "healthy" : "error",
      description: "الأحداث المعلقة للتسليم إلى الأنظمة الخارجية"
    }
  ];

  return { channel, healthCards };
}
