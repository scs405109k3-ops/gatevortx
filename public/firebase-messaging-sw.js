// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAeILOwiaaaJD4joH_tZBEM_pXmuOF5phk",
  authDomain: "mitra-chat-3c231.firebaseapp.com",
  projectId: "mitra-chat-3c231",
  storageBucket: "mitra-chat-3c231.firebasestorage.app",
  messagingSenderId: "150009578040",
  appId: "1:150009578040:web:d2f50ade2db8202eef9ccd",
});

const messaging = firebase.messaging();

// Handle background push notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);
  const { title = '🔔 GateVortx', body = '' } = payload.notification || {};
  self.registration.showNotification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: payload.data,
  });
});
