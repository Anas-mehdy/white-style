-- Migration: 20260802130800_chatbot_product_bundle_rpc_v2.sql
-- Description: Transactional product bundle RPC with SECURITY DEFINER SET search_path = '',
-- fully qualified references, idempotency concurrency, alias normalization, and option uniqueness indexes.

-- 1. Ensure required columns exist on public tables without altering existing columns
ALTER TABLE public.ws_chatbot_product_aliases 
  ADD COLUMN IF NOT EXISTS normalized_alias text;

ALTER TABLE public.ws_chatbot_product_media 
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

ALTER TABLE public.ws_chatbot_product_variants
  ADD COLUMN IF NOT EXISTS size_code text,
  ADD COLUMN IF NOT EXISTS availability text DEFAULT 'in_stock',
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.ws_chatbot_products
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Idempotency table
CREATE TABLE IF NOT EXISTS public.ws_chatbot_product_idempotency_keys (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  payload_hash text NOT NULL,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  product_id uuid,
  response_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY (organization_id, idempotency_key)
);

-- Enable RLS on idempotency keys
ALTER TABLE public.ws_chatbot_product_idempotency_keys ENABLE ROW LEVEL SECURITY;

-- 3. Alias Normalization Function
CREATE OR REPLACE FUNCTION public.ws_chatbot_normalize_alias(p_alias text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_norm text;
BEGIN
  IF p_alias IS NULL THEN
    RETURN NULL;
  END IF;
  v_norm := pg_catalog.trim(p_alias);
  v_norm := pg_catalog.regexp_replace(v_norm, '\s+', ' ', 'g');
  v_norm := pg_catalog.lower(v_norm);
  IF v_norm = '' THEN
    RETURN NULL;
  END IF;
  RETURN v_norm;
END;
$$;

-- Backfill normalized_alias for existing aliases
UPDATE public.ws_chatbot_product_aliases
SET normalized_alias = public.ws_chatbot_normalize_alias(alias)
WHERE normalized_alias IS NULL AND alias IS NOT NULL;

-- 4. Partial Unique Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_chatbot_product_media_prod_option
  ON public.ws_chatbot_product_media (organization_id, product_id, option_number)
  WHERE (variant_id IS NULL AND option_number IS NOT NULL AND active = true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_chatbot_product_media_variant_option
  ON public.ws_chatbot_product_media (organization_id, product_id, variant_id, option_number)
  WHERE (variant_id IS NOT NULL AND option_number IS NOT NULL AND active = true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_chatbot_product_aliases_unique
  ON public.ws_chatbot_product_aliases (organization_id, language, normalized_alias)
  WHERE (normalized_alias IS NOT NULL);

-- 5. Storage Bucket setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('ws-chatbot-products', 'ws-chatbot-products', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Transactional Product Bundle RPC
CREATE OR REPLACE FUNCTION public.ws_chatbot_save_product_bundle(
  p_organization_id uuid,
  p_actor_user_id uuid,
  p_product_id uuid DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_authorized boolean;
  v_product_id uuid;
  v_hash text;
  v_existing_idempotency RECORD;
  v_product_rec RECORD;
  v_req_product jsonb;
  v_req_variants jsonb;
  v_req_media jsonb;
  v_req_aliases jsonb;
  v_deactivate_variant_ids jsonb;
  v_delete_media_ids jsonb;
  v_delete_alias_ids jsonb;
  v_ack_deactivations jsonb;
  
  v_sku text;
  v_name_ar text;
  v_name_he text;
  v_name_en text;
  v_desc_ar text;
  v_desc_he text;
  v_desc_en text;
  v_category text;
  v_material jsonb;
  v_metadata jsonb;
  v_source_system text;
  v_source_id text;
  v_active boolean;

  v_variant_item jsonb;
  v_var_id uuid;
  v_client_key text;
  v_var_sku text;
  v_size_code text;
  v_color_code text;
  v_color_ar text;
  v_color_he text;
  v_color_en text;
  v_price numeric(14,2);
  v_compare_at numeric(14,2);
  v_unit_cost numeric(14,2);
  v_stock int;
  v_avail text;
  v_var_active boolean;
  v_var_attrs jsonb;

  v_media_item jsonb;
  v_media_id uuid;
  v_media_var_id uuid;
  v_media_client_key text;
  v_media_url text;
  v_storage_path text;
  v_media_type text;
  v_opt_num int;
  v_sort_ord int;
  v_alt_ar text;
  v_alt_he text;
  v_alt_en text;

  v_alias_item jsonb;
  v_alias_id uuid;
  v_alias_str text;
  v_alias_lang text;
  v_alias_norm text;

  v_variant_map jsonb := '{}'::jsonb;
  v_active_orders_count int := 0;
  v_conflicting_order_ids text[] := ARRAY[]::text[];
  v_conflicting_variant_ids text[] := ARRAY[]::text[];
  v_active_sellable_count int := 0;
  v_warnings text[] := ARRAY[]::text[];
  v_temp_id uuid;
  v_dup_id uuid;
BEGIN
  -- A. Security: Verify actor membership & role
  SELECT (role IN ('owner'::public.member_role, 'admin'::public.member_role))
  INTO v_is_authorized
  FROM public.organization_members
  WHERE organization_id = p_organization_id AND user_id = p_actor_user_id;

  IF v_is_authorized IS NOT TRUE THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'UNAUTHORIZED',
      'message', 'المستخدم غير مصرح له بتنفيذ هذا الإجراء'
    );
  END IF;

  -- B. Idempotency concurrency handling
  IF p_idempotency_key IS NOT NULL AND pg_catalog.trim(p_idempotency_key) <> '' THEN
    v_hash := pg_catalog.encode(pg_catalog.digest(p_payload::text || coalesce(p_product_id::text, ''), 'sha256'), 'hex');
    
    BEGIN
      INSERT INTO public.ws_chatbot_product_idempotency_keys (
        organization_id, idempotency_key, payload_hash, status
      ) VALUES (
        p_organization_id, p_idempotency_key, v_hash, 'processing'
      );
    EXCEPTION WHEN unique_violation THEN
      -- On conflict, lock existing idempotency row
      SELECT * INTO v_existing_idempotency
      FROM public.ws_chatbot_product_idempotency_keys
      WHERE organization_id = p_organization_id AND idempotency_key = p_idempotency_key
      FOR UPDATE;

      IF v_existing_idempotency.payload_hash = v_hash THEN
        IF v_existing_idempotency.status = 'completed' THEN
          RETURN v_existing_idempotency.response_payload;
        ELSE
          RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'IDEMPOTENCY_IN_PROGRESS',
            'message', 'طلب ممثالي قيد المعالجة حالياً'
          );
        END IF;
      ELSE
        RETURN pg_catalog.jsonb_build_object(
          'success', false,
          'code', 'IDEMPOTENCY_CONFLICT',
          'message', 'تم استخدام مفتاح التكرار هذا ببيانات مختلفة'
        );
      END IF;
    END;
  END IF;

  -- C. Product locking & ID resolution
  v_req_product := coalesce(p_payload->'product', '{}'::jsonb);
  v_sku := pg_catalog.nullif(pg_catalog.trim(v_req_product->>'sku'), '');
  v_name_ar := pg_catalog.nullif(pg_catalog.trim(v_req_product->>'name_ar'), '');
  v_name_he := pg_catalog.nullif(pg_catalog.trim(v_req_product->>'name_he'), '');
  v_name_en := pg_catalog.nullif(pg_catalog.trim(v_req_product->>'name_en'), '');
  v_desc_ar := pg_catalog.nullif(pg_catalog.trim(v_req_product->>'description_ar'), '');
  v_desc_he := pg_catalog.nullif(pg_catalog.trim(v_req_product->>'description_he'), '');
  v_desc_en := pg_catalog.nullif(pg_catalog.trim(v_req_product->>'description_en'), '');
  v_category := pg_catalog.nullif(pg_catalog.trim(v_req_product->>'category'), '');
  v_source_system := coalesce(pg_catalog.nullif(pg_catalog.trim(v_req_product->>'source_system'), ''), 'dashboard');
  v_source_id := pg_catalog.nullif(pg_catalog.trim(v_req_product->>'source_id'), '');
  v_active := coalesce((v_req_product->>'active')::boolean, false);

  -- Material & Metadata must be objects, never null
  IF pg_catalog.jsonb_typeof(v_req_product->'material') = 'object' THEN
    v_material := v_req_product->'material';
  ELSE
    v_material := '{}'::jsonb;
  END IF;

  IF pg_catalog.jsonb_typeof(v_req_product->'metadata') = 'object' THEN
    v_metadata := v_req_product->'metadata';
  ELSE
    v_metadata := '{}'::jsonb;
  END IF;

  IF v_name_ar IS NULL THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'MISSING_REQUIRED_FIELD',
      'message', 'اسم المنتج بالعربية مطلوب'
    );
  END IF;

  IF p_product_id IS NOT NULL THEN
    SELECT * INTO v_product_rec
    FROM public.ws_chatbot_products
    WHERE organization_id = p_organization_id AND id = p_product_id
    FOR UPDATE;

    IF v_product_rec.id IS NULL THEN
      RETURN pg_catalog.jsonb_build_object(
        'success', false,
        'code', 'PRODUCT_NOT_FOUND',
        'message', 'المنتج غير موجود'
      );
    END IF;
    v_product_id := p_product_id;
  ELSE
    v_product_id := coalesce((v_req_product->>'id')::uuid, pg_catalog.gen_random_uuid());
  END IF;

  -- Check parent SKU uniqueness
  IF v_sku IS NOT NULL THEN
    SELECT id INTO v_dup_id
    FROM public.ws_chatbot_products
    WHERE organization_id = p_organization_id AND sku = v_sku AND id <> v_product_id;

    IF v_dup_id IS NOT NULL THEN
      RETURN pg_catalog.jsonb_build_object(
        'success', false,
        'code', 'DUPLICATE_PRODUCT_SKU',
        'message', 'رمز الـ SKU الرئيسي للمنتج مستخدم بالفعل في هذا الحساب'
      );
    END IF;
  END IF;

  -- Upsert Product row
  INSERT INTO public.ws_chatbot_products (
    id, organization_id, sku, name_ar, name_he, name_en,
    description_ar, description_he, description_en, category,
    material, metadata, source_system, source_id, active, updated_at
  ) VALUES (
    v_product_id, p_organization_id, v_sku, v_name_ar, v_name_he, v_name_en,
    v_desc_ar, v_desc_he, v_desc_en, v_category,
    v_material, v_metadata, v_source_system, v_source_id, v_active, pg_catalog.now()
  )
  ON CONFLICT (id) DO UPDATE SET
    sku = EXCLUDED.sku,
    name_ar = EXCLUDED.name_ar,
    name_he = EXCLUDED.name_he,
    name_en = EXCLUDED.name_en,
    description_ar = EXCLUDED.description_ar,
    description_he = EXCLUDED.description_he,
    description_en = EXCLUDED.description_en,
    category = EXCLUDED.category,
    material = EXCLUDED.material,
    metadata = EXCLUDED.metadata,
    source_system = EXCLUDED.source_system,
    source_id = EXCLUDED.source_id,
    active = EXCLUDED.active,
    updated_at = pg_catalog.now();

  -- D. Variants Processing
  v_req_variants := coalesce(p_payload->'variants', '[]'::jsonb);
  v_deactivate_variant_ids := coalesce(p_payload->'deactivate_variant_ids', '[]'::jsonb);
  v_ack_deactivations := coalesce(p_payload->'acknowledged_variant_deactivations', '[]'::jsonb);

  -- Check Active Order references before deactivating any variant
  FOR v_variant_item IN SELECT * FROM pg_catalog.jsonb_array_elements(v_deactivate_variant_ids) LOOP
    v_var_id := v_variant_item::text::uuid;
    
    -- Foreign child check
    SELECT id INTO v_temp_id FROM public.ws_chatbot_product_variants
    WHERE organization_id = p_organization_id AND product_id = v_product_id AND id = v_var_id;
    
    IF v_temp_id IS NULL THEN
      RETURN pg_catalog.jsonb_build_object(
        'success', false,
        'code', 'FOREIGN_CHILD_ID',
        'message', 'معرف النوع المطلوب تعطيله لا ينتمي إلى هذا المنتج'
      );
    END IF;

    -- Check if referenced in nonterminal orders
    SELECT count(DISTINCT o.id)::int, array_agg(DISTINCT o.id::text)
    INTO v_active_orders_count, v_conflicting_order_ids
    FROM public.ws_chatbot_order_items oi
    JOIN public.ws_chatbot_orders o ON o.id = oi.order_id
    WHERE oi.organization_id = p_organization_id
      AND oi.variant_id = v_var_id
      AND o.status IN ('draft', 'collecting', 'awaiting_confirmation', 'confirmed', 'shipped');

    IF v_active_orders_count > 0 THEN
      -- If not acknowledged by user
      IF NOT (v_ack_deactivations @> pg_catalog.to_jsonb(v_var_id::text)) THEN
        v_conflicting_variant_ids := pg_catalog.array_append(v_conflicting_variant_ids, v_var_id::text);
      END IF;
    END IF;
  END LOOP;

  -- Also check variants in payload being updated to active = false
  FOR v_variant_item IN SELECT * FROM pg_catalog.jsonb_array_elements(v_req_variants) LOOP
    IF (v_variant_item->>'id') IS NOT NULL AND (v_variant_item->>'active')::boolean IS FALSE THEN
      v_var_id := (v_variant_item->>'id')::uuid;
      
      -- Foreign child check
      SELECT id INTO v_temp_id FROM public.ws_chatbot_product_variants
      WHERE organization_id = p_organization_id AND product_id = v_product_id AND id = v_var_id;

      IF v_temp_id IS NULL THEN
        RETURN pg_catalog.jsonb_build_object(
          'success', false,
          'code', 'FOREIGN_CHILD_ID',
          'message', 'معرف النوع لا ينتمي إلى هذا المنتج'
        );
      END IF;

      SELECT count(DISTINCT o.id)::int, array_agg(DISTINCT o.id::text)
      INTO v_active_orders_count, v_conflicting_order_ids
      FROM public.ws_chatbot_order_items oi
      JOIN public.ws_chatbot_orders o ON o.id = oi.order_id
      WHERE oi.organization_id = p_organization_id
        AND oi.variant_id = v_var_id
        AND o.status IN ('draft', 'collecting', 'awaiting_confirmation', 'confirmed', 'shipped');

      IF v_active_orders_count > 0 THEN
        IF NOT (v_ack_deactivations @> pg_catalog.to_jsonb(v_var_id::text)) THEN
          v_conflicting_variant_ids := pg_catalog.array_append(v_conflicting_variant_ids, v_var_id::text);
        END IF;
      END IF;
    END IF;
  END LOOP;

  IF array_length(v_conflicting_variant_ids, 1) > 0 THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', false,
      'code', 'VARIANT_HAS_ACTIVE_ORDERS',
      'message', 'توجد أنواع مرتبطة بطلبات نشطة قيد المعالجة وتتطلب تأكيد التعطيل',
      'details', pg_catalog.jsonb_build_object(
        'variant_ids', v_conflicting_variant_ids,
        'order_ids', v_conflicting_order_ids
      )
    );
  END IF;

  -- Apply variant deactivations
  FOR v_variant_item IN SELECT * FROM pg_catalog.jsonb_array_elements(v_deactivate_variant_ids) LOOP
    v_var_id := v_variant_item::text::uuid;
    UPDATE public.ws_chatbot_product_variants
    SET active = false, updated_at = pg_catalog.now()
    WHERE organization_id = p_organization_id AND product_id = v_product_id AND id = v_var_id;
  END LOOP;

  -- Upsert variants from payload
  FOR v_variant_item IN SELECT * FROM pg_catalog.jsonb_array_elements(v_req_variants) LOOP
    v_var_id := (v_variant_item->>'id')::uuid;
    v_client_key := v_variant_item->>'client_key';
    v_var_sku := pg_catalog.nullif(pg_catalog.trim(v_variant_item->>'sku'), '');
    v_size_code := pg_catalog.nullif(pg_catalog.trim(v_variant_item->>'size_code'), '');
    v_color_code := pg_catalog.nullif(pg_catalog.trim(v_variant_item->>'color_code'), '');
    v_color_ar := pg_catalog.nullif(pg_catalog.trim(v_variant_item->>'color_ar'), '');
    v_color_he := pg_catalog.nullif(pg_catalog.trim(v_variant_item->>'color_he'), '');
    v_color_en := pg_catalog.nullif(pg_catalog.trim(v_variant_item->>'color_en'), '');
    v_price := coalesce((v_variant_item->>'price')::numeric, 0);
    v_compare_at := (v_variant_item->>'compare_at_price')::numeric;
    v_unit_cost := coalesce((v_variant_item->>'unit_cost')::numeric, 0);
    v_stock := (v_variant_item->>'stock_quantity')::int;
    v_avail := coalesce(pg_catalog.nullif(pg_catalog.trim(v_variant_item->>'availability'), ''), 'in_stock');
    v_var_active := coalesce((v_variant_item->>'active')::boolean, true);
    
    IF pg_catalog.jsonb_typeof(v_variant_item->'attributes') = 'object' THEN
      v_var_attrs := v_variant_item->'attributes';
    ELSE
      v_var_attrs := '{}'::jsonb;
    END IF;

    -- Validation
    IF v_price < 0 THEN
      RETURN pg_catalog.jsonb_build_object(
        'success', false,
        'code', 'INVALID_PRICE',
        'message', 'سعر النوع يجب أن يكون صفراً أو أكبر'
      );
    END IF;

    IF v_compare_at IS NOT NULL AND v_compare_at < v_price THEN
      RETURN pg_catalog.jsonb_build_object(
        'success', false,
        'code', 'INVALID_COMPARE_PRICE',
        'message', 'سعر المقارنة يجب أن يكون أكبر من أو يساوي السعر الأساسي'
      );
    END IF;

    IF v_var_sku IS NOT NULL THEN
      SELECT id INTO v_dup_id FROM public.ws_chatbot_product_variants
      WHERE organization_id = p_organization_id AND sku = v_var_sku AND (v_var_id IS NULL OR id <> v_var_id);
      IF v_dup_id IS NOT NULL THEN
        RETURN pg_catalog.jsonb_build_object(
          'success', false,
          'code', 'DUPLICATE_VARIANT_SKU',
          'message', 'رمز الـ SKU الخاص بالنوع مستخدم بالفعل في هذا الحساب'
        );
      END IF;
    END IF;

    IF v_var_id IS NULL THEN
      v_var_id := pg_catalog.gen_random_uuid();
      INSERT INTO public.ws_chatbot_product_variants (
        id, organization_id, product_id, sku, size_code, color_code,
        color_ar, color_he, color_en, price, compare_at_price, unit_cost,
        stock_quantity, availability, active, attributes, updated_at
      ) VALUES (
        v_var_id, p_organization_id, v_product_id, v_var_sku, v_size_code, v_color_code,
        v_color_ar, v_color_he, v_color_en, v_price, v_compare_at, v_unit_cost,
        v_stock, v_avail, v_var_active, v_var_attrs, pg_catalog.now()
      );
    ELSE
      -- Foreign check
      SELECT id INTO v_temp_id FROM public.ws_chatbot_product_variants
      WHERE organization_id = p_organization_id AND product_id = v_product_id AND id = v_var_id;
      
      IF v_temp_id IS NULL THEN
        RETURN pg_catalog.jsonb_build_object(
          'success', false,
          'code', 'FOREIGN_CHILD_ID',
          'message', 'نوع المنتج غير موجود أو لا ينتمي لهذا المنتج'
        );
      END IF;

      UPDATE public.ws_chatbot_product_variants SET
        sku = v_var_sku, size_code = v_size_code, color_code = v_color_code,
        color_ar = v_color_ar, color_he = v_color_he, color_en = v_color_en,
        price = v_price, compare_at_price = v_compare_at, unit_cost = v_unit_cost,
        stock_quantity = v_stock, availability = v_avail, active = v_var_active,
        attributes = v_var_attrs, updated_at = pg_catalog.now()
      WHERE organization_id = p_organization_id AND id = v_var_id;
    END IF;

    IF v_client_key IS NOT NULL THEN
      v_variant_map := pg_catalog.jsonb_set(v_variant_map, ARRAY[v_client_key], pg_catalog.to_jsonb(v_var_id::text));
    END IF;
  END LOOP;

  -- E. Media Processing
  v_req_media := coalesce(p_payload->'media', '[]'::jsonb);
  v_delete_media_ids := coalesce(p_payload->'delete_media_ids', '[]'::jsonb);

  -- Delete media explicitly requested
  FOR v_media_item IN SELECT * FROM pg_catalog.jsonb_array_elements(v_delete_media_ids) LOOP
    v_media_id := v_media_item::text::uuid;
    DELETE FROM public.ws_chatbot_product_media
    WHERE organization_id = p_organization_id AND product_id = v_product_id AND id = v_media_id;
  END LOOP;

  -- Upsert media items
  FOR v_media_item IN SELECT * FROM pg_catalog.jsonb_array_elements(v_req_media) LOOP
    v_media_id := (v_media_item->>'id')::uuid;
    v_media_url := pg_catalog.nullif(pg_catalog.trim(v_media_item->>'media_url'), '');
    v_storage_path := pg_catalog.nullif(pg_catalog.trim(v_media_item->>'storage_path'), '');
    v_media_type := coalesce(pg_catalog.nullif(pg_catalog.trim(v_media_item->>'media_type'), ''), 'image');
    v_opt_num := (v_media_item->>'option_number')::int;
    v_sort_ord := coalesce((v_media_item->>'sort_order')::int, 0);
    v_alt_ar := pg_catalog.nullif(pg_catalog.trim(v_media_item->>'alt_ar'), '');
    v_alt_he := pg_catalog.nullif(pg_catalog.trim(v_media_item->>'alt_he'), '');
    v_alt_en := pg_catalog.nullif(pg_catalog.trim(v_media_item->>'alt_en'), '');

    -- Resolve variant_id via database UUID or client_key mapping
    IF (v_media_item->>'variant_id') IS NOT NULL AND pg_catalog.trim(v_media_item->>'variant_id') <> '' THEN
      v_media_var_id := (v_media_item->>'variant_id')::uuid;
    ELSIF (v_media_item->>'variant_client_key') IS NOT NULL AND v_variant_map ? (v_media_item->>'variant_client_key') THEN
      v_media_var_id := (v_variant_map->>(v_media_item->>'variant_client_key'))::uuid;
    ELSE
      v_media_var_id := NULL;
    END IF;

    IF v_storage_path IS NULL AND v_media_url IS NULL THEN
      RETURN pg_catalog.jsonb_build_object(
        'success', false,
        'code', 'INVALID_MEDIA',
        'message', 'الوسيط يجب أن يتضمن مسار التخزين (storage_path) أو الرابط (media_url)'
      );
    END IF;

    BEGIN
      IF v_media_id IS NULL THEN
        INSERT INTO public.ws_chatbot_product_media (
          organization_id, product_id, variant_id, media_url, storage_path,
          media_type, option_number, sort_order, alt_ar, alt_he, alt_en, active
        ) VALUES (
          p_organization_id, v_product_id, v_media_var_id, v_media_url, v_storage_path,
          v_media_type, v_opt_num, v_sort_ord, v_alt_ar, v_alt_he, v_alt_en, true
        );
      ELSE
        -- Foreign check
        SELECT id INTO v_temp_id FROM public.ws_chatbot_product_media
        WHERE organization_id = p_organization_id AND product_id = v_product_id AND id = v_media_id;

        IF v_temp_id IS NULL THEN
          RETURN pg_catalog.jsonb_build_object(
            'success', false,
            'code', 'FOREIGN_CHILD_ID',
            'message', 'الوسيط لا ينتمي إلى هذا المنتج'
          );
        END IF;

        UPDATE public.ws_chatbot_product_media SET
          variant_id = v_media_var_id, media_url = v_media_url, storage_path = v_storage_path,
          media_type = v_media_type, option_number = v_opt_num, sort_order = v_sort_ord,
          alt_ar = v_alt_ar, alt_he = v_alt_he, alt_en = v_alt_en, active = true
        WHERE organization_id = p_organization_id AND id = v_media_id;
      END IF;
    EXCEPTION WHEN unique_violation THEN
      RETURN pg_catalog.jsonb_build_object(
        'success', false,
        'code', 'DUPLICATE_OPTION_NUMBER',
        'message', 'رقم الخيار (option_number) مكرر بالنسبة لهذه الفئة من الوسائط'
      );
    END;
  END LOOP;

  -- F. Aliases Processing
  v_req_aliases := coalesce(p_payload->'aliases', '[]'::jsonb);
  v_delete_alias_ids := coalesce(p_payload->'delete_alias_ids', '[]'::jsonb);

  -- Delete aliases requested
  FOR v_alias_item IN SELECT * FROM pg_catalog.jsonb_array_elements(v_delete_alias_ids) LOOP
    v_alias_id := v_alias_item::text::uuid;
    DELETE FROM public.ws_chatbot_product_aliases
    WHERE organization_id = p_organization_id AND product_id = v_product_id AND id = v_alias_id;
  END LOOP;

  -- Upsert aliases
  FOR v_alias_item IN SELECT * FROM pg_catalog.jsonb_array_elements(v_req_aliases) LOOP
    v_alias_id := (v_alias_item->>'id')::uuid;
    v_alias_str := pg_catalog.nullif(pg_catalog.trim(v_alias_item->>'alias'), '');
    v_alias_lang := pg_catalog.nullif(pg_catalog.trim(v_alias_item->>'language'), '');
    v_alias_norm := public.ws_chatbot_normalize_alias(v_alias_str);

    IF v_alias_str IS NOT NULL AND v_alias_norm IS NOT NULL THEN
      -- Uniqueness check across other products
      SELECT id INTO v_dup_id FROM public.ws_chatbot_product_aliases
      WHERE organization_id = p_organization_id
        AND normalized_alias = v_alias_norm
        AND (language IS NOT DISTINCT FROM v_alias_lang)
        AND product_id <> v_product_id;

      IF v_dup_id IS NOT NULL THEN
        RETURN pg_catalog.jsonb_build_object(
          'success', false,
          'code', 'DUPLICATE_ALIAS',
          'message', 'الاسم المستعار مستخدم بالفعل لمنتج آخر في هذا الحساب'
        );
      END IF;

      BEGIN
        IF v_alias_id IS NULL THEN
          INSERT INTO public.ws_chatbot_product_aliases (
            organization_id, product_id, alias, language, normalized_alias
          ) VALUES (
            p_organization_id, v_product_id, v_alias_str, v_alias_lang, v_alias_norm
          );
        ELSE
          -- Foreign check
          SELECT id INTO v_temp_id FROM public.ws_chatbot_product_aliases
          WHERE organization_id = p_organization_id AND product_id = v_product_id AND id = v_alias_id;

          IF v_temp_id IS NULL THEN
            RETURN pg_catalog.jsonb_build_object(
              'success', false,
              'code', 'FOREIGN_CHILD_ID',
              'message', 'الاسم المستعار لا ينتمي لهذا المنتج'
            );
          END IF;

          UPDATE public.ws_chatbot_product_aliases SET
            alias = v_alias_str, language = v_alias_lang, normalized_alias = v_alias_norm
          WHERE organization_id = p_organization_id AND id = v_alias_id;
        END IF;
      EXCEPTION WHEN unique_violation THEN
        RETURN pg_catalog.jsonb_build_object(
          'success', false,
          'code', 'DUPLICATE_ALIAS',
          'message', 'الاسم المستعار مكرر لهذا المنتج'
        );
      END;
    END IF;
  END LOOP;

  -- G. Product Activation Verification
  IF v_active IS TRUE THEN
    SELECT count(*)::int INTO v_active_sellable_count
    FROM public.ws_chatbot_product_variants
    WHERE organization_id = p_organization_id
      AND product_id = v_product_id
      AND active = true
      AND price >= 0
      AND availability IN ('in_stock', 'low_stock', 'preorder');

    IF v_active_sellable_count = 0 THEN
      RETURN pg_catalog.jsonb_build_object(
        'success', false,
        'code', 'PRODUCT_REQUIRES_VARIANT',
        'message', 'لا يمكن تفعيل المنتج بدون وجود نوع (Variant) نشط ومتاح على الأقل'
      );
    END IF;
  END IF;

  -- Build success response payload
  v_req_product := pg_catalog.jsonb_build_object(
    'success', true,
    'product_id', v_product_id,
    'variant_id_map', v_variant_map,
    'warnings', v_warnings
  );

  -- Complete Idempotency record
  IF p_idempotency_key IS NOT NULL AND pg_catalog.trim(p_idempotency_key) <> '' THEN
    UPDATE public.ws_chatbot_product_idempotency_keys
    SET status = 'completed', product_id = v_product_id, response_payload = v_req_product
    WHERE organization_id = p_organization_id AND idempotency_key = p_idempotency_key;
  END IF;

  RETURN v_req_product;
END;
$$;

-- 7. Security Privileges: Revoke PUBLIC/anon/authenticated; Grant service_role only
REVOKE EXECUTE ON FUNCTION public.ws_chatbot_save_product_bundle(uuid, uuid, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ws_chatbot_save_product_bundle(uuid, uuid, uuid, text, jsonb) TO service_role;

-- 8. PostgREST Single JSON Payload Overload
CREATE OR REPLACE FUNCTION public.ws_chatbot_save_product_bundle(
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN public.ws_chatbot_save_product_bundle(
    (p_payload->>'organization_id')::uuid,
    (p_payload->>'actor_user_id')::uuid,
    CASE WHEN (p_payload->>'product_id') IS NOT NULL AND (p_payload->>'product_id') <> '' THEN (p_payload->>'product_id')::uuid ELSE NULL END,
    p_payload->>'idempotency_key',
    p_payload
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ws_chatbot_save_product_bundle(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ws_chatbot_save_product_bundle(jsonb) TO service_role;

REVOKE EXECUTE ON FUNCTION public.ws_chatbot_normalize_alias(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ws_chatbot_normalize_alias(text) TO authenticated, service_role;
