import { useState, useEffect, useCallback } from 'react';
import { supabase, AppNotification } from '../integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { toast } from '../hooks/use-toast';

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) {
      setNotifications(data as AppNotification[]);
      setUnreadCount(data.filter(n => !n.read).length);
    }
  }, [user]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as AppNotification;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
          toast({
            title: '🔔 New Notification',
            description: newNotif.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  return { notifications, unreadCount, markAllRead, fetchNotifications };
};
