import { supabase } from './supabase';

export interface TimeSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  label: string | null;
  max_deliveries: number;
  booked_deliveries: number;
  available_deliveries: number;
  status: 'available' | 'full' | 'disabled' | 'expired';
  is_selectable: boolean;
  display_label: string;
}

export interface DateSlots {
  date: string;
  displayDate: string;
  hasSlots: boolean;
  slots: TimeSlot[];
}

export const slotService = {
  /**
   * Fetch available delivery slots for a date range
   * Defaults to today and tomorrow
   */
  async getAvailableSlots(
    dateFrom?: string,
    dateTo?: string
  ): Promise<{
    success: boolean;
    data?: { dates: DateSlots[] };
    error?: string;
  }> {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const from = dateFrom || this.formatDate(today);
      const to = dateTo || this.formatDate(tomorrow);

      console.log('[SLOT] Fetching slots from:', from, 'to:', to);

      const { data, error } = await supabase.functions.invoke('get-delivery-slots', {
        body: { date_from: from, date_to: to }
      });

      console.log('[SLOT] Raw API response:', JSON.stringify(data, null, 2));
      console.log('[SLOT] API error:', error);

      if (error) {
        console.error('[SLOT] Error fetching slots:', error);
        return { success: false, error: 'Failed to load delivery slots' };
      }

      // Handle different response structures
      // Case 1: Direct response with success flag
      if (data?.success === false) {
        console.error('[SLOT] API returned error:', data?.error);
        return { success: false, error: data?.error || 'Failed to load delivery slots' };
      }

      // Case 2: Response has slots array (flat structure)
      let slotsArray: any[] = [];
      if (data?.slots && Array.isArray(data.slots)) {
        slotsArray = data.slots;
      } else if (data?.data?.slots && Array.isArray(data.data.slots)) {
        slotsArray = data.data.slots;
      } else if (Array.isArray(data)) {
        slotsArray = data;
      } else if (data?.data?.dates && Array.isArray(data.data.dates)) {
        // Already grouped by dates (expected format)
        const dates = data.data.dates.map((dateGroup: any) => {
          if (!dateGroup.date) {
            console.warn('[SLOT] Date group missing date field:', dateGroup);
            return null;
          }
          return {
            ...dateGroup,
            displayDate: this.formatDisplayDate(dateGroup.date),
            hasSlots: Array.isArray(dateGroup.slots) && dateGroup.slots.length > 0,
            slots: (dateGroup.slots || []).map((slot: any) => this.transformSlot(slot))
          };
        }).filter((d: any) => d !== null);

        console.log('[SLOT] Processed dates:', dates.length);
        return { success: true, data: { dates } };
      }

      // If we have a flat slots array, group by date
      if (slotsArray.length > 0) {
        console.log('[SLOT] Grouping', slotsArray.length, 'slots by date');
        
        // Group slots by date
        const dateMap = new Map<string, any[]>();
        slotsArray.forEach((slot: any) => {
          if (slot.date) {
            if (!dateMap.has(slot.date)) {
              dateMap.set(slot.date, []);
            }
            dateMap.get(slot.date)!.push(this.transformSlot(slot));
          }
        });
        
        // Convert to dates array format
        const dates = Array.from(dateMap.entries())
          .map(([date, slots]) => ({
            date,
            slots,
            displayDate: this.formatDisplayDate(date),
            hasSlots: slots.length > 0
          }))
          .sort((a, b) => a.date.localeCompare(b.date)); // Sort by date

        console.log('[SLOT] Processed dates:', dates.length);
        return { success: true, data: { dates } };
      }

      // No valid data found
      console.error('[SLOT] Invalid response structure. No slots found:', data);
      return { success: false, error: 'Invalid response format from server' };
    } catch (error) {
      console.error('[SLOT] Error fetching slots:', error);
      return { success: false, error: 'Failed to load delivery slots' };
    }
  },

  /**
   * Format date to YYYY-MM-DD
   */
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Format date for display (e.g., "Today", "Tomorrow", "Wed, Dec 11")
   */
  formatDisplayDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (targetDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  },

  /**
   * Get full formatted date with day of week
   */
  formatFullDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  },

  /**
   * Format time range for display
   */
  formatTimeRange(startTime: string, endTime: string): string {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const h = parseInt(hours);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  },

  /**
   * Transform API slot format to frontend format
   */
  transformSlot(slot: any): TimeSlot {
    // Handle different field names from API
    const availableDeliveries = slot.available !== undefined 
      ? slot.available 
      : (slot.available_deliveries !== undefined 
          ? slot.available_deliveries 
          : (slot.max_deliveries - slot.booked_deliveries));

    const isFull = slot.is_full !== undefined 
      ? slot.is_full 
      : (availableDeliveries <= 0);

    // Determine status
    let status: TimeSlot['status'] = 'available';
    if (slot.status === 'disabled' || slot.status === 'expired') {
      status = slot.status;
    } else if (isFull) {
      status = 'full';
    }

    // Check if slot is expired (past end time)
    const now = new Date();
    const slotEndDateTime = new Date(`${slot.date}T${slot.end_time}`);
    if (slotEndDateTime < now) {
      status = 'expired';
    }

    // Determine if selectable
    const isSelectable = status === 'available' && !isFull;

    // Create display label
    const displayLabel = this.formatTimeRange(slot.start_time, slot.end_time);

    return {
      id: slot.id,
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      label: slot.label || null,
      max_deliveries: slot.max_deliveries,
      booked_deliveries: slot.booked_deliveries || 0,
      available_deliveries: Math.max(0, availableDeliveries),
      status,
      is_selectable: isSelectable,
      display_label: displayLabel
    };
  }
};
