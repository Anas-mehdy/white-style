import { Database } from './database';

export type ChatbotChannel = Database['public']['Tables']['ws_chatbot_channels']['Row'];
export type ChatbotCustomer = Database['public']['Tables']['ws_chatbot_customers']['Row'];
export type ChatbotConversation = Database['public']['Tables']['ws_chatbot_conversations']['Row'];
export type ChatbotMessage = Database['public']['Tables']['ws_chatbot_messages']['Row'];
export type ChatbotProduct = Database['public']['Tables']['ws_chatbot_products']['Row'];
export type ChatbotProductVariant = Database['public']['Tables']['ws_chatbot_product_variants']['Row'];
export type ChatbotProductMedia = Database['public']['Tables']['ws_chatbot_product_media']['Row'];
export type ChatbotProductAlias = Database['public']['Tables']['ws_chatbot_product_aliases']['Row'];
export type ChatbotShippingZone = Database['public']['Tables']['ws_chatbot_shipping_zones']['Row'];
export type ChatbotShippingZoneAlias = Database['public']['Tables']['ws_chatbot_shipping_zone_aliases']['Row'];
export type ChatbotDiscountRule = Database['public']['Tables']['ws_chatbot_discount_rules']['Row'];
export type ChatbotAdProductMapping = Database['public']['Tables']['ws_chatbot_ad_product_mappings']['Row'];
export type ChatbotConversationAttribution = Database['public']['Tables']['ws_chatbot_conversation_attributions']['Row'];
export type ChatbotOrder = Database['public']['Tables']['ws_chatbot_orders']['Row'];
export type ChatbotOrderItem = Database['public']['Tables']['ws_chatbot_order_items']['Row'];
export type ChatbotOrderEvent = Database['public']['Tables']['ws_chatbot_order_events']['Row'];
export type ChatbotHandoff = Database['public']['Tables']['ws_chatbot_handoffs']['Row'];
export type ChatbotConversionOutbox = Database['public']['Tables']['ws_chatbot_conversion_outbox']['Row'];

// Order Status Enum
export type OrderStatus =
  | 'draft'
  | 'collecting'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

// Overview Filters & Metrics
export interface ChatbotOverviewFilters {
  days: number;
  adAccountId?: string;
  channelId?: string;
  language?: string;
  orderStatus?: OrderStatus | 'all';
}

export interface ChatbotKpiMetrics {
  openBotConversations: number;
  waitingHandoffs: number;
  confirmedOrders: number;
  deliveredOrders: number;
  deliveredRevenue: number;
  grossProfit: number;
  metaSpend: number;
  contributionProfit: number; // delivered gross profit minus Meta spend
  conversionConfirmedPct: number;
  conversionDeliveredPct: number;
}

export interface ChatbotDailyTrend {
  date: string;
  conversations: number;
  orders: number;
  deliveredRevenue: number;
}

export interface CampaignProfitability {
  campaignId: string;
  campaignName: string;
  adAccountId: string;
  accountName: string;
  confirmedOrders: number;
  confirmedValue: number; // Pipeline value
  deliveredOrders: number;
  deliveredRevenue: number; // Final revenue
  cogs: number;
  shippingFee: number;
  actualShippingCost: number;
  grossProfit: number;
  metaSpend: number;
  contributionProfit: number; // Gross profit - Meta spend
  poas: number | null; // Gross profit / Meta spend
}

// Product & Variant Extended Form Types
export interface ProductFormData {
  sku: string;
  name_ar: string;
  name_he: string;
  name_en: string;
  description_ar: string;
  description_he: string;
  description_en: string;
  category: string;
  material: string;
  source_system: string;
  source_id: string;
  active: boolean;
}

export interface VariantFormData {
  sku: string;
  color_code: string;
  color_ar: string;
  color_he: string;
  color_en: string;
  price: number;
  compare_at_price: number | null;
  unit_cost: number;
  stock_quantity: number;
  active: boolean;
}

export interface MediaFormData {
  variant_id?: string | null;
  media_url: string;
  storage_path?: string | null;
  media_type: 'image' | 'video';
  option_number: number; // 1, 2, 3...
  sort_order: number;
  alt_ar: string;
  alt_he: string;
  alt_en: string;
}

export interface ProductDetailViewModel {
  product: ChatbotProduct;
  variants: ChatbotProductVariant[];
  media: ChatbotProductMedia[];
  aliases: ChatbotProductAlias[];
  adMappings: (ChatbotAdProductMapping & { ad_name?: string })[];
  recentOrders: (ChatbotOrder & { customer_name?: string })[];
}

export interface OrderDetailViewModel {
  order: ChatbotOrder;
  customer?: ChatbotCustomer | null;
  items: ChatbotOrderItem[];
  shippingZone?: ChatbotShippingZone | null;
  attribution?: ChatbotConversationAttribution | null;
  events: ChatbotOrderEvent[];
  conversation?: ChatbotConversation | null;
}

export interface AdMappingViewModel {
  mapping: ChatbotAdProductMapping;
  product?: ChatbotProduct | null;
  ad_name?: string;
  campaign_name?: string;
  account_name?: string;
  conversations_count?: number;
  has_source_id?: boolean;
  has_ctwa_clid?: boolean;
}

export interface HealthCardStatus {
  title: string;
  value: string | number;
  status: 'healthy' | 'warning' | 'error' | 'info';
  description: string;
}
