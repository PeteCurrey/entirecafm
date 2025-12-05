// Push notification management for PWA
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
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
};

export const subscribeToPushNotifications = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return null;
  }
};

export const showLocalNotification = (title, options = {}) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      ...options
    });

    notification.onclick = () => {
      window.focus();
      if (options.onClick) options.onClick();
      notification.close();
    };

    return notification;
  }
  return null;
};

// Show notification for new job assignment
export const notifyNewJob = (job) => {
  return showLocalNotification('New Job Assigned', {
    body: `${job.title}\n${job.site_name || 'Location TBC'}`,
    tag: `job-${job.id}`,
    data: { jobId: job.id },
    actions: [
      { action: 'view', title: 'View Job' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  });
};

// Show notification for critical alert
export const notifyCriticalAlert = (alert) => {
  return showLocalNotification('⚠️ Critical Alert', {
    body: alert.message,
    tag: `alert-${alert.id}`,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300]
  });
};

// Show notification for SLA warning
export const notifySLAWarning = (job, minutesRemaining) => {
  return showLocalNotification('⏰ SLA Warning', {
    body: `${job.title} - ${minutesRemaining} minutes until SLA breach`,
    tag: `sla-${job.id}`,
    vibrate: [200, 100, 200]
  });
};

// Helper function
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Setup real-time notifications via WebSocket
export const setupRealtimeNotifications = (userId, orgId) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  let ws = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;

  const connect = () => {
    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        reconnectAttempts = 0;
        // Subscribe to engineer-specific and org-wide channels
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: `engineer.${userId}`
        }));
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: `org.${orgId}.alerts`
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'new_job_assignment':
              notifyNewJob(message.data);
              break;
            case 'critical_alert':
              notifyCriticalAlert(message.data);
              break;
            case 'sla_warning':
              notifySLAWarning(message.data.job, message.data.minutes_remaining);
              break;
            case 'job_update':
              showLocalNotification('Job Updated', {
                body: message.data.message,
                tag: `update-${message.data.job_id}`
              });
              break;
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          setTimeout(connect, 5000 * reconnectAttempts);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to setup WebSocket:', error);
    }
  };

  connect();

  return () => {
    if (ws) {
      ws.close();
    }
  };
};