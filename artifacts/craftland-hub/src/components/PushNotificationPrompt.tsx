import { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@clerk/react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "clh-push-prompt-dismissed";

export function PushNotificationPrompt() {
  const { isSignedIn } = useAuth();
  const { permission, subscribe } = usePushNotifications();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;
    if (permission !== "default") return;
    if (!("Notification" in window) || !("PushManager" in window)) return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, [isSignedIn, permission]);

  if (!visible) return null;

  const handleAllow = async () => {
    setLoading(true);
    await subscribe();
    setLoading(false);
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[200] w-[calc(100vw-2rem)] max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-[#1a1a1a] border border-primary/20 rounded-2xl shadow-2xl shadow-primary/10 p-4 flex items-start gap-3">
        <div className="shrink-0 bg-primary/15 rounded-xl p-2.5 mt-0.5">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">Stay in the loop</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Get notified when your maps are approved, comments arrive, and more — even when the app is closed.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-black flex-1"
              onClick={handleAllow}
              disabled={loading}
            >
              {loading ? "Enabling…" : "Allow Notifications"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleDismiss}
            >
              <BellOff className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
