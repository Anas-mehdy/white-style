-- Migration: 20260805153200_add_image_code_to_product_media.sql
-- Description: Adds image_code column to ws_chatbot_product_media table
-- and updates ws_chatbot_get_context RPC to include product media in context.

ALTER TABLE public.ws_chatbot_product_media 
  ADD COLUMN IF NOT EXISTS image_code text;

CREATE OR REPLACE FUNCTION public.ws_chatbot_get_context(p_conversation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_conv public.ws_chatbot_conversations;
  v_customer public.ws_chatbot_customers;
  v_order public.ws_chatbot_orders;
  v_order_items jsonb := '[]'::jsonb;
  v_products jsonb := '[]'::jsonb;
  v_zones jsonb := '[]'::jsonb;
  v_recent_messages jsonb := '[]'::jsonb;
begin
  select * into v_conv from public.ws_chatbot_conversations where id=p_conversation_id;
  if v_conv.id is null then raise exception 'conversation_not_found'; end if;

  select * into v_customer from public.ws_chatbot_customers where id=v_conv.customer_id;

  if v_conv.active_order_id is not null then
    select * into v_order from public.ws_chatbot_orders where id=v_conv.active_order_id;
    
    select jsonb_agg(jsonb_build_object(
      'id', i.id,
      'product_name', i.product_name_snapshot,
      'sku', i.sku_snapshot,
      'color', i.color_snapshot,
      'size', i.size_snapshot,
      'quantity', i.quantity,
      'unit_price', i.unit_price,
      'line_subtotal', i.line_subtotal
    )) into v_order_items
    from public.ws_chatbot_order_items i
    where i.order_id = v_conv.active_order_id;
  end if;

  select jsonb_agg(jsonb_build_object(
    'id', p.id,
    'name_ar', p.name_ar,
    'name_en', p.name_en,
    'sku', p.sku,
    'description', p.description_ar,
    'variants', (
      select jsonb_agg(jsonb_build_object(
        'id', v.id,
        'sku', v.sku,
        'color_ar', v.color_ar,
        'color_en', v.color_en,
        'color_code', v.color_code,
        'size', v.size_code,
        'price', v.price,
        'availability', v.availability
      ))
      from public.ws_chatbot_product_variants v
      where v.product_id = p.id and v.active
    ),
    'media', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'variant_id', m.variant_id,
        'image_code', m.image_code,
        'media_url', m.media_url,
        'storage_path', m.storage_path,
        'active', m.active
      ))
      from public.ws_chatbot_product_media m
      where m.product_id = p.id and m.active = true
    ), '[]'::jsonb)
  )) into v_products
  from public.ws_chatbot_products p
  where p.organization_id = v_conv.organization_id and p.active;

  select jsonb_agg(jsonb_build_object(
    'code', z.code,
    'name_ar', z.name_ar,
    'fee', z.customer_fee,
    'delivery_days_min', z.delivery_days_min,
    'delivery_days_max', z.delivery_days_max
  )) into v_zones
  from public.ws_chatbot_shipping_zones z
  where z.organization_id = v_conv.organization_id and z.active;

  select jsonb_agg(jsonb_build_object(
    'sender', case when m.sender_type = 'customer' then 'Customer' else 'Bot' end,
    'text', m.text_content,
    'time', m.created_at
  )) into v_recent_messages
  from (
    select sender_type, text_content, created_at
    from public.ws_chatbot_messages
    where conversation_id = p_conversation_id
    order by created_at desc
    limit 8
  ) m;

  return jsonb_build_object(
    'conversation', to_jsonb(v_conv),
    'customer', to_jsonb(v_customer),
    'order', case when v_order.id is null then null else to_jsonb(v_order) end,
    'order_items', coalesce(v_order_items, '[]'::jsonb),
    'products', coalesce(v_products, '[]'::jsonb),
    'shipping_zones', coalesce(v_zones, '[]'::jsonb),
    'recent_messages', coalesce(v_recent_messages, '[]'::jsonb)
  );
end;
$function$;
