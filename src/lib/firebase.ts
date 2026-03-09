import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyAeILOwiaaaJD4joH_tZBEM_pXmuOF5phk",
  authDomain: "mitra-chat-3c231.firebaseapp.com",
  projectId: "mitra-chat-3c231",
  storageBucket: "mitra-chat-3c231.firebasestorage.app",
  messagingSenderId: "150009578040",
  appId: "1:150009578040:web:d2f50ade2db8202eef9ccd",
  measurementId: "G-260W43P319",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// VAPID public key — generate this from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export const getMessagingInstance = async () => {
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(app);
};

export const requestWebPushToken = async (): Promise<string | null> => {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;
    if (!VAPID_KEY) {
      console.warn('[WebPush] VITE_FIREBASE_VAPID_KEY not set');
      return null;
    }
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js'),
    });
    return token || null;
  } catch (err) {
    console.error('[WebPush] Failed to get token:', err);
    return null;
  }
};

export const onWebPushMessage = async (callback: (payload: any) => void) => {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
};
