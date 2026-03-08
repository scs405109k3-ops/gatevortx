import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../context/AuthContext';

export const useMailStats = () => {
  const { user } = useAuth();
  const [unreadInbox, setUnreadInbox] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('emails')
        .select('id', { count: 'exact' })
        .eq('to_user_id', user.id)
        .eq('is_read', false)
        .eq('is_draft', false)
        .eq('deleted_by_recipient', false);
      setUnreadInbox(count || 0);
    };
    fetchUnread();

    const channel = supabase
      .channel('mail-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emails' }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { unreadInbox };
};
