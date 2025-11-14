-- Migration: Create notification_templates table
-- Stores notification templates for different event types and locales

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR NOT NULL,
  locale VARCHAR NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'gu')),
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  priority VARCHAR NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  channels JSONB NOT NULL DEFAULT '["in_app"]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(type, locale)
);

COMMENT ON TABLE public.notification_templates IS 'Notification templates for different event types and locales';
COMMENT ON COLUMN public.notification_templates.type IS 'Event type: order_confirmed, order_out_for_delivery, etc.';
COMMENT ON COLUMN public.notification_templates.locale IS 'Locale: en (English) or gu (Gujarati)';
COMMENT ON COLUMN public.notification_templates.title_template IS 'Title template with placeholders: {{customer_name}}, {{order_id}}, {{order_number}}, {{amount}}, {{otp}}';
COMMENT ON COLUMN public.notification_templates.message_template IS 'Message template with placeholders';
COMMENT ON COLUMN public.notification_templates.priority IS 'Default priority for this notification type';
COMMENT ON COLUMN public.notification_templates.channels IS 'JSONB array of channels: ["push", "sms", "in_app"]';

-- Create index on type and locale for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_templates_type_locale ON public.notification_templates(type, locale);

-- Insert default templates for English
INSERT INTO public.notification_templates (type, locale, title_template, message_template, priority, channels) VALUES
  -- Order Lifecycle
  ('order_confirmed', 'en', 'Order Confirmed!', 'Your order #{{order_number}} has been placed successfully', 'medium', '["push", "in_app"]'::jsonb),
  ('order_accepted', 'en', 'Order Accepted', 'Vendor has accepted your order #{{order_number}}', 'medium', '["push", "in_app"]'::jsonb),
  ('order_preparing', 'en', 'Order Preparing', 'Your order #{{order_number}} is being prepared', 'medium', '["push", "in_app"]'::jsonb),
  ('order_out_for_delivery', 'en', 'On the Way!', 'Your order #{{order_number}} is out for delivery. OTP: {{otp}}', 'high', '["push", "sms", "in_app"]'::jsonb),
  ('order_delivered', 'en', 'Delivered Successfully', 'Order #{{order_number}} delivered! ₹{{cashback}} added to virtual wallet', 'high', '["push", "in_app"]'::jsonb),
  ('order_partially_delivered', 'en', 'Partially Delivered', 'Some items in order #{{order_number}} couldn''t be fulfilled', 'medium', '["push", "in_app"]'::jsonb),
  ('order_cancelled', 'en', 'Order Cancelled', 'Your order #{{order_number}} has been cancelled', 'medium', '["push", "in_app"]'::jsonb),
  
  -- Wallet & Cashback
  ('cashback_credited', 'en', 'Cashback Received!', '₹{{amount}} added to your virtual wallet', 'medium', '["push", "in_app"]'::jsonb),
  ('referral_reward', 'en', 'Referral Reward!', '₹{{amount}} earned! Your friend used your referral code', 'medium', '["push", "in_app"]'::jsonb),
  ('wallet_conversion', 'en', 'Wallet Conversion', '₹{{amount}} moved from virtual to actual wallet', 'medium', '["push", "in_app"]'::jsonb),
  
  -- Returns
  ('return_approved', 'en', 'Return Approved', 'Your return request for order #{{order_number}} has been approved', 'medium', '["push", "in_app"]'::jsonb),
  ('return_pickup_scheduled', 'en', 'Pickup Scheduled', 'Pickup partner will arrive soon. OTP: {{otp}}', 'high', '["push", "sms", "in_app"]'::jsonb),
  ('refund_processed', 'en', 'Refund Processed', '₹{{amount}} refunded to your actual wallet', 'medium', '["push", "in_app"]'::jsonb),
  
  -- Promotional
  ('promotional_offer', 'en', 'New Offer!', '{{message}}', 'low', '["push", "in_app"]'::jsonb),
  ('order_reminder', 'en', 'Complete Your Order', 'Complete your pending order #{{order_number}}', 'low', '["push", "in_app"]'::jsonb)
ON CONFLICT (type, locale) DO NOTHING;

