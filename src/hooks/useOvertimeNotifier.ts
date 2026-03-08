import { supabase } from '../integrations/supabase/client';

/**
 * Call after checkout to check if user accumulated >2h overtime today,
 * and if so, notify the company admin.
 */
export const checkAndNotifyOvertime = async (
  employeeId: string,
  employeeName: string,
  companyName: string,
  checkIn: string,
  checkOut: string,
  orgEndTime: string // "HH:MM"
) => {
  try {
    const checkOutDate = new Date(checkOut);
    const endRef = new Date(checkOutDate);
    const [eh, em] = orgEndTime.split(':').map(Number);
    endRef.setHours(eh, em, 0, 0);

    if (checkOutDate <= endRef) return; // No overtime

    const overtimeHours = (checkOutDate.getTime() - endRef.getTime()) / 3600000;
    if (overtimeHours < 2) return; // Less than 2 hours, no notification

    // Find company admin(s)
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .eq('company_name', companyName);

    if (!admins || admins.length === 0) return;

    const message = `⚠️ ${employeeName} has accumulated ${overtimeHours.toFixed(1)} hours of overtime today. Please review.`;

    // Notify all admins
    const notifications = admins.map((admin: any) => ({
      user_id: admin.id,
      message,
      type: 'overtime',
    }));

    await supabase.from('notifications').insert(notifications);

    // Push notification to admins
    try {
      await supabase.functions.invoke('send-push', {
        body: {
          user_ids: admins.map((a: any) => a.id),
          title: '⏱️ Overtime Alert',
          body: message,
          data: { type: 'overtime', employee_id: employeeId },
        },
      });
    } catch (e) {
      console.warn('[Push] Could not send overtime push:', e);
    }
  } catch (err) {
    console.warn('[OvertimeNotifier] Error:', err);
  }
};
