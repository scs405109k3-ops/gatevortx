import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { toast } from './use-toast';

export const usePushNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Only runs on native iOS / Android
    if (!Capacitor.isNativePlatform() || !user) return;

    const register = async () => {
      // Request permission
      const permStatus = await PushNotifications.requestPermissions();
      if (permStatus.receive !== 'granted') {
        console.warn('[Push] Permission not granted');
        return;
      }

      // Register with APNs / FCM
      await PushNotifications.register();
    };

    // Save token to Supabase when received
    const registrationListener = PushNotifications.addListener(
      'registration',
      async (token) => {
        console.log('[Push] Token:', token.value);
        const platform = Capacitor.getPlatform(); // 'ios' | 'android'
        await supabase.from('device_tokens').upsert(
          { user_id: user.id, token: token.value, platform },
          { onConflict: 'user_id,token' }
        );
      }
    );

    const errorListener = PushNotifications.addListener(
      'registrationError',
      (err) => {
        console.error('[Push] Registration error:', err.error);
      }
    );

    // Show in-app toast when a push notification arrives while app is open
    const foregroundListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification) => {
        toast({
          title: notification.title || '🔔 Notification',
          description: notification.body,
        });
      }
    );

    // Handle tap on notification (app in background / killed)
    const actionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action) => {
        console.log('[Push] Action performed:', action.notification.data);
        // Future: navigate based on action.notification.data.route
      }
    );

    register();

    return () => {
      registrationListener.then(l => l.remove());
      errorListener.then(l => l.remove());
      foregroundListener.then(l => l.remove());
      actionListener.then(l => l.remove());
    };
  }, [user]);
};
