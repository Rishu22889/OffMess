// Browser notification utilities

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

// Play notification sound
function playNotificationSound() {
  try {
    // Create audio context for notification sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error("Failed to play notification sound:", error);
  }
}

export function showNotification(title: string, options?: NotificationOptions) {
  if (Notification.permission === "granted") {
    try {
      const notification = new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        ...options,
      });
      
      // Play sound when notification is shown
      playNotificationSound();
      
      // Auto-close after 10 seconds if not requireInteraction
      if (!options?.requireInteraction) {
        setTimeout(() => notification.close(), 10000);
      }
      
      return notification;
    } catch (error) {
      console.error("Failed to show notification:", error);
    }
  } else {
    // Fallback: show alert if notifications not permitted
    console.log("Notification:", title, options?.body);
  }
}

export function notifyNewOrder(orderId: number, studentName: string, amount: number) {
  showNotification("🔔 New Order Received!", {
    body: `Order #${orderId} from ${studentName}\nAmount: ₹${amount.toFixed(2)}`,
    tag: `order-${orderId}`,
    requireInteraction: true,
  });
}

export function notifyOrderReady(orderId: number, pickupCode: string) {
  // Vibrate device if supported
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
  
  showNotification("🔔 Your Order is Ready!", {
    body: `Order #${orderId} is ready for pickup\nPickup Code: ${pickupCode}`,
    tag: `order-${orderId}`,
    requireInteraction: true,
  });
}

export function notifyOrderAccepted(orderId: number) {
  showNotification("✅ Order Accepted!", {
    body: `Order #${orderId} has been accepted by the canteen`,
    tag: `order-${orderId}`,
  });
}

export function notifyOrderPreparing(orderId: number) {
  showNotification("👨‍🍳 Order Being Prepared", {
    body: `Order #${orderId} is now being prepared`,
    tag: `order-${orderId}`,
  });
}