-- Insert default templates for Gujarati
INSERT INTO public.notification_templates (type, locale, title_template, message_template, priority, channels) VALUES
  -- Order Lifecycle
  ('order_confirmed', 'gu', 'ઓર્ડર પુષ્ટિ!', 'તમારો ઓર્ડર #{{order_number}} સફળતાપૂર્વક મૂકવામાં આવ્યો છે', 'medium', '["push", "in_app"]'::jsonb),
  ('order_accepted', 'gu', 'ઓર્ડર સ્વીકૃત', 'વેન્ડરે તમારો ઓર્ડર #{{order_number}} સ્વીકાર્યો છે', 'medium', '["push", "in_app"]'::jsonb),
  ('order_preparing', 'gu', 'ઓર્ડર તૈયાર થઈ રહ્યું છે', 'તમારો ઓર્ડર #{{order_number}} તૈયાર થઈ રહ્યો છે', 'medium', '["push", "in_app"]'::jsonb),
  ('order_out_for_delivery', 'gu', 'રસ્તામાં!', 'તમારો ઓર્ડર #{{order_number}} ડિલિવરી માટે બહાર છે. OTP: {{otp}}', 'high', '["push", "sms", "in_app"]'::jsonb),
  ('order_delivered', 'gu', 'સફળતાપૂર્વક ડિલિવર કર્યું', 'ઓર્ડર #{{order_number}} ડિલિવર કર્યું! ₹{{cashback}} વર્ચ્યુઅલ વૉલેટમાં ઉમેર્યું', 'high', '["push", "in_app"]'::jsonb),
  ('order_partially_delivered', 'gu', 'આંશિક ડિલિવર', 'ઓર્ડર #{{order_number}} માં કેટલાક વસ્તુઓ પૂરી કરી શકાઈ નથી', 'medium', '["push", "in_app"]'::jsonb),
  ('order_cancelled', 'gu', 'ઓર્ડર રદ કર્યું', 'તમારો ઓર્ડર #{{order_number}} રદ કરવામાં આવ્યો છે', 'medium', '["push", "in_app"]'::jsonb),
  
  -- Wallet & Cashback
  ('cashback_credited', 'gu', 'કેશબેક પ્રાપ્ત!', '₹{{amount}} તમારા વર્ચ્યુઅલ વૉલેટમાં ઉમેર્યું', 'medium', '["push", "in_app"]'::jsonb),
  ('referral_reward', 'gu', 'રેફરલ રિવોર્ડ!', '₹{{amount}} કમાયું! તમારા મિત્રે તમારો રેફરલ કોડ વાપર્યો', 'medium', '["push", "in_app"]'::jsonb),
  ('wallet_conversion', 'gu', 'વૉલેટ કન્વર્ઝન', '₹{{amount}} વર્ચ્યુઅલથી વાસ્તવિક વૉલેટમાં ખસેડ્યું', 'medium', '["push", "in_app"]'::jsonb),
  
  -- Returns
  ('return_approved', 'gu', 'રિટર્ન મંજૂર', 'ઓર્ડર #{{order_number}} માટે તમારી રિટર્ન વિનંતી મંજૂર કરવામાં આવી છે', 'medium', '["push", "in_app"]'::jsonb),
  ('return_pickup_scheduled', 'gu', 'પિકઅપ શેડ્યૂલ', 'પિકઅપ પાર્ટનર ટૂંક સમયમાં આવશે. OTP: {{otp}}', 'high', '["push", "sms", "in_app"]'::jsonb),
  ('refund_processed', 'gu', 'રિફંડ પ્રક્રિયા', '₹{{amount}} તમારા વાસ્તવિક વૉલેટમાં રિફંડ કર્યું', 'medium', '["push", "in_app"]'::jsonb),
  
  -- Promotional
  ('promotional_offer', 'gu', 'નવી ઓફર!', '{{message}}', 'low', '["push", "in_app"]'::jsonb),
  ('order_reminder', 'gu', 'તમારો ઓર્ડર પૂર્ણ કરો', 'તમારો બાકી ઓર્ડર #{{order_number}} પૂર્ણ કરો', 'low', '["push", "in_app"]'::jsonb)
ON CONFLICT (type, locale) DO NOTHING;

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read templates (they're public)
CREATE POLICY "Anyone can read notification templates"
ON public.notification_templates FOR SELECT
USING (true);

-- RLS Policy: Only service role can insert/update/delete templates
CREATE POLICY "Service role can manage notification templates"
ON public.notification_templates FOR ALL
USING (auth.role() = 'service_role');

