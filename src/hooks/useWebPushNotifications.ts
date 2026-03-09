import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../context/AuthContext';
import { toast } from './use-toast';
import { requestWebPushToken, onWebPushMessage } from '../lib/firebase';

/**
 * Registers the browser for Firebase web push notifications.
 * Only runs on web (not on native iOS/Android, which uses Capacitor push).
 */
export const useWebPushNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Skip on native — handled by usePushNotifications (Capacitor)
    if (Capacitor.isNativePlatform() || !user) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    let unsubscribe: (() => void) | undefined;

    const setup = async () => {
      try {
        // Register service worker
        await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn('[WebPush] Permission denied');
          return;
        }

        const token = await requestWebPushToken();
        if (!token) return;

        console.log('[WebPush] Token:', token);

        // Save web push token to device_tokens table
        await supabase.from('device_tokens').upsert(
          { user_id: user.id, token, platform: 'web' },
          { onConflict: 'user_id,token' }
        );

        // Listen for foreground messages
        unsubscribe = await onWebPushMessage((payload) => {
          toast({
            title: payload.notification?.title || '🔔 Notification',
            description: payload.notification?.body,
          });
        });
      } catch (err) {
        console.error('[WebPush] Setup error:', err);
      }
    };

    setup();

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user]);
};
