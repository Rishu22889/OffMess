"use client";

import { useState, useEffect } from "react";
import { requestNotificationPermission } from "@/lib/notifications";

export default function NotificationButton() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleRequest = async () => {
    setRequesting(true);
    const granted = await requestNotificationPermission();
    setPermission(granted ? "granted" : "denied");
    setRequesting(false);
  };

  if (!("Notification" in window)) {
    return null;
  }

  if (permission === "granted") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/30">
        <span className="text-green-400 text-sm">🔔 Notifications enabled</span>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30">
        <span className="text-red-400 text-xs">
          Notifications blocked. Enable in browser settings.
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={handleRequest}
      disabled={requesting}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-400 hover:text-orange-300 font-medium transition-colors text-sm disabled:opacity-60"
    >
      <span>🔔</span>
      <span>{requesting ? "Requesting..." : "Enable Notifications"}</span>
    </button>
  );
}
