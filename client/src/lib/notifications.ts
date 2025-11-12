// Notification utilities for FitFuel PWA

export interface NotificationOptions {
  title: string;
  body: string;
  tag?: string;
  timestamp?: number; // When to show the notification
  url?: string; // URL to open when clicked
}

/**
 * Request notification permission from the user
 * @returns Promise<boolean> - true if permission granted
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Check if notifications are enabled
 * @returns boolean
 */
export function areNotificationsEnabled(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Show a notification via service worker
 * Note: Scheduled notifications (with delays) are unreliable in service workers because
 * workers can be terminated when idle. This function shows notifications immediately.
 * For production reminder notifications, use Web Push API with backend or Chrome Alarms API.
 * @param options - Notification options
 */
export async function scheduleNotification(options: NotificationOptions): Promise<void> {
  if (!areNotificationsEnabled()) {
    console.warn('Notifications are not enabled');
    return;
  }

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      title: options.title,
      body: options.body,
      tag: options.tag || `fitfuel-${Date.now()}`
    });
  } else {
    // Fallback: show notification immediately if no service worker
    showNotification(options);
  }
}

/**
 * Show an immediate notification
 * @param options - Notification options
 */
export function showNotification(options: NotificationOptions): void {
  if (!areNotificationsEnabled()) {
    console.warn('Notifications are not enabled');
    return;
  }

  new Notification(options.title, {
    body: options.body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: options.tag || `fitfuel-${Date.now()}`,
    requireInteraction: true
  });
}

/**
 * Schedule notifications for today's reminders
 * 
 * LIMITATION: This function cannot reliably schedule notifications for future times
 * because service workers can be terminated when idle, making setTimeout unreliable.
 * Currently, this function does NOT send notifications automatically.
 * 
 * For production reminder notifications, implement one of:
 * - Web Push API with backend server to send push messages at scheduled times
 * - Chrome Alarms API (Chrome/Chromium only)
 * - Native mobile app with local notification scheduling
 * 
 * @param reminders - Array of reminder objects
 */
export async function scheduleReminderNotifications(reminders: Array<{
  id: string;
  type: string;
  scheduledTime: string;
  status: string;
}>): Promise<void> {
  // This function is currently a no-op due to the scheduling limitation
  // To enable notifications:
  // 1. Set up Web Push API with backend server
  // 2. Send scheduled push messages from server at reminder times
  // 3. Service worker 'push' event handler will show the notification
  
  console.log('[Notifications] Reminder scheduling not implemented - requires Web Push API');
  return;
}

/**
 * Get reminder title based on type
 */
function getReminderTitle(type: string): string {
  switch (type) {
    case 'breakfast':
      return '早餐提醒';
    case 'lunch':
      return '午餐提醒';
    case 'dinner':
      return '晚餐提醒';
    case 'snack':
      return '零食提醒';
    case 'water':
      return '喝水提醒';
    default:
      return 'FitFuel 提醒';
  }
}
