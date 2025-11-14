import { supabase } from './supabase';
import type { Database } from '@/types/database';

type NotificationTemplateRow = Database['public']['Tables']['notification_templates']['Row'];

export interface TemplateVariables {
  customer_name?: string;
  order_id?: string;
  order_number?: string;
  amount?: number;
  otp?: string;
  cashback?: number;
  message?: string;
  [key: string]: any;
}

export const notificationTemplateService = {
  /**
   * Get template for notification type and locale
   */
  async getTemplate(
    type: string,
    locale: 'en' | 'gu' = 'en'
  ): Promise<{ success: boolean; data?: NotificationTemplateRow; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('type', type)
        .eq('locale', locale)
        .single();

      if (error) {
        // Try fallback to English if template not found in requested locale
        if (locale !== 'en') {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('notification_templates')
            .select('*')
            .eq('type', type)
            .eq('locale', 'en')
            .single();

          if (fallbackError) {
            return { success: false, error: 'Template not found' };
          }

          return { success: true, data: fallbackData as NotificationTemplateRow };
        }

        return { success: false, error: 'Template not found' };
      }

      return { success: true, data: data as NotificationTemplateRow };
    } catch (error) {
      console.error('[TEMPLATE] Error fetching template:', error);
      return { success: false, error: 'Failed to fetch template' };
    }
  },

  /**
   * Render template with variables
   */
  renderTemplate(template: string, variables: TemplateVariables): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const replacement = value !== null && value !== undefined ? String(value) : '';
      result = result.replace(new RegExp(placeholder, 'g'), replacement);
    }
    return result;
  },

  /**
   * Get notification content (title and message) for type and locale
   */
  async getNotificationContent(
    type: string,
    locale: 'en' | 'gu' = 'en',
    variables: TemplateVariables
  ): Promise<{ success: boolean; title?: string; message?: string; priority?: string; channels?: string[]; error?: string }> {
    try {
      const templateResult = await this.getTemplate(type, locale);
      if (!templateResult.success || !templateResult.data) {
        return { success: false, error: templateResult.error };
      }

      const template = templateResult.data;
      const title = this.renderTemplate(template.title_template, variables);
      const message = this.renderTemplate(template.message_template, variables);
      const channels = Array.isArray(template.channels) ? template.channels : ['in_app'];

      return {
        success: true,
        title,
        message,
        priority: template.priority,
        channels: channels as string[],
      };
    } catch (error) {
      console.error('[TEMPLATE] Error getting notification content:', error);
      return { success: false, error: 'Failed to get notification content' };
    }
  },
};

